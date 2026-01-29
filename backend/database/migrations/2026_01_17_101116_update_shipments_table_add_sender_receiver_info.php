<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('sender_name', 120)->nullable()->after('sender_address_text');
            $table->string('sender_phone', 20)->nullable()->after('sender_name');
            $table->string('receiver_name', 120)->nullable()->after('receiver_address_text');
            $table->string('receiver_phone', 20)->nullable()->after('receiver_name');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['sender_name', 'sender_phone', 'receiver_name', 'receiver_phone']);
        });
    }
};
