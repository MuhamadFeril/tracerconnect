<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('survey_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignUuid('survey_id')->constrained('surveys')->cascadeOnDelete();
            $table->foreignUuid('respondent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('alumni_id')->nullable()->constrained('alumni')->nullOnDelete();
            $table->string('status')->default('in_progress'); // in_progress | submitted
            $table->unsignedInteger('version')->default(1); // survey version answered
            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['survey_id', 'respondent_id']);
            $table->index(['institution_id', 'status']);
            $table->index('survey_id');
            $table->index('respondent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
    }
};
