<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('universities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('type')->nullable();    // Negeri | Swasta
            $table->string('province')->nullable();
            $table->string('city')->nullable();
            $table->timestamps();
        });

        Schema::create('study_programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('university_id')->constrained('universities')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index('university_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_programs');
        Schema::dropIfExists('universities');
    }
};
