<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveWarehouseScanSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding warehouse scans...');

        $statuses = [
            'IN_ORIGIN_WAREHOUSE',
            'IN_TRANSIT',
            'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED',
            'DELIVERED_SUCCESS',
            'CLOSED',
        ];

        $shipments = Shipment::whereIn('shipment_status', $statuses)->get();

        $rows = [];
        $batchSize = 400;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);

            $waybillCode = 'WB-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT);

            // Stable, idempotent keys
            // key = shipment_id + branch_id + warehouse_role + scan_type

            if (in_array($shipment->shipment_status, [
                'IN_ORIGIN_WAREHOUSE',
                'IN_TRANSIT',
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $inboundTime = $createdAt->copy()->addHours(rand(2, 6));

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'branch_id' => $shipment->assigned_branch_id,
                    'warehouse_role' => 'ORIGIN',
                    'scan_type' => 'INBOUND',
                    'scanned_by_role' => 'WAREHOUSE_STAFF',
                    'scanned_by' => 1,
                    'scanned_at' => $inboundTime,
                    'waybill_code' => $waybillCode,
                    'package_count' => 1,
                    'condition_status' => 'GOOD',
                    'note' => 'Received from pickup',
                    'created_at' => $inboundTime,
                ];
                $processed++;
            }

            if (in_array($shipment->shipment_status, [
                'IN_TRANSIT',
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $outboundTime = $createdAt->copy()->addHours(rand(6, 12));

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'branch_id' => $shipment->assigned_branch_id,
                    'warehouse_role' => 'ORIGIN',
                    'scan_type' => 'OUTBOUND',
                    'scanned_by_role' => 'WAREHOUSE_STAFF',
                    'scanned_by' => 1,
                    'scanned_at' => $outboundTime,
                    'waybill_code' => $waybillCode,
                    'package_count' => 1,
                    'condition_status' => 'GOOD',
                    'note' => 'Loaded to transit vehicle',
                    'created_at' => $outboundTime,
                ];
                $processed++;
            }

            if (in_array($shipment->shipment_status, [
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                // TODO: compute actual destination branch later; currently simplified
                $destBranchId = $shipment->assigned_branch_id;
                $destInboundTime = $createdAt->copy()->addDays(rand(1, 3))->addHours(rand(8, 18));

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'branch_id' => $destBranchId,
                    'warehouse_role' => 'DESTINATION',
                    'scan_type' => 'INBOUND',
                    'scanned_by_role' => 'WAREHOUSE_STAFF',
                    'scanned_by' => 1,
                    'scanned_at' => $destInboundTime,
                    'waybill_code' => $waybillCode,
                    'package_count' => 1,
                    'condition_status' => 'GOOD',
                    'note' => 'Received from transit',
                    'created_at' => $destInboundTime,
                ];
                $processed++;
            }

            if (in_array($shipment->shipment_status, [
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $destBranchId = $shipment->assigned_branch_id;
                $destOutboundTime = $createdAt->copy()->addDays(rand(1, 3))->addHours(rand(18, 22));

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'branch_id' => $destBranchId,
                    'warehouse_role' => 'DESTINATION',
                    'scan_type' => 'OUTBOUND',
                    'scanned_by_role' => 'WAREHOUSE_STAFF',
                    'scanned_by' => 1,
                    'scanned_at' => $destOutboundTime,
                    'waybill_code' => $waybillCode,
                    'package_count' => 1,
                    'condition_status' => 'GOOD',
                    'note' => 'Released for delivery',
                    'created_at' => $destOutboundTime,
                ];
                $processed++;
            }

            if (count($rows) >= $batchSize) {
                $this->flushInsertIgnore($rows);
                $rows = [];
                $this->command->info("   Inserted (ignore) {$processed} warehouse scans...");
            }
        }

        if (!empty($rows)) {
            $this->flushInsertIgnore($rows);
        }

        $this->command->info("✅ Seeded warehouse scans (attempted {$processed})");
        $this->command->warn('ℹ️  warehouse_scan table has no updated_at and no natural unique index; seeder uses INSERT IGNORE for idempotency.');
    }

    private function flushInsertIgnore(array $rows): void
    {
        // MySQL-only idempotent approach without adding unique indexes:
        // - uses INSERT IGNORE, so duplicates (if any unique constraints exist) are skipped
        // For true idempotency without truncate, consider adding a unique key on (shipment_id, branch_id, warehouse_role, scan_type).
        DB::table('warehouse_scan')->insertOrIgnore($rows);
    }
}
