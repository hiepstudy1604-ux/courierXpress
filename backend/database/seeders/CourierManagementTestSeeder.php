<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\Branch;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\PickupSchedule;
use App\Models\DriverAssignment;
use App\Models\GoodsInspection;
use App\Models\PaymentIntent;
use App\Models\WarehouseScan;
use App\Models\TransitManifest;
use App\Models\ReturnOrder;
use App\Models\AdminTask;
use Illuminate\Database\Seeder;

class CourierManagementTestSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();
        $vehicles = Vehicle::all();
        $drivers = Driver::all();

        if ($branches->isEmpty() || $vehicles->isEmpty() || $drivers->isEmpty()) {
            $this->command->warn('Insufficient data for test seeder. Please run other seeders first.');
            return;
        }

        $branchHN = $branches->where('branch_code', 'HN')->first();
        $branchHCM = $branches->where('branch_code', 'HCM')->first();
        $branchDN = $branches->where('branch_code', 'DN')->first();

        $vehicleMotorbike = $vehicles->where('vehicle_type', 'Motorbike')->first();
        $vehicleTruck = $vehicles->where('vehicle_type', '2.5-ton Truck')->first();

        $driverMotorbike = $drivers->where('vehicle_type', 'Motorbike')->first();
        $driverTruck = $drivers->where('vehicle_type', 'like', '%Truck%')->first();

        // Create test shipments for different statuses
        $testShipments = [];

        // BRANCH_ASSIGNED (PENDING tab)
        for ($i = 1; $i <= 3; $i++) {
            $testShipments[] = [
                'sender_address_text' => "Test Address {$i}, Hà Nội",
                'sender_name' => "Nguyễn Văn Test {$i}",
                'sender_phone' => "0901000{$i}00",
                'sender_province_code' => 'HN',
                'receiver_address_text' => "Test Address {$i}, TP.HCM",
                'receiver_name' => "Trần Thị Test {$i}",
                'receiver_phone' => "0902000{$i}00",
                'receiver_province_code' => 'HCM',
                'service_type' => 'Standard',
                'goods_type' => 'CLOTHING',
                'declared_value' => 500000.00,
                'total_weight_kg' => 2.0 + $i,
                'total_volume_m3' => 0.010 + ($i * 0.001),
                'parcel_length_cm' => 30,
                'parcel_width_cm' => 25,
                'parcel_height_cm' => 15,
                'route_scope' => 'INTER_REGION_FAR',
                'assigned_branch_id' => $branchHN?->id,
                'assigned_vehicle_id' => $vehicleTruck?->vehicle_id,
                'shipment_status' => 'BRANCH_ASSIGNED',
                'assigned_at' => now()->subDays($i),
            ];
        }

        // PICKUP_SCHEDULED (PICKUP tab)
        for ($i = 1; $i <= 2; $i++) {
            $shipment = Shipment::create([
                'sender_address_text' => "Pickup Address {$i}, Hà Nội",
                'sender_name' => "Lê Văn Pickup {$i}",
                'sender_phone' => "0901001{$i}00",
                'sender_province_code' => 'HN',
                'receiver_address_text' => "Pickup Address {$i}, TP.HCM",
                'receiver_name' => "Phạm Thị Pickup {$i}",
                'receiver_phone' => "0902001{$i}00",
                'receiver_province_code' => 'HCM',
                'service_type' => 'Standard',
                'goods_type' => 'ELECTRONICS',
                'declared_value' => 1000000.00,
                'total_weight_kg' => 3.0,
                'total_volume_m3' => 0.015,
                'parcel_length_cm' => 40,
                'parcel_width_cm' => 30,
                'parcel_height_cm' => 20,
                'route_scope' => 'INTER_REGION_FAR',
                'assigned_branch_id' => $branchHN?->id,
                'assigned_vehicle_id' => $vehicleTruck?->vehicle_id,
                'shipment_status' => 'PICKUP_SCHEDULED',
                'assigned_at' => now()->subDays($i),
            ]);

            PickupSchedule::create([
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $branchHN?->id,
                'scheduled_start_at' => now()->addHours(2),
                'scheduled_end_at' => now()->addHours(3),
                'confirmed_at' => now(),
                'confirmed_by' => 1,
                'confirm_method' => 'AGENT',
                'status' => 'SCHEDULED',
            ]);
        }

        // DELIVERED_SUCCESS (for bills)
        for ($i = 1; $i <= 2; $i++) {
            $shipment = Shipment::create([
                'sender_address_text' => "Delivered Address {$i}, Hà Nội",
                'sender_name' => "Hoàng Văn Delivered {$i}",
                'sender_phone' => "0901002{$i}00",
                'sender_province_code' => 'HN',
                'receiver_address_text' => "Delivered Address {$i}, TP.HCM",
                'receiver_name' => "Vũ Thị Delivered {$i}",
                'receiver_phone' => "0902002{$i}00",
                'receiver_province_code' => 'HCM',
                'service_type' => 'Standard',
                'goods_type' => 'CLOTHING',
                'declared_value' => 800000.00,
                'total_weight_kg' => 2.5,
                'total_volume_m3' => 0.012,
                'parcel_length_cm' => 35,
                'parcel_width_cm' => 30,
                'parcel_height_cm' => 15,
                'route_scope' => 'INTER_REGION_FAR',
                'assigned_branch_id' => $branchHCM?->id,
                'assigned_vehicle_id' => $vehicleTruck?->vehicle_id,
                'shipment_status' => 'DELIVERED_SUCCESS',
                'assigned_at' => now()->subDays(3 + $i),
            ]);

            PaymentIntent::create([
                'shipment_id' => $shipment->shipment_id,
                'currency' => 'VND',
                'method' => 'ONLINE',
                'provider' => 'VNPAY',
                'status' => 'CONFIRMED',
                'amount' => 120000.00,
                'amount_paid' => 120000.00,
                'payer_role' => 'SENDER',
                'confirmed_at' => now()->subDays(2),
            ]);
        }

        // Create all BRANCH_ASSIGNED shipments
        foreach ($testShipments as $shipmentData) {
            Shipment::create($shipmentData);
        }

        $this->command->info('✅ Created test shipments for CourierManagement tabs');
    }
}
