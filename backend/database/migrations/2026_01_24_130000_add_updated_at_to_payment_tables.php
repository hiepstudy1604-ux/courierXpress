<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment_intent') && !Schema::hasColumn('payment_intent', 'updated_at')) {
            Schema::table('payment_intent', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            });
        }

        if (Schema::hasTable('payment_event_log') && !Schema::hasColumn('payment_event_log', 'updated_at')) {
            Schema::table('payment_event_log', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payment_event_log') && Schema::hasColumn('payment_event_log', 'updated_at')) {
            Schema::table('payment_event_log', function (Blueprint $table) {
                $table->dropColumn('updated_at');
            });
        }

        if (Schema::hasTable('payment_intent') && Schema::hasColumn('payment_intent', 'updated_at')) {
            Schema::table('payment_intent', function (Blueprint $table) {
                $table->dropColumn('updated_at');
            });
        }
    }
};
