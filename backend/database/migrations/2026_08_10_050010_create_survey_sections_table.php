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
        Schema::create('survey_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('survey_id')->constrained('surveys')->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->index(['survey_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_sections');
    }
};
