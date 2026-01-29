<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill branch_vehicles.quantity from branches fleet columns.
        // Mapping (confirmed):
        // - branches.motorbike  -> vehicles.vehicle_type = 'Motorbike'
        // - branches.truck_2t   -> vehicles.vehicle_type = '2.5-ton Truck'
        // - branches.truck_3_5t -> vehicles.vehicle_type = '3.5-ton Truck'
        // - branches.truck_5t   -> vehicles.vehicle_type = '5-ton Truck'

        $vehicleTypes = [
            'Motorbike',
            '2.5-ton Truck',
            '3.5-ton Truck',
            '5-ton Truck',
        ];

        $vehicleIdsByType = DB::table('vehicles')
            ->whereIn('vehicle_type', $vehicleTypes)
            ->pluck('vehicle_id', 'vehicle_type');

        // If vehicles aren't seeded yet, do nothing.
        if ($vehicleIdsByType->count() === 0) {
            return;
        }

        $branches = DB::table('branches')->select(['id', 'motorbike', 'truck_2t', 'truck_3_5t', 'truck_5t'])->get();

        $now = now();

        foreach ($branches as $branch) {
            $rows = [];

            $mapping = [
                'Motorbike' => (int) ($branch->motorbike ?? 0),
                '2.5-ton Truck' => (int) ($branch->truck_2t ?? 0),
                '3.5-ton Truck' => (int) ($branch->truck_3_5t ?? 0),
                '5-ton Truck' => (int) ($branch->truck_5t ?? 0),
            ];

            foreach ($mapping as $vehicleType => $qty) {
                if (!$vehicleIdsByType->has($vehicleType)) {
                    continue;
                }

                $rows[] = [
                    'branch_id' => $branch->id,
                    'vehicle_id' => $vehicleIdsByType[$vehicleType],
                    'quantity' => $qty,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($rows)) {
                // Idempotent upsert (primary key: branch_id + vehicle_id)
                DB::table('branch_vehicles')->upsert(
                    $rows,
                    ['branch_id', 'vehicle_id'],
                    ['quantity', 'updated_at']
                );
            }
        }
    }

    public function down(): void
    {
        // No-op: This is a one-way data backfill.
    }
};
