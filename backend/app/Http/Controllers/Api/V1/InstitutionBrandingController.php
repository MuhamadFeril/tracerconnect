<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InstitutionBrandingController extends Controller
{
    /**
     * Get current institution branding settings.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->institution_id === null) {
            return ApiResponse::error('Tidak terhubung ke institusi', [], 404);
        }

        $institutionId = $user->hasRole('admin_institusi') && $user->institution_id === null
            ? ($request->input('institution_id') ?? $user->institution_id)
            : $user->institution_id;

        $institution = Institution::find($institutionId);

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        return ApiResponse::success([
            'id' => $institution->id,
            'name' => $institution->name,
            'logo_path' => $institution->logo_path,
            'logo_url' => $this->resolveUrl($institution->logo_path),
            'primary_color' => $institution->primary_color,
            'favicon_path' => $institution->favicon_path,
            'cover_image_path' => $institution->cover_image_path,
            'cover_image_url' => $this->resolveUrl($institution->cover_image_path),
            'report_header' => $institution->report_header,
            'report_footer' => $institution->report_footer,
            'custom_footer' => $institution->custom_footer,
            'contact_email' => $institution->contact_email,
            'contact_phone' => $institution->contact_phone,
            'about' => $institution->about,
        ], 'Branding institusi berhasil diambil');
    }

    /**
     * Update branding settings (text fields + colors).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->institution_id === null) {
            return ApiResponse::error('Tidak memiliki akses', [], 403);
        }

        $institutionId = $user->hasRole('admin_institusi') && $user->institution_id === null
            ? ($request->input('institution_id') ?? $user->institution_id)
            : $user->institution_id;

        $institution = Institution::find($institutionId);

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        $validated = $request->validate([
            'primary_color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'report_header' => 'nullable|string|max:500',
            'report_footer' => 'nullable|string|max:500',
            'custom_footer' => 'nullable|string|max:1000',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'about' => 'nullable|string|max:2000',
        ]);

        $institution->update($validated);

        return ApiResponse::success(
            $this->formatBranding($institution),
            'Branding berhasil diperbarui'
        );
    }

    /**
     * Upload institution logo.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->institution_id === null) {
            return ApiResponse::error('Tidak memiliki akses', [], 403);
        }

        $institutionId = $user->hasRole('admin_institusi') && $user->institution_id === null
            ? ($request->input('institution_id') ?? $user->institution_id)
            : $user->institution_id;

        $institution = Institution::find($institutionId);

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        $request->validate([
            'logo' => 'required|file|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        // Delete old logo
        if ($institution->logo_path) {
            Storage::disk('public')->delete($institution->logo_path);
        }

        $path = $request->file('logo')->store('institution/logos', 'public');
        $institution->update(['logo_path' => $path]);

        return ApiResponse::success([
            'logo_path' => $path,
            'logo_url' => $this->resolveUrl($path),
        ], 'Logo berhasil diunggah');
    }

    /**
     * Upload cover image for reports/landing.
     */
    public function uploadCover(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->institution_id === null) {
            return ApiResponse::error('Tidak memiliki akses', [], 403);
        }

        $institutionId = $user->hasRole('admin_institusi') && $user->institution_id === null
            ? ($request->input('institution_id') ?? $user->institution_id)
            : $user->institution_id;

        $institution = Institution::find($institutionId);

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        $request->validate([
            'cover' => 'required|file|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        // Delete old cover
        if ($institution->cover_image_path) {
            Storage::disk('public')->delete($institution->cover_image_path);
        }

        $path = $request->file('cover')->store('institution/covers', 'public');
        $institution->update(['cover_image_path' => $path]);

        return ApiResponse::success([
            'cover_image_path' => $path,
            'cover_image_url' => $this->resolveUrl($path),
        ], 'Cover image berhasil diunggah');
    }

    /**
     * Delete institution logo.
     */
    public function deleteLogo(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->institution_id === null) {
            return ApiResponse::error('Tidak memiliki akses', [], 403);
        }

        $institutionId = $user->hasRole('admin_institusi') && $user->institution_id === null
            ? ($request->input('institution_id') ?? $user->institution_id)
            : $user->institution_id;

        $institution = Institution::find($institutionId);

        if (! $institution || ! $institution->logo_path) {
            return ApiResponse::error('Logo tidak ditemukan', [], 404);
        }

        Storage::disk('public')->delete($institution->logo_path);
        $institution->update(['logo_path' => null]);

        return ApiResponse::success([], 'Logo berhasil dihapus');
    }

    /**
     * Public branding info (no auth required) for landing page customization.
     */
    public function publicBranding(string $institutionId): JsonResponse
    {
        $institution = Institution::where('id', $institutionId)
            ->where('status', 'active')
            ->first();

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        return ApiResponse::success([
            'id' => $institution->id,
            'name' => $institution->name,
            'logo_url' => $this->resolveUrl($institution->logo_path),
            'primary_color' => $institution->primary_color,
            'cover_image_url' => $this->resolveUrl($institution->cover_image_path),
            'custom_footer' => $institution->custom_footer,
            'contact_email' => $institution->contact_email,
            'contact_phone' => $institution->contact_phone,
            'about' => $institution->about,
        ], 'Branding publik berhasil diambil');
    }

    private function formatBranding(Institution $institution): array
    {
        return [
            'id' => $institution->id,
            'name' => $institution->name,
            'logo_path' => $institution->logo_path,
            'logo_url' => $this->resolveUrl($institution->logo_path),
            'primary_color' => $institution->primary_color,
            'favicon_path' => $institution->favicon_path,
            'cover_image_path' => $institution->cover_image_path,
            'cover_image_url' => $this->resolveUrl($institution->cover_image_path),
            'report_header' => $institution->report_header,
            'report_footer' => $institution->report_footer,
            'custom_footer' => $institution->custom_footer,
            'contact_email' => $institution->contact_email,
            'contact_phone' => $institution->contact_phone,
            'about' => $institution->about,
        ];
    }

    private function resolveUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return '/storage/'.$path;
    }
}
