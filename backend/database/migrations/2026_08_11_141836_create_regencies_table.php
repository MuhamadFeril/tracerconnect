<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regencies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('province_id')
                ->constrained('provinces')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('code', 10)->unique();
            $table->string('name');

            $table->timestamps();

            $table->index('province_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regencies');
    }
};