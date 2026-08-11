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
        Schema::create('question_conditions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // The question that is conditionally shown.
            $table->foreignUuid('question_id')->constrained('questions')->cascadeOnDelete();
            // The question whose answer triggers the condition.
            $table->foreignUuid('condition_question_id')->constrained('questions')->cascadeOnDelete();
            $table->string('operator')->default('equals'); // equals | not_equals | in
            $table->string('value')->nullable();
            $table->timestamps();

            $table->index(['question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_conditions');
    }
};
