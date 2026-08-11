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

    public function view(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->can('job.view')
            && ($user->hasRole('super_admin') || $user->institution_id === $jobVacancy->institution_id);
    }

    public function create(User $user): bool
    {
        return $user->can('job.create');
    }

    public function update(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->can('job.update')
            && ($user->hasRole('super_admin') || $user->institution_id === $jobVacancy->institution_id);
    }

    public function delete(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->can('job.delete')
            && ($user->hasRole('super_admin') || $user->institution_id === $jobVacancy->institution_id);
    }
}
