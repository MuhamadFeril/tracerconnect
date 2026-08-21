<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\SuccessStory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SuccessStoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function loginAs(string $email): string
    {
        return User::where('email', $email)->firstOrFail()->createToken('test-token')->plainTextToken;
    }

    private function demoInstitution(): Institution
    {
        return Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
    }

    private function otherInstitution(): Institution
    {
        return Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-story',
            'code' => 'IL09',
            'status' => 'active',
        ]);
    }

    private function coverFile(): UploadedFile
    {
        return UploadedFile::fake()->image('cover.jpg', 800, 500);
    }

    public function test_admin_can_create_story_with_cover_in_own_institution(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->post('/api/v1/success-stories', [
            'title' => 'Alumni Diterima Kerja di PT Maju',
            'category' => 'career',
            'content' => 'Setelah menyelesaikan PKL, alumni kami langsung direkrut sebagai staf IT.',
            'cover_image' => $this->coverFile(),
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Alumni Diterima Kerja di PT Maju')
            ->assertJsonPath('data.category', 'career')
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id)
            ->assertJsonPath('data.cover_image_url', fn ($url) => is_string($url) && $url !== '');

        $story = SuccessStory::firstOrFail();
        Storage::disk('public')->assertExists($story->cover_image_path);
    }

    public function test_story_requires_cover_image(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/success-stories', [
            'title' => 'Tanpa Cover',
            'category' => 'other',
            'content' => 'Konten tanpa foto.',
            'status' => 'draft',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('cover_image');

        $this->assertSame(0, SuccessStory::count());
    }

    public function test_cover_image_rejects_non_image_file(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->post('/api/v1/success-stories', [
            'title' => 'Cover Salah',
            'category' => 'other',
            'content' => 'Konten.',
            'cover_image' => UploadedFile::fake()->create('script.php', 100),
            'status' => 'draft',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('cover_image');
    }

    public function test_super_admin_can_create_story_for_any_institution(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $other = $this->otherInstitution();

        $this->withToken($token)->post('/api/v1/success-stories', [
            'institution_id' => $other->id,
            'title' => 'Kisah Platform',
            'category' => 'achievement',
            'content' => 'Konten.',
            'cover_image' => $this->coverFile(),
            'status' => 'draft',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', $other->id);
    }

    public function test_admin_cannot_create_story_for_other_institution(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $other = $this->otherInstitution();

        $this->withToken($token)->post('/api/v1/success-stories', [
            'institution_id' => $other->id,
            'title' => 'Curang',
            'category' => 'other',
            'content' => 'Tidak boleh.',
            'cover_image' => $this->coverFile(),
            'status' => 'draft',
        ])->assertStatus(422);
    }

    public function test_institution_admin_can_create_story(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)
            ->post('/api/v1/success-stories', [
                'title' => 'Kisah dari Admin',
                'category' => 'study',
                'content' => 'Konten.',
                'cover_image' => $this->coverFile(),
                'status' => 'draft',
            ])->assertCreated();
    }

    public function test_alumni_cannot_create_story(): void
    {
        // The alumni role has story.view but not story.create.
        $institution = $this->demoInstitution();
        $alumniUser = User::factory()->create(['institution_id' => $institution->id]);
        $alumniUser->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniUser->id, 'institution_id' => $institution->id]);

        $this->withToken($alumniUser->createToken('test-token')->plainTextToken)
            ->post('/api/v1/success-stories', [
                'title' => 'Tidak Boleh',
                'category' => 'other',
                'content' => 'Konten.',
                'cover_image' => $this->coverFile(),
                'status' => 'draft',
            ])->assertStatus(403);
    }

    public function test_admin_can_update_story_and_replace_cover(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $story = SuccessStory::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'cover_image_path' => 'stories/lama.jpg',
        ]);
        Storage::disk('public')->put('stories/lama.jpg', 'lama');

        $this->withToken($token)->post("/api/v1/success-stories/{$story->id}", [
            '_method' => 'PUT',
            'title' => 'Judul Baru',
            'category' => 'achievement',
            'content' => 'Konten baru.',
            'cover_image' => $this->coverFile(),
            'status' => 'published',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Judul Baru')
            ->assertJsonPath('data.category', 'achievement');

        $story->refresh();
        Storage::disk('public')->assertExists($story->cover_image_path);
        Storage::disk('public')->assertMissing('stories/lama.jpg');
    }

    public function test_admin_cannot_update_story_of_other_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $story = SuccessStory::factory()->create([
            'institution_id' => $this->otherInstitution()->id,
        ]);

        $this->withToken($token)->putJson("/api/v1/success-stories/{$story->id}", [
            'title' => 'Hack',
        ])->assertStatus(403);
    }

    public function test_alumni_only_sees_published_stories_of_own_institution(): void
    {
        $institution = $this->demoInstitution();
        $other = $this->otherInstitution();

        SuccessStory::factory()->create(['institution_id' => $institution->id, 'status' => 'published']);
        SuccessStory::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);
        SuccessStory::factory()->create(['institution_id' => $other->id, 'status' => 'published']);

        $alumniUser = User::factory()->create(['institution_id' => $institution->id]);
        $alumniUser->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniUser->id, 'institution_id' => $institution->id]);

        $response = $this->withToken($alumniUser->createToken('test-token')->plainTextToken)
            ->getJson('/api/v1/success-stories')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('published', $response->json('data.0.status'));
    }

    public function test_admin_sees_all_stories_including_drafts(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $institution = $this->demoInstitution();

        SuccessStory::factory()->create(['institution_id' => $institution->id, 'status' => 'published']);
        SuccessStory::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);

        $response = $this->withToken($token)->getJson('/api/v1/success-stories')->assertOk();

        $this->assertCount(2, $response->json('data'));
    }

    public function test_publishing_story_notifies_alumni(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $institution = $this->demoInstitution();

        $alumniUser = User::factory()->create(['institution_id' => $institution->id]);
        $alumniUser->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniUser->id, 'institution_id' => $institution->id]);

        $this->withToken($token)->post('/api/v1/success-stories', [
            'title' => 'Kisah Inspiratif',
            'category' => 'career',
            'content' => 'Konten.',
            'cover_image' => $this->coverFile(),
            'status' => 'published',
        ])->assertCreated();

        $notification = $alumniUser->unreadNotifications()->latest()->first();
        $this->assertNotNull($notification);
        $data = $notification->data;
        $this->assertSame('story', $data['kind']);
        $this->assertSame('Kisah sukses baru', $data['title']);
        $this->assertSame('/kisah-sukses', $data['url']);
    }

    public function test_draft_story_does_not_notify_alumni(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $institution = $this->demoInstitution();

        $alumniUser = User::factory()->create(['institution_id' => $institution->id]);
        $alumniUser->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniUser->id, 'institution_id' => $institution->id]);

        $this->withToken($token)->post('/api/v1/success-stories', [
            'title' => 'Draft Saja',
            'category' => 'other',
            'content' => 'Konten.',
            'cover_image' => $this->coverFile(),
            'status' => 'draft',
        ])->assertCreated();

        $this->assertSame(0, $alumniUser->unreadNotifications()->count());
    }

    public function test_admin_can_delete_story(): void
    {
        Storage::fake('public');
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $story = SuccessStory::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'cover_image_path' => 'stories/hapus.jpg',
        ]);
        Storage::disk('public')->put('stories/hapus.jpg', 'x');

        $this->withToken($token)->deleteJson("/api/v1/success-stories/{$story->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('success_stories', ['id' => $story->id]);
        Storage::disk('public')->assertMissing('stories/hapus.jpg');
    }

    public function test_guest_cannot_access_stories(): void
    {
        $this->getJson('/api/v1/success-stories')->assertStatus(401);
    }
}
