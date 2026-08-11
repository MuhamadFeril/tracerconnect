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
        Schema::create('question_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('question_id')->constrained('questions')->cascadeOnDelete();
            $table->string('label');
            $table->string('value')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->index(['question_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_options');
    }
};
