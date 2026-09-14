<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure the target role exists.
        DB::table('roles')->updateOrInsert(
            ['name' => 'admin_institusi', 'guard_name' => 'web'],
            ['created_at' => now(), 'updated_at' => now()]
        );

        $adminRoleId = DB::table('roles')->where('name', 'admin_institusi')->where('guard_name', 'web')->value('id');

        // Migrate super_admin users → admin_institusi.
        $superAdminRoleId = DB::table('roles')->where('name', 'super_admin')->where('guard_name', 'web')->value('id');
        if ($superAdminRoleId) {
            DB::table('model_has_roles')
                ->where('role_id', $superAdminRoleId)
                ->update(['role_id' => $adminRoleId]);
        }

        // Migrate institution_admin users → admin_institusi.
        $instAdminRoleId = DB::table('roles')->where('name', 'institution_admin')->where('guard_name', 'web')->value('id');
        if ($instAdminRoleId) {
            DB::table('model_has_roles')
                ->where('role_id', $instAdminRoleId)
                ->update(['role_id' => $adminRoleId]);
        }

        // Remove the old roles.
        DB::table('roles')->whereIn('name', ['super_admin', 'institution_admin'])->delete();
    }

    public function down(): void
    {
        // Recreate super_admin role.
        DB::table('roles')->updateOrInsert(
            ['name' => 'super_admin', 'guard_name' => 'web'],
            ['created_at' => now(), 'updated_at' => now()]
        );

        // Recreate institution_admin role.
        DB::table('roles')->updateOrInsert(
            ['name' => 'institution_admin', 'guard_name' => 'web'],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }
};
