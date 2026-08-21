<?php

namespace App\Policies;

use App\Models\Survey;
use App\Models\User;

class SurveyPolicy
{
    private function inSameInstitution(User $user, Survey $survey): bool
    {
        return $user->institution_id !== null && $user->institution_id === $survey->institution_id;
    }

    private function canManage(User $user, Survey $survey): bool
    {
        return $user->hasRole('super_admin')
            || ($this->inSameInstitution($user, $survey) && $user->hasAnyRole(['institution_admin']));
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function view(User $user, Survey $survey): bool
    {
        return $user->hasRole('super_admin') || $this->inSameInstitution($user, $survey);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function update(User $user, Survey $survey): bool
    {
        return $this->canManage($user, $survey);
    }

    public function delete(User $user, Survey $survey): bool
    {
        return $this->canManage($user, $survey);
    }

    public function publish(User $user, Survey $survey): bool
    {
        return $this->canManage($user, $survey);
    }

    public function unpublish(User $user, Survey $survey): bool
    {
        return $this->canManage($user, $survey);
    }

    public function reorder(User $user, Survey $survey): bool
    {
        return $this->canManage($user, $survey);
    }

    /**
     * Filling the survey (starting, saving, submitting) is allowed for
     * anyone inside the survey's institution, including alumni respondents.
     */
    public function start(User $user, Survey $survey): bool
    {
        return $user->hasRole('super_admin') || $this->inSameInstitution($user, $survey);
    }

    public function save(User $user, Survey $survey): bool
    {
        return $this->start($user, $survey);
    }

    public function submit(User $user, Survey $survey): bool
    {
        return $this->start($user, $survey);
    }
}
