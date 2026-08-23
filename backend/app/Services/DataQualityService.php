<?php

namespace App\Services;

use App\Models\Alumni;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Tenant-scoped data quality analysis for the alumni database.
 *
 * Checks: duplicate detection, incomplete profiles, missing fields,
 * invalid regions, and provides a health score + cleanup suggestions.
 */
class DataQualityService
{
    /**
     * Full data quality report for the current institution.
     */
    public function report(Request $request): array
    {
        $query = Alumni::query()
            ->forInstitution($this->institutionId($request));

        $totalAlumni = (clone $query)->count();

        if ($totalAlumni === 0) {
            return $this->emptyReport();
        }

        // Duplicate detection (same name + same graduation year within institution).
        $duplicates = $this->detectDuplicates(clone $query);

        // Incomplete profiles.
        $missingEmail = (clone $query)->whereNull('email')->orWhere('email', '')->count();
        $missingPhone = (clone $query)->whereNull('phone')->orWhere('phone', '')->count();
        $missingGraduationYear = (clone $query)->whereNull('graduation_year_id')->count();
        $missingDepartment = (clone $query)->whereNull('department_id')->count();
        $missingAddress = (clone $query)->whereNull('address')->orWhere('address', '')->count();
        $missingEmploymentStatus = (clone $query)->whereNull('employment_status')->orWhere('employment_status', '')->count();
        $missingGender = (clone $query)->whereNull('gender')->count();
        $missingBirthDate = (clone $query)->whereNull('birth_date')->count();

        // Profiles with no user account linked.
        $withoutUserAccount = (clone $query)->whereNull('user_id')->count();

        // Profiles with no linked user account and no email (cannot be invited).
        $unreachableAlumni = (clone $query)
            ->whereNull('user_id')
            ->where(function ($q) {
                $q->whereNull('email')->orWhere('email', '');
            })
            ->count();

        // Data freshness: alumni updated more than 6 months ago.
        $staleProfiles = (clone $query)
            ->where('updated_at', '<', now()->subMonths(6))
            ->count();

        // Incomplete profile count (missing 3+ important fields).
        $incompleteProfiles = $this->countIncompleteProfiles(clone $query);

        // Health score: 100 = perfect, deductions for each issue.
        $healthScore = $this->calculateHealthScore($totalAlumni, [
            'duplicates' => $duplicates['total_groups'],
            'missing_email' => $missingEmail,
            'missing_graduation_year' => $missingGraduationYear,
            'missing_department' => $missingDepartment,
            'missing_employment_status' => $missingEmploymentStatus,
            'without_user_account' => $withoutUserAccount,
            'incomplete_profiles' => $incompleteProfiles,
        ]);

        // Recommendations.
        $recommendations = $this->generateRecommendations([
            'total' => $totalAlumni,
            'duplicates' => $duplicates['total_groups'],
            'missing_email' => $missingEmail,
            'missing_phone' => $missingPhone,
            'missing_graduation_year' => $missingGraduationYear,
            'missing_department' => $missingDepartment,
            'missing_address' => $missingAddress,
            'missing_employment_status' => $missingEmploymentStatus,
            'missing_gender' => $missingGender,
            'missing_birth_date' => $missingBirthDate,
            'without_user_account' => $withoutUserAccount,
            'unreachable' => $unreachableAlumni,
            'stale_profiles' => $staleProfiles,
            'incomplete_profiles' => $incompleteProfiles,
        ]);

        return [
            'total_alumni' => $totalAlumni,
            'health_score' => $healthScore,
            'health_status' => $this->healthStatusLabel($healthScore),
            'missing_fields' => [
                'email' => $missingEmail,
                'phone' => $missingPhone,
                'graduation_year' => $missingGraduationYear,
                'department' => $missingDepartment,
                'address' => $missingAddress,
                'employment_status' => $missingEmploymentStatus,
                'gender' => $missingGender,
                'birth_date' => $missingBirthDate,
            ],
            'duplicates' => $duplicates,
            'profile_issues' => [
                'without_user_account' => $withoutUserAccount,
                'unreachable' => $unreachableAlumni,
                'incomplete_profiles' => $incompleteProfiles,
                'stale_profiles' => $staleProfiles,
            ],
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Detect potential duplicate alumni (same name + graduation year).
     */
    private function detectDuplicates(Builder $query): array
    {
        $groups = (clone $query)
            ->selectRaw('name, graduation_year_id, count(*) as count')
            ->groupBy('name', 'graduation_year_id')
            ->havingRaw('count(*) > 1')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'graduation_year_id' => $row->graduation_year_id,
                'count' => (int) $row->count,
            ])
            ->values();

        return [
            'total_groups' => $groups->count(),
            'total_duplicates' => $groups->sum('count') - $groups->count(),
            'groups' => $groups->take(20),
        ];
    }

    /**
     * Count alumni with 3+ missing important fields.
     */
    private function countIncompleteProfiles(Builder $query): int
    {
        return (clone $query)
            ->where(function ($q) {
                $q->whereNull('email')->orWhere('email', '');
            })
            ->where(function ($q) {
                $q->whereNull('phone')->orWhere('phone', '');
            })
            ->where(function ($q) {
                $q->whereNull('graduation_year_id');
            })
            ->count()
            + (clone $query)
                ->whereNull('email')
                ->whereNull('phone')
                ->whereNull('graduation_year_id')
                ->whereNull('department_id')
                ->count();
    }

    /**
     * Calculate a 0–100 health score based on data completeness and quality.
     */
    private function calculateHealthScore(int $total, array $issues): int
    {
        if ($total === 0) {
            return 100;
        }

        $score = 100;
        $pct = fn (int $count) => round($count / $total * 100, 1);

        // Deductions (max 30 total).
        $score -= min(10, $pct($issues['duplicates']));
        $score -= min(10, $pct($issues['missing_email']));
        $score -= min(5, $pct($issues['missing_graduation_year']));
        $score -= min(5, $pct($issues['missing_department']));
        $score -= min(5, $pct($issues['missing_employment_status']));
        $score -= min(5, $pct($issues['without_user_account']));

        return max(0, (int) round($score));
    }

    /**
     * Map health score to a human-readable status label.
     */
    private function healthStatusLabel(int $score): string
    {
        return match (true) {
            $score >= 90 => 'Sangat Baik',
            $score >= 75 => 'Baik',
            $score >= 60 => 'Cukup',
            $score >= 40 => 'Perlu Perhatian',
            default => 'Kritis',
        };
    }

    /**
     * Generate actionable recommendations based on data quality issues.
     *
     * @return array<int, array{priority: string, message: string}>
     */
    private function generateRecommendations(array $issues): array
    {
        $recommendations = [];
        $total = $issues['total'];

        if ($total === 0) {
            return [];
        }

        $pct = fn (int $count) => round($count / $total * 100, 1);

        if ($issues['duplicates'] > 0) {
            $recommendations[] = [
                'priority' => 'high',
                'message' => "{$issues['duplicates']} kemungkinan duplikat ditemukan. Periksa dan hapus data ganda.",
            ];
        }

        if ($issues['missing_email'] > 0) {
            $p = $pct($issues['missing_email']);
            $recommendations[] = [
                'priority' => $issues['missing_email'] > $total * 0.1 ? 'high' : 'medium',
                'message' => "{$issues['missing_email']} alumni ({$p}%) belum memiliki email. Lengkapi untuk komunikasi.",
            ];
        }

        if ($issues['missing_graduation_year'] > 0) {
            $recommendations[] = [
                'priority' => 'high',
                'message' => "{$issues['missing_graduation_year']} alumni belum memiliki tahun lulus. Data ini penting untuk analitik.",
            ];
        }

        if ($issues['missing_department'] > 0) {
            $recommendations[] = [
                'priority' => 'medium',
                'message' => "{$issues['missing_department']} alumni belum memiliki jurusan. Lengkapi untuk pemfilteran.",
            ];
        }

        if ($issues['missing_employment_status'] > 0) {
            $p = $pct($issues['missing_employment_status']);
            $recommendations[] = [
                'priority' => 'medium',
                'message' => "{$issues['missing_employment_status']} alumni ({$p}%) belum memiliki status pekerjaan.",
            ];
        }

        if ($issues['without_user_account'] > 0) {
            $p = $pct($issues['without_user_account']);
            $recommendations[] = [
                'priority' => 'medium',
                'message' => "{$issues['without_user_account']} alumni ({$p}%) belum memiliki akun. Kirim undangan untuk akses portal.",
            ];
        }

        if ($issues['unreachable'] > 0) {
            $recommendations[] = [
                'priority' => 'high',
                'message' => "{$issues['unreachable']} alumni tidak dapat dihubungi (tanpa akun dan tanpa email).",
            ];
        }

        if ($issues['stale_profiles'] > 0) {
            $recommendations[] = [
                'priority' => 'low',
                'message' => "{$issues['stale_profiles']} profil belum diperbarui selama 6 bulan. Minta alumni memperbarui data.",
            ];
        }

        if ($issues['incomplete_profiles'] > 0) {
            $recommendations[] = [
                'priority' => 'medium',
                'message' => "{$issues['incomplete_profiles']} profil sangat tidak lengkap (3+ field kosong).",
            ];
        }

        return $recommendations;
    }

    /**
     * Empty report when no alumni exist.
     */
    private function emptyReport(): array
    {
        return [
            'total_alumni' => 0,
            'health_score' => 100,
            'health_status' => 'Belum Ada Data',
            'missing_fields' => [
                'email' => 0,
                'phone' => 0,
                'graduation_year' => 0,
                'department' => 0,
                'address' => 0,
                'employment_status' => 0,
                'gender' => 0,
                'birth_date' => 0,
            ],
            'duplicates' => [
                'total_groups' => 0,
                'total_duplicates' => 0,
                'groups' => [],
            ],
            'profile_issues' => [
                'without_user_account' => 0,
                'unreachable' => 0,
                'incomplete_profiles' => 0,
                'stale_profiles' => 0,
            ],
            'recommendations' => [],
        ];
    }

    /**
     * Resolve the institution scope for the current user.
     */
    private function institutionId(Request $request): ?string
    {
        $user = $request->user();

        if ($user->hasRole('super_admin')) {
            return $request->filled('institution_id') ? $request->institution_id : null;
        }

        return $user->institution_id;
    }
}
