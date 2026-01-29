<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'motorbike')) {
                $table->unsignedInteger('motorbike')->default(0)->after('is_active');
            }
            if (!Schema::hasColumn('branches', 'truck_500kg')) {
                $table->unsignedInteger('truck_500kg')->default(0)->after('motorbike');
            }
            if (!Schema::hasColumn('branches', 'truck_1t')) {
                $table->unsignedInteger('truck_1t')->default(0)->after('truck_500kg');
            }
            if (!Schema::hasColumn('branches', 'truck_2t')) {
                $table->unsignedInteger('truck_2t')->default(0)->after('truck_1t');
            }
            if (!Schema::hasColumn('branches', 'truck_2_5t')) {
                $table->unsignedInteger('truck_2_5t')->default(0)->after('truck_2t');
            }
            if (!Schema::hasColumn('branches', 'truck_3_5t')) {
                $table->unsignedInteger('truck_3_5t')->default(0)->after('truck_2_5t');
            }
            if (!Schema::hasColumn('branches', 'truck_5t')) {
                $table->unsignedInteger('truck_5t')->default(0)->after('truck_3_5t');
            }
            if (!Schema::hasColumn('branches', 'total_shipments')) {
                $table->unsignedInteger('total_shipments')->default(0)->after('truck_5t');
            }
            if (!Schema::hasColumn('branches', 'active_shipments')) {
                $table->unsignedInteger('active_shipments')->default(0)->after('total_shipments');
            }
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches', 'active_shipments')) {
                $table->dropColumn('active_shipments');
            }
            if (Schema::hasColumn('branches', 'total_shipments')) {
                $table->dropColumn('total_shipments');
            }
            if (Schema::hasColumn('branches', 'truck_5t')) {
                $table->dropColumn('truck_5t');
            }
            if (Schema::hasColumn('branches', 'truck_3_5t')) {
                $table->dropColumn('truck_3_5t');
            }
            if (Schema::hasColumn('branches', 'truck_2_5t')) {
                $table->dropColumn('truck_2_5t');
            }
            if (Schema::hasColumn('branches', 'truck_2t')) {
                $table->dropColumn('truck_2t');
            }
            if (Schema::hasColumn('branches', 'truck_1t')) {
                $table->dropColumn('truck_1t');
            }
            if (Schema::hasColumn('branches', 'truck_500kg')) {
                $table->dropColumn('truck_500kg');
            }
            if (Schema::hasColumn('branches', 'motorbike')) {
                $table->dropColumn('motorbike');
            }
        });
    }
};
