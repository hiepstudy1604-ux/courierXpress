<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // user_id đã được thêm trong create_shipments_table migration
            // Migration này chỉ để đảm bảo foreign key được thiết lập đúng
        });
    }

    public function down(): void
    {
        // No need to drop as it's part of the main table
    }
};
