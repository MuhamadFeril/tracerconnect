<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_vacancy_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('alumni_id')->nullable()->constrained('alumni')->nullOnDelete();
            $table->string('status', 30)->default('submitted'); // submitted|reviewing|shortlisted|interview|accepted|rejected|withdrawn
            $table->text('cover_letter')->nullable();
            $table->string('cv_path')->nullable();
            $table->string('portfolio_path')->nullable();
            $table->timestamp('applied_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            // One application per user per vacancy.
            $table->unique(['job_vacancy_id', 'user_id']);
            $table->index(['job_vacancy_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
