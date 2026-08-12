<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;

class JobApplicationPolicy
{
    /**
     * Staff with application-management permission can list applications
     * (scoped to their own institution by the controller).
     */
    public function viewAny(User $user): bool
    {
        return $user->can('job-application.view');
    }

    /**
     * A single application is visible to the applicant or to staff of the
     * vacancy's institution.
     */
    public function view(User $user, JobApplication $application): bool
    {
        if ($user->id === $application->applicant_id) {
            return true;
        }

        return $user->can('job-application.view')
            && ($user->hasRole('super_admin') || $user->institution_id === $application->jobVacancy?->institution_id);
    }

    /**
     * Applying is reserved for alumni of the vacancy's institution, and only
     * while the vacancy is published.
     */
    public function apply(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->hasRole('alumni')
            && $user->institution_id !== null
            && $user->institution_id === $jobVacancy->institution_id
            && $jobVacancy->status === 'published';
    }

    /**
     * Staff of the vacancy's institution can review applications.
     */
    public function updateStatus(User $user, JobApplication $application): bool
    {
        return $user->can('job-application.update')
            && ($user->hasRole('super_admin') || $user->institution_id === $application->jobVacancy?->institution_id);
    }

    /**
     * The applicant can withdraw their own application; staff with delete
     * permission can remove applications within their institution.
     */
    public function delete(User $user, JobApplication $application): bool
    {
        if ($user->id === $application->applicant_id) {
            return true;
        }

        return $user->can('job.delete')
            && ($user->hasRole('super_admin') || $user->institution_id === $application->jobVacancy?->institution_id);
    }
}
