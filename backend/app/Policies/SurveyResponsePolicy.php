<?php

namespace App\Policies;

use App\Models\SurveyResponse;
use App\Models\User;

class SurveyResponsePolicy
{
    private function staffOf(User $user, SurveyResponse $response): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->institution_id !== null
            && $user->institution_id === $response->institution_id
            && $user->hasAnyRole(['institution_admin']);
    }

    /**
     * Staff listing of responses.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    /**
     * Staff review or respondent viewing their own response.
     */
    public function view(User $user, SurveyResponse $response): bool
    {
        return $this->staffOf($user, $response)
            || $response->respondent_id === $user->id;
    }

    /**
     * Staff may delete responses of their own institution.
     */
    public function delete(User $user, SurveyResponse $response): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->institution_id !== null
            && $user->institution_id === $response->institution_id
            && $user->hasAnyRole(['institution_admin']);
    }
}
