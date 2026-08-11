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
        Schema::create('graduation_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['institution_id', 'year']);
            $table->index('institution_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('graduation_years');
    }
};
