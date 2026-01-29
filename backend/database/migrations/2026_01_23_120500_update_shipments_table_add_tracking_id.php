<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('shipments', 'tracking_id')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->string('tracking_id', 50)->nullable()->unique()->after('shipment_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('shipments', 'tracking_id')) {
            Schema::table('shipments', function (Blueprint $table) {
                // Laravel default unique index name: shipments_tracking_id_unique
                $table->dropUnique('shipments_tracking_id_unique');
                $table->dropColumn('tracking_id');
            });
        }
    }
};
