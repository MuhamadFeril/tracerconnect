<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;

class JobApplicationPolicy
{
    /**
     * Alumni can list their own applications; staff can list applications
     * for vacancies in their institution.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['job.view', 'job.apply']);
    }

    /**
     * An application can be viewed by its owner (alumni), by the creator of
     * the vacancy (hrd), or by staff of the vacancy's institution.
     */
    public function view(User $user, JobApplication $application): bool
    {
        if ($user->id === $application->user_id) {
            return $user->hasPermissionTo('job.apply');
        }

        if (! $user->hasPermissionTo('job.update')) {
            return false;
        }

        if ($user->hasRole('super_admin') || $application->vacancy?->created_by === $user->id) {
            return true;
        }

        return $application->vacancy?->institution_id !== null
            && $user->institution_id === $application->vacancy->institution_id;
    }

    /**
     * Applying to a vacancy requires the job.apply permission.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('job.apply');
    }

    /**
     * The applicant may withdraw; the job creator (hrd) or institution
     * staff may update the status.
     */
    public function update(User $user, JobApplication $application): bool
    {
        if ($user->id === $application->user_id) {
            return $user->hasPermissionTo('job.apply');
        }

        if (! $user->hasPermissionTo('job.update')) {
            return false;
        }

        if ($user->hasRole('super_admin') || $application->vacancy?->created_by === $user->id) {
            return true;
        }

        return $application->vacancy?->institution_id !== null
            && $user->institution_id === $application->vacancy->institution_id;
    }
}
