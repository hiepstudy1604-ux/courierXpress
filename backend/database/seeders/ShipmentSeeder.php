<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\Branch;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class ShipmentSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();
        $vehicles = Vehicle::all();
        
        if ($branches->isEmpty() || $vehicles->isEmpty()) {
            $this->command->warn('No branches or vehicles found. Please run BranchSeeder and VehicleSeeder first.');
            return;
        }

        $branchHN = $branches->where('branch_code', 'HN')->first();
        $branchHCM = $branches->where('branch_code', 'HCM')->first();
        $vehicleMotorbike = $vehicles->where('vehicle_type', 'Motorbike')->first();
        $vehicleTruck = $vehicles->where('vehicle_type', '2.5-ton Truck')->first();

        $shipments = [
            [
                'sender_address_text' => '123 Phố Hàng Bông, Hoàn Kiếm, Hà Nội',
                'sender_name' => 'Nguyễn Văn A',
                'sender_phone' => '0901000001',
                'sender_province_code' => 'HN',
                'receiver_address_text' => '456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
                'receiver_name' => 'Trần Thị B',
                'receiver_phone' => '0902000001',
                'receiver_province_code' => 'HCM',
                'service_type' => 'Standard',
                'goods_type' => 'CLOTHING',
                'declared_value' => 500000.00,
                'total_weight_kg' => 2.5,
                'total_volume_m3' => 0.012,
                'parcel_length_cm' => 30,
                'parcel_width_cm' => 25,
                'parcel_height_cm' => 15,
                'route_scope' => 'INTER_REGION_FAR',
                'assigned_branch_id' => $branchHN?->id,
                'assigned_vehicle_id' => $vehicleTruck?->vehicle_id,
                'shipment_status' => 'BRANCH_ASSIGNED',
                'assigned_at' => now()->subDays(1),
            ],
            [
                'sender_address_text' => '789 Lê Duẩn, Hải Châu, Đà Nẵng',
                'sender_name' => 'Lê Văn C',
                'sender_phone' => '0903000001',
                'sender_province_code' => 'DN',
                'receiver_address_text' => '123 Phố Hàng Bông, Hoàn Kiếm, Hà Nội',
                'receiver_name' => 'Nguyễn Thị D',
                'receiver_phone' => '0901000002',
                'receiver_province_code' => 'HN',
                'service_type' => 'Express',
                'goods_type' => 'ELECTRONICS',
                'declared_value' => 2000000.00,
                'total_weight_kg' => 5.0,
                'total_volume_m3' => 0.025,
                'parcel_length_cm' => 50,
                'parcel_width_cm' => 40,
                'parcel_height_cm' => 25,
                'route_scope' => 'INTER_REGION_FAR',
                'assigned_branch_id' => $branchHN?->id,
                'assigned_vehicle_id' => $vehicleTruck?->vehicle_id,
                'shipment_status' => 'BRANCH_ASSIGNED',
                'assigned_at' => now()->subDays(2),
            ],
        ];

        $count = 0;
        foreach ($shipments as $shipment) {
            Shipment::create($shipment);
            $count++;
        }

        $this->command->info("✅ Created {$count} shipments");
    }
}
