<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_bookmarks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_vacancy_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['job_vacancy_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_bookmarks');
    }
};
