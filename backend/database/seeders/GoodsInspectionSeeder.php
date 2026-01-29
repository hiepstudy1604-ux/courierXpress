<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\DriverAssignment;
use App\Models\GoodsInspection;
use App\Models\GoodsEvidenceMedia;
use Illuminate\Database\Seeder;

class GoodsInspectionSeeder extends Seeder
{
    public function run(): void
    {
        $assignments = DriverAssignment::where('assignment_type', 'PICKUP')
            ->where('status', 'ASSIGNED')
            ->get()
            ->take(1);

        $count = 0;
        foreach ($assignments as $assignment) {
            $shipment = $assignment->shipment;
            if (!$shipment) continue;

            $inspection = GoodsInspection::create([
                'shipment_id' => $shipment->shipment_id,
                'assignment_id' => $assignment->assignment_id,
                'driver_id' => $assignment->driver_id,
                'branch_id' => $assignment->branch_id,
                'inspected_at' => now()->subHours(1),
                'actual_weight_kg' => $shipment->total_weight_kg + 0.5, // Slightly different
                'actual_length_cm' => $shipment->parcel_length_cm,
                'actual_width_cm' => $shipment->parcel_width_cm,
                'actual_height_cm' => $shipment->parcel_height_cm,
                'actual_volume_m3' => $shipment->total_volume_m3,
                'packaging_condition' => 'NORMAL',
                'note' => 'Goods inspection completed',
            ]);

            // Create evidence media
            GoodsEvidenceMedia::create([
                'shipment_id' => $shipment->shipment_id,
                'inspection_id' => $inspection->inspection_id,
                'assignment_id' => $assignment->assignment_id,
                'driver_id' => $assignment->driver_id,
                'branch_id' => $assignment->branch_id,
                'media_type' => 'GOODS_PHOTO',
                'media_url' => '/uploads/goods/' . $shipment->shipment_id . '_photo1.jpg',
                'captured_at' => $inspection->inspected_at,
                'note' => 'Goods photo',
            ]);

            $shipment->update(['shipment_status' => 'VERIFIED_ITEM']);
            $count++;
        }

        $this->command->info("✅ Created {$count} goods inspections");
    }
}
