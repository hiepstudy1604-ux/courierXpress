<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // call_log: prevent duplicate attempts per shipment + call_type
        if (Schema::hasTable('call_log')) {
            Schema::table('call_log', function (Blueprint $table) {
                $indexName = 'call_log_shipment_calltype_attempt_unique';
                // Avoid exception if index already exists
                try {
                    $table->unique(['shipment_id', 'call_type', 'attempt_no'], $indexName);
                } catch (\Throwable $e) {
                    // ignore
                }
            });
        }

        // shipment_vehicle_assignment_logs: prevent duplicate assignment log rows
        if (Schema::hasTable('shipment_vehicle_assignment_logs')) {
            Schema::table('shipment_vehicle_assignment_logs', function (Blueprint $table) {
                $indexName = 'sval_shipment_vehicle_branch_assignedat_unique';
                try {
                    $table->unique(['shipment_id', 'vehicle_id', 'branch_id', 'assigned_at'], $indexName);
                } catch (\Throwable $e) {
                    // ignore
                }
            });
        }

        // warehouse_scan: prevent duplicates for the 4 canonical scan events
        if (Schema::hasTable('warehouse_scan')) {
            Schema::table('warehouse_scan', function (Blueprint $table) {
                $indexName = 'warehouse_scan_shipment_branch_role_type_unique';
                try {
                    $table->unique(['shipment_id', 'branch_id', 'warehouse_role', 'scan_type'], $indexName);
                } catch (\Throwable $e) {
                    // ignore
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('warehouse_scan')) {
            Schema::table('warehouse_scan', function (Blueprint $table) {
                $table->dropUnique('warehouse_scan_shipment_branch_role_type_unique');
            });
        }

        if (Schema::hasTable('shipment_vehicle_assignment_logs')) {
            Schema::table('shipment_vehicle_assignment_logs', function (Blueprint $table) {
                $table->dropUnique('sval_shipment_vehicle_branch_assignedat_unique');
            });
        }

        if (Schema::hasTable('call_log')) {
            Schema::table('call_log', function (Blueprint $table) {
                $table->dropUnique('call_log_shipment_calltype_attempt_unique');
            });
        }
    }
};
