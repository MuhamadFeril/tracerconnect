<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('fcm_tokens')) {
            return;
        }

        // 1. Perbesar kolom token dari varchar(255) ke varchar(768).
        //    FCM token praktis ~150-180 char; MySQL max key = 3072 byte /
        //    utf8mb4 (4 byte) = 768 char max untuk UNIQUE key.
        DB::statement("ALTER TABLE `fcm_tokens` MODIFY `token` VARCHAR(768) NOT NULL");

        // 2. Drop FK cascadeOnDelete lama.
        $fkRows = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND TABLE_NAME = 'fcm_tokens'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = 'fcm_tokens_user_id_foreign'
        ");
        if (! empty($fkRows)) {
            DB::statement("ALTER TABLE `fcm_tokens` DROP FOREIGN KEY `fcm_tokens_user_id_foreign`");
        }

        // 3. Buat user_id nullable (MySQL wajib untuk ON DELETE SET NULL).
        DB::statement("ALTER TABLE `fcm_tokens` MODIFY `user_id` CHAR(36) NULL DEFAULT NULL");

        // 4. Re-create FK dengan nullOnDelete.
        DB::statement("
            ALTER TABLE `fcm_tokens`
            ADD CONSTRAINT `fcm_tokens_user_id_foreign`
            FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
        ");
    }

    public function down(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('fcm_tokens')) {
            return;
        }

        // Rollback FK ke cascadeOnDelete.
        $fkRows = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND TABLE_NAME = 'fcm_tokens'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND CONSTRAINT_NAME = 'fcm_tokens_user_id_foreign'
        ");
        if (! empty($fkRows)) {
            DB::statement("ALTER TABLE `fcm_tokens` DROP FOREIGN KEY `fcm_tokens_user_id_foreign`");
        }

        DB::statement("
            ALTER TABLE `fcm_tokens`
            ADD CONSTRAINT `fcm_tokens_user_id_foreign`
            FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ");

        // Kembalikan ke varchar(255).
        DB::statement("ALTER TABLE `fcm_tokens` MODIFY `token` VARCHAR(255) NOT NULL");
    }
};
