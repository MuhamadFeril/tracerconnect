<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('cv_requests');
    }

    public function down(): void
    {
        Schema::create('cv_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumni_id')->constrained('alumni')->cascadeOnDelete();
            $table->foreignUuid('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('job_vacancy_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('pending');
            $table->text('message')->nullable();
            $table->string('cv_path')->nullable();
            $table->string('portfolio_path')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['alumni_id', 'employer_id', 'job_vacancy_id'], 'cv_request_unique');
            $table->index(['employer_id', 'status']);
            $table->index(['alumni_id', 'status']);
        });
    }
};
