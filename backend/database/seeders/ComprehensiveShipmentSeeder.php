<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveShipmentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Starting comprehensive shipment seeding...');

        $branches = Branch::all();
        $vehicles = Vehicle::all();
        $customers = User::where('role', 'CUSTOMER')->get();

        if ($branches->isEmpty() || $vehicles->isEmpty()) {
            $this->command->warn('⚠️  No branches or vehicles found. Please run BranchSeeder and VehicleSeeder first.');
            return;
        }

        if ($customers->isEmpty()) {
            $this->command->warn('⚠️  No customers found. Creating sample customers...');
            $customers = $this->createSampleCustomers();
        }

        $availableProvinces = DB::table('province_master')->pluck('province_code')->toArray();
        if (empty($availableProvinces)) {
            $this->command->warn('⚠️  No provinces found. Please run ProvinceMasterSeeder first.');
            return;
        }

        $daysBack = 90;
        $startDate = Carbon::now()->subDays($daysBack);

        // Keep distribution roughly matching existing UI tabs and downstream modules
        $statusDistribution = [
            'BOOKED' => 120,
            'PRICE_ESTIMATED' => 140,
            'BRANCH_ASSIGNED' => 80,
            'PICKUP_SCHEDULED' => 70,
            'PICKUP_RESCHEDULED' => 30,
            'ON_THE_WAY_PICKUP' => 50,
            'VERIFIED_ITEM' => 180,
            'ADJUST_ITEM' => 40,
            'CONFIRMED_PRICE' => 160,
            'ADJUSTED_PRICE' => 30,
            'PENDING_PAYMENT' => 120,
            'CONFIRM_PAYMENT' => 160,
            'PICKUP_COMPLETED' => 200,
            'IN_ORIGIN_WAREHOUSE' => 140,
            'IN_TRANSIT' => 120,
            'IN_DEST_WAREHOUSE' => 100,
            'OUT_FOR_DELIVERY' => 90,
            'DELIVERY_FAILED' => 30,
            'DELIVERED_SUCCESS' => 400,
            'CLOSED' => 380,
            'RETURN_CREATED' => 25,
            'RETURN_IN_TRANSIT' => 20,
            'RETURNED_TO_ORIGIN' => 15,
            'RETURN_COMPLETED' => 10,
        ];

        // Use a deterministic tracking_id range so re-seeding is idempotent via upsert.
        $trackingStart = 100000;
        $trackingSeq = 0;

        $rows = [];
        $batchSize = 200;
        $processed = 0;

        foreach ($statusDistribution as $targetStatus => $count) {
            for ($i = 0; $i < $count; $i++) {
                $trackingSeq++;

                $randomDays = rand(0, $daysBack);
                $createdAt = $startDate->copy()->addDays($randomDays)->addHours(rand(0, 23))->addMinutes(rand(0, 59));

                $senderProvince = $availableProvinces[array_rand($availableProvinces)];
                $receiverProvince = $availableProvinces[array_rand($availableProvinces)];

                while ($senderProvince === $receiverProvince && rand(0, 100) < 70) {
                    $receiverProvince = $availableProvinces[array_rand($availableProvinces)];
                }

                $branch = $branches->where('province_code', $senderProvince)->first() ?? $branches->random();
                $vehicle = $vehicles->random();
                $customer = $customers->random();

                $goodsType = SeedHelper::randomGoodsType();
                $serviceType = rand(0, 100) < 20 ? 'EXPRESS' : 'STANDARD';

                $estimatedWeight = round(rand(100, 5000) / 100, 2);
                $routeScope = SeedHelper::randomRouteScope($senderProvince, $receiverProvince);

                // Stable key (unique)
                $trackingId = 'CX-' . str_pad((string) ($trackingStart + $trackingSeq), 10, '0', STR_PAD_LEFT);

                $rows[] = [
                    'tracking_id' => $trackingId,
                    'user_id' => $customer->id,
                    'sender_address_text' => SeedHelper::randomVietnameseAddress($senderProvince),
                    'sender_name' => SeedHelper::randomVietnameseName(),
                    'sender_phone' => SeedHelper::randomVietnamesePhone(),
                    'sender_province_code' => $senderProvince,
                    'receiver_address_text' => SeedHelper::randomVietnameseAddress($receiverProvince),
                    'receiver_name' => SeedHelper::randomVietnameseName(),
                    'receiver_phone' => SeedHelper::randomVietnamesePhone(),
                    'receiver_province_code' => $receiverProvince,
                    'service_type' => $serviceType,
                    'goods_type' => $goodsType,
                    'declared_value' => rand(50000, 5000000),
                    'total_weight_kg' => $estimatedWeight,
                    'total_volume_m3' => round($estimatedWeight * 0.001, 3),
                    'parcel_length_cm' => rand(10, 100),
                    'parcel_width_cm' => rand(10, 80),
                    'parcel_height_cm' => rand(5, 60),
                    'route_scope' => $routeScope,
                    'assigned_branch_id' => $branch->id,
                    'assigned_vehicle_id' => $vehicle->vehicle_id,
                    'shipment_status' => $targetStatus,
                    'assigned_by' => 1,
                    'assigned_at' => $createdAt->copy()->addMinutes(rand(5, 30)),
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];

                $processed++;

                if (count($rows) >= $batchSize) {
                    DB::table('shipments')->upsert(
                        $rows,
                        ['tracking_id'],
                        [
                            'user_id',
                            'sender_address_text',
                            'sender_name',
                            'sender_phone',
                            'sender_province_code',
                            'receiver_address_text',
                            'receiver_name',
                            'receiver_phone',
                            'receiver_province_code',
                            'service_type',
                            'goods_type',
                            'declared_value',
                            'total_weight_kg',
                            'total_volume_m3',
                            'parcel_length_cm',
                            'parcel_width_cm',
                            'parcel_height_cm',
                            'route_scope',
                            'assigned_branch_id',
                            'assigned_vehicle_id',
                            'shipment_status',
                            'assigned_by',
                            'assigned_at',
                            'updated_at',
                        ]
                    );
                    $rows = [];
                    $this->command->info("   Upserted {$processed} shipments...");
                }
            }
        }

        if (!empty($rows)) {
            DB::table('shipments')->upsert(
                $rows,
                ['tracking_id'],
                [
                    'user_id',
                    'sender_address_text',
                    'sender_name',
                    'sender_phone',
                    'sender_province_code',
                    'receiver_address_text',
                    'receiver_name',
                    'receiver_phone',
                    'receiver_province_code',
                    'service_type',
                    'goods_type',
                    'declared_value',
                    'total_weight_kg',
                    'total_volume_m3',
                    'parcel_length_cm',
                    'parcel_width_cm',
                    'parcel_height_cm',
                    'route_scope',
                    'assigned_branch_id',
                    'assigned_vehicle_id',
                    'shipment_status',
                    'assigned_by',
                    'assigned_at',
                    'updated_at',
                ]
            );
        }

        $this->command->info("✅ Upserted {$processed} shipments");

        $statusCounts = DB::table('shipments')
            ->select('shipment_status', DB::raw('count(*) as count'))
            ->groupBy('shipment_status')
            ->orderBy('count', 'desc')
            ->get();

        $this->command->info("\n📊 Shipment Status Distribution:");
        foreach ($statusCounts as $stat) {
            $this->command->info("   {$stat->shipment_status}: {$stat->count}");
        }
    }

    private function createSampleCustomers(): \Illuminate\Support\Collection
    {
        $customers = collect();

        for ($i = 1; $i <= 50; $i++) {
            $customer = User::firstOrCreate(
                ['email' => 'customer' . $i . '@example.com'],
                [
                    'name' => SeedHelper::randomVietnameseName(),
                    'password' => bcrypt('password'),
                    'phone' => SeedHelper::randomVietnamesePhone(),
                    'address' => SeedHelper::randomVietnameseAddress('HN'),
                    'city' => 'Hà Nội',
                    'role' => 'CUSTOMER',
                    'status' => 'ACTIVE',
                ]
            );
            $customers->push($customer);
        }

        return $customers;
    }
}
