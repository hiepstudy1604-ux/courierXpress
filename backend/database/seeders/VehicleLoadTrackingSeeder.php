<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use App\Models\VehicleLoadTracking;
use Illuminate\Database\Seeder;

class VehicleLoadTrackingSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();
        $count = 0;

        foreach ($vehicles as $vehicle) {
            VehicleLoadTracking::firstOrCreate(
                ['vehicle_id' => $vehicle->vehicle_id],
                [
                    'current_load_kg' => 0,
                    'current_volume_m3' => 0,
                    'current_order_count' => 0,
                ]
            );
            $count++;
        }

        $this->command->info("✅ Created {$count} vehicle load tracking records");
    }
}
