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
        Schema::create('success_stories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->string('title');
            $table->string('category')->default('other'); // career | study | entrepreneur | achievement | other
            $table->text('content');
            $table->string('cover_image_path');
            $table->foreignUuid('alumni_id')->nullable()->constrained('alumni')->nullOnDelete();
            $table->string('status')->default('draft'); // draft | published
            $table->timestamp('published_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('institution_id');
            $table->index('status');
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('success_stories');
    }
};
