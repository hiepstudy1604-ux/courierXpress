<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\WarehouseScan;
use App\Models\WarehouseReconciliation;
use Illuminate\Database\Seeder;

class WarehouseScanSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::where('shipment_status', 'CONFIRM_PAYMENT')
            ->whereDoesntHave('warehouseScans')
            ->get();

        $count = 0;
        foreach ($shipments as $shipment) {
            if (!$shipment->assigned_branch_id) continue;

            // Create inbound scan
            $scan = WarehouseScan::create([
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'warehouse_role' => 'ORIGIN',
                'scan_type' => 'INBOUND',
                'scanned_by_role' => 'WAREHOUSE_STAFF',
                'scanned_by' => 1,
                'scanned_at' => now()->subHours(12),
                'waybill_code' => 'WB-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT),
                'package_count' => 1,
                'condition_status' => 'NORMAL',
                'note' => 'Inbound scan at origin warehouse',
            ]);

            // Create reconciliation
            WarehouseReconciliation::create([
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'warehouse_role' => 'ORIGIN',
                'reconciled_by' => 1,
                'reconciled_at' => now()->subHours(11),
                'goods_check_status' => 'PASS',
                'waybill_check_status' => 'PASS',
                'cash_check_status' => 'PASS',
                'expected_cash_amount' => 0,
                'received_cash_amount' => 0,
                'final_status' => 'PASS',
            ]);

            $shipment->update(['shipment_status' => 'IN_ORIGIN_WAREHOUSE']);
            $count++;
        }

        $this->command->info("✅ Created {$count} warehouse scans");
    }
}
