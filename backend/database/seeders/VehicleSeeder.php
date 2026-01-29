<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = [
            [
                'vehicle_code' => 'MOTORBIKE-001',
                'vehicle_type' => 'Motorbike',
                'max_load_kg' => 50.00,
                'max_length_cm' => 100.00,
                'max_width_cm' => 50.00,
                'max_height_cm' => 50.00,
                'max_volume_m3' => 0.250,
                'route_scope' => 'INTRA_PROVINCE',
                'is_active' => true,
            ],
            [
                'vehicle_code' => 'TRUCK-2.5T-001',
                'vehicle_type' => '2.5-ton Truck',
                'max_load_kg' => 2500.00,
                'max_length_cm' => 600.00,
                'max_width_cm' => 240.00,
                'max_height_cm' => 240.00,
                'max_volume_m3' => 34.56,
                'route_scope' => 'INTER_REGION_NEAR',
                'is_active' => true,
            ],
            [
                'vehicle_code' => 'TRUCK-3.5T-001',
                'vehicle_type' => '3.5-ton Truck',
                'max_load_kg' => 3500.00,
                'max_length_cm' => 700.00,
                'max_width_cm' => 240.00,
                'max_height_cm' => 240.00,
                'max_volume_m3' => 40.32,
                'route_scope' => 'INTER_REGION_FAR',
                'is_active' => true,
            ],
            [
                'vehicle_code' => 'TRUCK-5T-001',
                'vehicle_type' => '5-ton Truck',
                'max_load_kg' => 5000.00,
                'max_length_cm' => 800.00,
                'max_width_cm' => 240.00,
                'max_height_cm' => 240.00,
                'max_volume_m3' => 46.08,
                'route_scope' => 'INTER_REGION_FAR',
                'is_active' => true,
            ],
        ];

        foreach ($vehicles as $vehicle) {
            Vehicle::firstOrCreate(
                ['vehicle_code' => $vehicle['vehicle_code']],
                $vehicle
            );
        }

        $this->command->info('✅ Created ' . count($vehicles) . ' vehicles');
    }
}
