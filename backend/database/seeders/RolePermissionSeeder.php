<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Permission catalogue covering the concept modules (phases 2+).
     */
    public const PERMISSIONS = [
        'institution.view', 'institution.create', 'institution.update', 'institution.delete',
        'user.view', 'user.create', 'user.update', 'user.delete',
        'role.view', 'role.assign',
        'alumni.view', 'alumni.create', 'alumni.update', 'alumni.delete', 'alumni.import', 'alumni.export',
        'department.view', 'department.create', 'department.update', 'department.delete',
        'graduation-year.view', 'graduation-year.create', 'graduation-year.update', 'graduation-year.delete',
        'survey.view', 'survey.create', 'survey.update', 'survey.delete', 'survey.publish',
        'response.view', 'response.create', 'response.export',
        'analytics.view',
        'report.view', 'report.generate',
        'company.view', 'company.create', 'company.update', 'company.delete',
        'job.view', 'job.create', 'job.update', 'job.delete', 'job.apply',
        'announcement.view', 'announcement.create', 'announcement.update', 'announcement.delete',
        'story.view', 'story.create', 'story.update', 'story.delete',
        'event.view', 'event.create', 'event.update', 'event.delete',
        'notification.view', 'notification.send',
        'settings.view', 'settings.update',
        'audit.view',
        'networking.view', 'networking.connect', 'networking.report',
        'chat.view', 'chat.send', 'chat.report',
    ];

    /**
     * Role -> permission assignments.
     */
    public const ROLE_PERMISSIONS = [
        'super_admin' => self::PERMISSIONS,
        'institution_admin' => [
            'institution.view',
            'user.view', 'user.create', 'user.update', 'user.delete',
            'role.view', 'role.assign',
            'alumni.view', 'alumni.create', 'alumni.update', 'alumni.delete', 'alumni.import', 'alumni.export',
            'department.view', 'department.create', 'department.update', 'department.delete',
            'graduation-year.view', 'graduation-year.create', 'graduation-year.update', 'graduation-year.delete',
            'survey.view', 'survey.create', 'survey.update', 'survey.delete', 'survey.publish',
            'response.view', 'response.create', 'response.export',
            'analytics.view',
            'report.view', 'report.generate',
            'company.view', 'company.create', 'company.update', 'company.delete',
            'job.view', 'job.create', 'job.update', 'job.delete', 'job.apply',
            'announcement.view', 'announcement.create', 'announcement.update', 'announcement.delete',
            'story.view', 'story.create', 'story.update', 'story.delete',
            'event.view', 'event.create', 'event.update', 'event.delete',
            'notification.view', 'notification.send',
            'settings.view', 'settings.update',
            'audit.view',
            'chat.view', 'chat.send', 'chat.report',
        ],
        'employer' => [
            'job.view', 'job.create', 'job.update',
            'chat.view', 'chat.send',
        ],
        'alumni' => [
            'announcement.view',
            'story.view',
            'event.view',
            'job.view', 'job.apply',
            'notification.view',
            'networking.view',
            'networking.connect',
            'networking.report',
            'chat.view', 'chat.send', 'chat.report',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (array_keys(self::ROLE_PERMISSIONS) as $role) {
            Role::findOrCreate($role, 'web');
        }

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissions) {
            Role::findByName($roleName, 'web')->syncPermissions($permissions);
        }
    }
}
