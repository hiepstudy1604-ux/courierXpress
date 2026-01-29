<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            if (!Schema::hasColumn('agents', 'motorbike')) {
                $table->unsignedInteger('motorbike')->default(0)->after('branch_id');
            }
            if (!Schema::hasColumn('agents', 'truck_500kg')) {
                $table->unsignedInteger('truck_500kg')->default(0)->after('motorbike');
            }
            if (!Schema::hasColumn('agents', 'truck_1t')) {
                $table->unsignedInteger('truck_1t')->default(0)->after('truck_500kg');
            }
            if (!Schema::hasColumn('agents', 'truck_2t')) {
                $table->unsignedInteger('truck_2t')->default(0)->after('truck_1t');
            }
            if (!Schema::hasColumn('agents', 'truck_2_5t')) {
                $table->unsignedInteger('truck_2_5t')->default(0)->after('truck_2t');
            }
            if (!Schema::hasColumn('agents', 'truck_3_5t')) {
                $table->unsignedInteger('truck_3_5t')->default(0)->after('truck_2_5t');
            }
            if (!Schema::hasColumn('agents', 'truck_5t')) {
                $table->unsignedInteger('truck_5t')->default(0)->after('truck_3_5t');
            }
            if (!Schema::hasColumn('agents', 'total_shipments')) {
                $table->unsignedInteger('total_shipments')->default(0)->after('truck_5t');
            }
            if (!Schema::hasColumn('agents', 'active_shipments')) {
                $table->unsignedInteger('active_shipments')->default(0)->after('total_shipments');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            if (Schema::hasColumn('agents', 'active_shipments')) {
                $table->dropColumn('active_shipments');
            }
            if (Schema::hasColumn('agents', 'total_shipments')) {
                $table->dropColumn('total_shipments');
            }
            if (Schema::hasColumn('agents', 'truck_5t')) {
                $table->dropColumn('truck_5t');
            }
            if (Schema::hasColumn('agents', 'truck_3_5t')) {
                $table->dropColumn('truck_3_5t');
            }
            if (Schema::hasColumn('agents', 'truck_2_5t')) {
                $table->dropColumn('truck_2_5t');
            }
            if (Schema::hasColumn('agents', 'truck_2t')) {
                $table->dropColumn('truck_2t');
            }
            if (Schema::hasColumn('agents', 'truck_1t')) {
                $table->dropColumn('truck_1t');
            }
            if (Schema::hasColumn('agents', 'truck_500kg')) {
                $table->dropColumn('truck_500kg');
            }
            if (Schema::hasColumn('agents', 'motorbike')) {
                $table->dropColumn('motorbike');
            }
        });
    }
};
