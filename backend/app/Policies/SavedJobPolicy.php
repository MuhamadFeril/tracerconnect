<?php

namespace App\Policies;

use App\Models\JobVacancy;
use App\Models\SavedJob;
use App\Models\User;

class SavedJobPolicy
{
    /**
     * Any authenticated user can list their own saved jobs; the controller
     * always scopes the query to the current user, so nothing leaks.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only published vacancies from the user's own institution can be saved.
     */
    public function create(User $user, JobVacancy $jobVacancy): bool
    {
        return $user->institution_id !== null
            && $user->institution_id === $jobVacancy->institution_id
            && $jobVacancy->status === 'published';
    }

    /**
     * Only the owner can remove a saved job.
     */
    public function delete(User $user, SavedJob $savedJob): bool
    {
        return $user->id === $savedJob->user_id;
    }
}
