<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ShipmentVehicleAssignmentLogSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::whereNotNull('assigned_vehicle_id')
            ->whereNotNull('assigned_branch_id')
            ->get();

        $rows = [];
        $batchSize = 500;
        $processed = 0;

        foreach ($shipments as $shipment) {
            // Deterministic assigned_at for log if shipment doesn't have one
            $assignedAt = $shipment->assigned_at
                ? Carbon::parse($shipment->assigned_at)
                : Carbon::parse($shipment->created_at)->addMinutes(10 + ($shipment->shipment_id % 50));

            $rows[] = [
                'shipment_id' => $shipment->shipment_id,
                'vehicle_id' => $shipment->assigned_vehicle_id,
                'branch_id' => $shipment->assigned_branch_id,
                'assigned_by' => $shipment->assigned_by ?? 1,
                'assigned_at' => $assignedAt,
                'note' => 'Initial vehicle assignment',
                'created_at' => $assignedAt,
                'updated_at' => $assignedAt,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushInsertIgnore($rows);
                $rows = [];
                $this->command->info("   Inserted (ignore) {$processed} shipment vehicle assignment logs...");
            }
        }

        if (!empty($rows)) {
            $this->flushInsertIgnore($rows);
        }

        $this->command->info("✅ Seeded shipment vehicle assignment logs (attempted {$processed})");
        $this->command->warn('ℹ️  shipment_vehicle_assignment_logs has no natural unique key; seeder uses INSERT IGNORE. For strict idempotency without truncate, add a unique index (shipment_id, vehicle_id, branch_id, assigned_at).');
    }

    private function flushInsertIgnore(array $rows): void
    {
        DB::table('shipment_vehicle_assignment_logs')->insertOrIgnore($rows);
    }
}
