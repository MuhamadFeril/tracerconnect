<?php

namespace App\Policies;

use App\Models\JobVacancy;
use App\Models\User;

class JobVacancyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('job.view');
    }

    /**
     * A vacancy is visible to its creator (hrd), staff of its
     * institution, and — for cross-school (institution-less) published
     * vacancies — anyone holding the job.view permission (alumni included).
     */
    public function view(User $user, JobVacancy $jobVacancy): bool
    {
        if (! $user->can('job.view')) {
            return false;
        }

        if ($user->hasRole('super_admin') || $jobVacancy->created_by === $user->id) {
            return true;
        }

        // Cross-school hrd vacancies are announced to every school.
        if ($jobVacancy->institution_id === null) {
            return $jobVacancy->status === 'published' || $user->hasRole('hrd');
        }

        return $user->institution_id === $jobVacancy->institution_id;
    }

    public function create(User $user): bool
    {
        return $user->can('job.create');
    }

    public function update(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->can('job.update')
            && ($user->hasRole('super_admin') || $jobVacancy->created_by === $user->id
                || ($jobVacancy->institution_id !== null && $user->institution_id === $jobVacancy->institution_id));
    }

    public function delete(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->can('job.delete')
            && ($user->hasRole('super_admin') || $jobVacancy->created_by === $user->id
                || ($jobVacancy->institution_id !== null && $user->institution_id === $jobVacancy->institution_id));
    }
}
