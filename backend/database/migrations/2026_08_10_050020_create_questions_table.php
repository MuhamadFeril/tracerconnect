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
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('survey_id')->constrained('surveys')->cascadeOnDelete();
            $table->foreignUuid('section_id')->nullable()->constrained('survey_sections')->cascadeOnDelete();
            $table->string('type'); // text, textarea, number, date, single_choice, multiple_choice, dropdown, rating, scale, yes_no, file
            $table->string('label', 500);
            $table->string('help_text', 1000)->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->json('validation_rules')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['survey_id', 'order']);
            $table->index(['section_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
