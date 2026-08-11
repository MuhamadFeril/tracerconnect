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
        Schema::create('survey_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('response_id')->constrained('survey_responses')->cascadeOnDelete();
            $table->foreignUuid('question_id')->constrained('questions')->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['response_id', 'question_id']);
            $table->index('question_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_answers');
    }
};
