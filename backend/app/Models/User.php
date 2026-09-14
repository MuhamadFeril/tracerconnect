<?php

namespace App\Models;

use App\Notifications\ResetPassword;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'institution_id', 'company_name', 'is_active', 'avatar_path', 'gender', 'phone', 'birth_date', 'birthplace', 'birthplace_regency', 'birthplace_province', 'address', 'google_id', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
            'birth_date' => 'date',
        ];
    }

    /**
     * The institution this user belongs to (null for platform-level users).
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * The alumni record linked to this account (matched by email during
     * registration). Null for platform-level users without an alumni profile.
     */
    public function alumni(): HasOne
    {
        return $this->hasOne(Alumni::class);
    }

    /**
     * Mirror this account's name/email onto the linked alumni record.
     *
     * Jejaring directories, alumni listings, and survey responses read the
     * display name/email from the alumni row, so every identity edit on the
     * users table must be mirrored there — otherwise the old name/email
     * resurfaces in those surfaces after a profile update.
     */
    public function syncLinkedAlumniIdentity(): void
    {
        $this->loadMissing('alumni');

        if ($this->alumni && ($this->alumni->name !== $this->name || $this->alumni->email !== $this->email)) {
            $this->alumni()->update(['name' => $this->name, 'email' => $this->email]);
        }
    }

    /**
     * Permanently remove all 1-on-1 (direct) conversations this user
     * participates in. Must run BEFORE the user row is deleted.
     *
     * Background: participant/message_read rows cascade away automatically,
     * but the `conversations` row itself stays behind as an orphan ("?"
     * chat in the UI). Deleting the conversation cascades participants,
     * messages, reads and reports at the DB level. Group conversations are
     * intentionally kept (only this member drops out via FK cascade).
     */
    public function purgeDirectConversations(): void
    {
        $ids = ConversationParticipant::query()
            ->where('user_id', $this->id)
            ->pluck('conversation_id');

        if ($ids->isEmpty()) {
            return;
        }

        Conversation::query()
            ->whereIn('id', $ids)
            ->where('type', 'direct')
            ->delete();
    }

    /**
     * Job applications submitted by this user.
     */
    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    /**
     * Job vacancies bookmarked by this user.
     */
    public function jobBookmarks(): HasMany
    {
        return $this->hasMany(JobBookmark::class);
    }

    /**
     * Firebase device tokens registered for this user (push notifications).
     */
    public function fcmTokens(): HasMany
    {
        return $this->hasMany(FcmToken::class);
    }

    /**
     * Send the password reset notification with the frontend reset URL.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPassword($token));
    }
}
