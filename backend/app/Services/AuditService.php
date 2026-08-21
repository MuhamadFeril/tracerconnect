<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * Record an auditable action.
     *
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public static function log(
        ?string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null,
        ?string $userId = null,
        ?string $institutionId = null,
    ): void {
        $user = $request?->user();

        AuditLog::create([
            'user_id' => $userId ?? $user?->id,
            'institution_id' => $institutionId ?? $user?->institution_id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
