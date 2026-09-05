<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rename the `employer` role to `hrd` (product wording change).
     *
     * Safe for databases seeded before the rename: Spatie stores role
     * assignments by role id (model_has_roles / role_has_permissions),
     * so only the roles.name value needs updating.
     */
    public function up(): void
    {
        $employer = DB::table('roles')
            ->where('name', 'employer')
            ->where('guard_name', 'web')
            ->first();

        if (! $employer) {
            return;
        }

        $existing = DB::table('roles')
            ->where('name', 'hrd')
            ->where('guard_name', 'web')
            ->first();

        if ($existing) {
            // Both roles already exist (seeder ran after the rename): merge
            // the legacy employer role into hrd, then drop the legacy row.
            DB::table('model_has_roles')->where('role_id', $employer->id)->update(['role_id' => $existing->id]);
            DB::table('role_has_permissions')->where('role_id', $employer->id)->update(['role_id' => $existing->id]);
            DB::table('roles')->where('id', $employer->id)->delete();
        } else {
            DB::table('roles')->where('id', $employer->id)->update(['name' => 'hrd']);
        }
    }

    public function down(): void
    {
        $hrd = DB::table('roles')
            ->where('name', 'hrd')
            ->where('guard_name', 'web')
            ->first();

        if (! $hrd) {
            return;
        }

        DB::table('roles')->where('id', $hrd->id)->update(['name' => 'employer']);
    }
};
