<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveGoodsInspectionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding goods inspections...');

        $statuses = [
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

        $rows = [];
        $batchSize = 300;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $pickupAssignment = $shipment->pickupAssignment;
            $driverId = $pickupAssignment ? $pickupAssignment->driver_id : null;
            $assignmentId = $pickupAssignment ? $pickupAssignment->assignment_id : null;

            $completedAt = Carbon::parse($shipment->created_at);
            if ($pickupAssignment && $pickupAssignment->completed_at) {
                $completedAt = Carbon::parse($pickupAssignment->completed_at);
            }

            // Deterministic inspected_at
            $inspectedAt = $completedAt->copy()->addMinutes(5 + ($shipment->shipment_id % 25));

            $estimatedWeight = (float) $shipment->total_weight_kg;
            $actualWeight = SeedHelper::calculateActualWeight($estimatedWeight);

            $actualLength = $shipment->parcel_length_cm
                ? round(((float) $shipment->parcel_length_cm) * (1 + ((($shipment->shipment_id % 16) - 5) / 100)), 2)
                : null;
            $actualWidth = $shipment->parcel_width_cm
                ? round(((float) $shipment->parcel_width_cm) * (1 + ((($shipment->shipment_id % 16) - 5) / 100)), 2)
                : null;
            $actualHeight = $shipment->parcel_height_cm
                ? round(((float) $shipment->parcel_height_cm) * (1 + ((($shipment->shipment_id % 16) - 5) / 100)), 2)
                : null;

            $actualVolume = null;
            if ($actualLength && $actualWidth && $actualHeight) {
                $actualVolume = round(($actualLength * $actualWidth * $actualHeight) / 1000000, 3);
            }

            $packagingConditions = ['GOOD', 'FAIR', 'DAMAGED'];
            $packagingCondition = $packagingConditions[$shipment->shipment_id % count($packagingConditions)];

            $rows[] = [
                'shipment_id' => $shipment->shipment_id,
                'assignment_id' => $assignmentId,
                'driver_id' => $driverId,
                'branch_id' => $shipment->assigned_branch_id,
                'inspected_at' => $inspectedAt,
                'actual_weight_kg' => $actualWeight,
                'actual_length_cm' => $actualLength,
                'actual_width_cm' => $actualWidth,
                'actual_height_cm' => $actualHeight,
                'actual_volume_m3' => $actualVolume,
                'packaging_condition' => $packagingCondition,
                'special_handling_flags' => $packagingCondition === 'DAMAGED' ? 'HANDLE_WITH_CARE' : null,
                'note' => $actualWeight > $estimatedWeight * 1.2 ? 'Weight exceeds estimate' : null,
                'created_at' => $inspectedAt,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} goods inspections...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        $this->command->info("✅ Upserted {$processed} goods inspections");
    }

    private function flushUpsert(array $rows): void
    {
        // Natural key: shipment_id (1 inspection per shipment in this demo)
        DB::table('goods_inspection')->upsert(
            $rows,
            ['shipment_id'],
            [
                'assignment_id',
                'driver_id',
                'branch_id',
                'inspected_at',
                'actual_weight_kg',
                'actual_length_cm',
                'actual_width_cm',
                'actual_height_cm',
                'actual_volume_m3',
                'packaging_condition',
                'special_handling_flags',
                'note',
            ]
        );
    }
}
