<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
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
            'slug' => 'institusi-lain-announcement',
            'code' => 'IL05',
            'status' => 'active',
        ]);
    }

    public function test_admin_can_create_announcement_in_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/announcements', [
            'title' => 'Libur Hari Raya',
            'body' => 'Kantor ditutup selama libur hari raya.',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Libur Hari Raya')
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);

        $this->assertDatabaseHas('announcements', ['title' => 'Libur Hari Raya']);
    }

    public function test_admin_institusi_can_create_announcement_for_any_institution(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $other = $this->otherInstitution();

        $this->withToken($token)->postJson('/api/v1/announcements', [
            'institution_id' => $other->id,
            'title' => 'Pengumuman Platform',
            'body' => 'Konten pengumuman.',
            'status' => 'draft',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', $other->id);
    }

    public function test_admin_cannot_create_announcement_for_other_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $other = $this->otherInstitution();

        $this->withToken($token)->postJson('/api/v1/announcements', [
            'institution_id' => $other->id,
            'title' => 'Curang',
            'body' => 'Tidak boleh.',
            'status' => 'draft',
        ])->assertStatus(422);
    }

    public function test_announcements_are_tenant_scoped(): void
    {
        $foreign = Announcement::create([
            'institution_id' => $this->otherInstitution()->id,
            'title' => 'Rahasia Institusi Lain',
            'body' => 'Isi rahasia.',
            'status' => 'published',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/announcements/{$foreign->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/announcements/{$foreign->id}", ['title' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/announcements/{$foreign->id}")->assertStatus(403);
    }

    public function test_admin_institusi_can_update_and_delete_across_institutions(): void
    {
        $other = $this->otherInstitution();
        $announcement = Announcement::create([
            'institution_id' => $other->id,
            'title' => 'Untuk Institusi Lain',
            'body' => 'Konten.',
            'status' => 'draft',
        ]);

        $token = $this->loginAs('superadmin@tracerconnect.test');

        $this->withToken($token)->putJson("/api/v1/announcements/{$announcement->id}", [
            'title' => 'Judul Baru',
            'status' => 'published',
        ])->assertOk()->assertJsonPath('data.title', 'Judul Baru');

        $this->withToken($token)->deleteJson("/api/v1/announcements/{$announcement->id}")->assertOk();
    }

    public function test_hrd_without_announcement_permissions_is_rejected(): void
    {
        $hrd = User::create([
            'name' => 'HRD',
            'email' => 'hrd-ann@test.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $hrd->assignRole('hrd');

        $token = $hrd->createToken('test-token')->plainTextToken;

        // The hrd role has no announcement.* permissions by design.
        $this->withToken($token)->getJson('/api/v1/announcements')->assertStatus(403);
        $this->withToken($token)->postJson('/api/v1/announcements', [
            'title' => 'Tidak Boleh',
            'body' => 'HRD tidak punya permission announcement.',
            'status' => 'draft',
        ])->assertStatus(403);
    }

    public function test_alumni_role_can_view_announcements(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/announcements')->assertOk();
    }

    public function test_search_and_status_filter(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson('/api/v1/announcements?search=Reuni')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->withToken($token)->getJson('/api/v1/announcements?status=published')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->withToken($token)->getJson('/api/v1/announcements?status=draft')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }
}
