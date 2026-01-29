<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveDriverAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding driver assignments...');

        $statuses = [
            'ON_THE_WAY_PICKUP',
            'PICKUP_COMPLETED',
            'VERIFIED_ITEM',
            'ADJUST_ITEM',
            'CONFIRMED_PRICE',
            'ADJUSTED_PRICE',
            'PENDING_PAYMENT',
            'CONFIRM_PAYMENT',
            'IN_ORIGIN_WAREHOUSE',
            'IN_TRANSIT',
            'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED',
            'DELIVERED_SUCCESS',
            'CLOSED',
        ];

        $shipments = Shipment::whereIn('shipment_status', $statuses)->get();

        $drivers = Driver::where('is_active', true)->get();
        if ($drivers->isEmpty()) {
            $this->command->warn('⚠️  No active drivers found.');
            return;
        }

        $rows = [];
        $batchSize = 300;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $branchDrivers = $drivers->where('branch_id', $shipment->assigned_branch_id);
            $pickupDriver = $branchDrivers->isEmpty() ? $drivers->random() : $branchDrivers->random();

            $createdAt = Carbon::parse($shipment->created_at);

            // Deterministic-ish assignment times
            $assignedAt = $createdAt->copy()->addHours(1 + ($shipment->shipment_id % 6));
            $acceptedAt = $assignedAt->copy()->addMinutes(5 + ($shipment->shipment_id % 25));

            $pickupStartedAt = null;
            $pickupCompletedAt = null;

            if (in_array($shipment->shipment_status, [
                'ON_THE_WAY_PICKUP',
                'PICKUP_COMPLETED',
                'VERIFIED_ITEM',
                'ADJUST_ITEM',
                'CONFIRMED_PRICE',
                'ADJUSTED_PRICE',
                'PENDING_PAYMENT',
                'CONFIRM_PAYMENT',
                'IN_ORIGIN_WAREHOUSE',
                'IN_TRANSIT',
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $pickupStartedAt = $acceptedAt->copy()->addMinutes(15 + ($shipment->shipment_id % 45));
            }

            if (in_array($shipment->shipment_status, [
                'PICKUP_COMPLETED',
                'VERIFIED_ITEM',
                'ADJUST_ITEM',
                'CONFIRMED_PRICE',
                'ADJUSTED_PRICE',
                'PENDING_PAYMENT',
                'CONFIRM_PAYMENT',
                'IN_ORIGIN_WAREHOUSE',
                'IN_TRANSIT',
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $pickupCompletedAt = ($pickupStartedAt ?? $acceptedAt)->copy()->addMinutes(30 + ($shipment->shipment_id % 90));
            }

            $rows[] = [
                'shipment_id' => $shipment->shipment_id,
                'assignment_type' => 'PICKUP',
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => $pickupDriver->driver_id,
                'status' => $pickupCompletedAt ? 'COMPLETED' : ($pickupStartedAt ? 'IN_PROGRESS' : 'ASSIGNED'),
                'assigned_by_type' => 'SYSTEM',
                'assigned_by' => 1,
                'assigned_at' => $assignedAt,
                'accepted_at' => $acceptedAt,
                'started_at' => $pickupStartedAt,
                'completed_at' => $pickupCompletedAt,
                'cancelled_at' => null,
                'eta_at' => null,
                'distance_km' => (float) (5 + ($shipment->shipment_id % 46)),
                'note' => null,
                'is_active' => $pickupCompletedAt ? 0 : 1,
                'created_at' => $assignedAt,
                'updated_at' => $assignedAt,
            ];
            $processed++;

            if (in_array($shipment->shipment_status, [
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $deliveryDriver = $branchDrivers->isEmpty() ? $drivers->random() : $branchDrivers->random();

                $deliveryAssignedAt = ($pickupCompletedAt ?? $createdAt)->copy()->addDays(1 + ($shipment->shipment_id % 3));
                $deliveryAcceptedAt = $deliveryAssignedAt->copy()->addMinutes(10 + ($shipment->shipment_id % 50));
                $deliveryStartedAt = $deliveryAcceptedAt->copy()->addMinutes(30 + ($shipment->shipment_id % 90));

                $deliveryCompletedAt = null;
                if (in_array($shipment->shipment_status, ['DELIVERED_SUCCESS', 'CLOSED'], true)) {
                    $deliveryCompletedAt = $deliveryStartedAt->copy()->addMinutes(30 + ($shipment->shipment_id % 150));
                }

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'assignment_type' => 'DELIVERY',
                    'branch_id' => $shipment->assigned_branch_id,
                    'driver_id' => $deliveryDriver->driver_id,
                    'status' => $deliveryCompletedAt ? 'COMPLETED' : 'IN_PROGRESS',
                    'assigned_by_type' => 'SYSTEM',
                    'assigned_by' => 1,
                    'assigned_at' => $deliveryAssignedAt,
                    'accepted_at' => $deliveryAcceptedAt,
                    'started_at' => $deliveryStartedAt,
                    'completed_at' => $deliveryCompletedAt,
                    'cancelled_at' => null,
                    'eta_at' => $deliveryStartedAt->copy()->addHours(2),
                    'distance_km' => (float) (10 + ($shipment->shipment_id % 91)),
                    'note' => null,
                    'is_active' => $deliveryCompletedAt ? 0 : 1,
                    'created_at' => $deliveryAssignedAt,
                    'updated_at' => $deliveryAssignedAt,
                ];
                $processed++;
            }

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} driver assignments...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        $this->command->info("✅ Upserted {$processed} driver assignments");
    }

    private function flushUpsert(array $rows): void
    {
        // Natural key: (shipment_id, assignment_type)
        // Assumption: only one PICKUP and one DELIVERY assignment per shipment in this demo.
        DB::table('driver_assignment')->upsert(
            $rows,
            ['shipment_id', 'assignment_type'],
            [
                'branch_id',
                'driver_id',
                'status',
                'assigned_by_type',
                'assigned_by',
                'assigned_at',
                'accepted_at',
                'started_at',
                'completed_at',
                'cancelled_at',
                'eta_at',
                'distance_km',
                'note',
                'is_active',
                'updated_at',
            ]
        );
    }
}
