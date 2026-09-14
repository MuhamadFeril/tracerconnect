<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
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

    public function test_login_records_audit_log(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@smkn1tracer.sch.id',
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'login',
            'entity_type' => 'user',
        ]);
    }

    public function test_logout_records_audit_log(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'logout',
            'entity_type' => 'user',
        ]);
    }

    public function test_creating_user_records_audit_log(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();

        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Staf Baru',
            'email' => 'staf.baru@smkn1tracer.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'company_name' => 'PT Staf Baru',
            'institution_id' => $institution->id,
        ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'entity_type' => 'user',
        ]);
    }

}
