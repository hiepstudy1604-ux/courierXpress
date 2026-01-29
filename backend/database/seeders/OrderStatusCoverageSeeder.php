<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Shipment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OrderStatusCoverageSeeder extends Seeder
{
    /**
     * Seed at least one shipment for every ORDER_STATUS value.
     *
     * Run: php artisan db:seed --class=OrderStatusCoverageSeeder
     */
    public function run(): void
    {
        $this->command->info('🌱 Seeding coverage shipments for all ORDER_STATUS values...');

        // Ensure we have a customer
        $customer = User::where('role', 'CUSTOMER')->first();
        if (!$customer) {
            $customer = User::create([
                'name' => 'Coverage Customer',
                'email' => 'coverage_customer@example.com',
                'password' => bcrypt('password'),
                'role' => 'CUSTOMER',
                'status' => 'ACTIVE',
                'phone' => '0900000000',
                'address' => '123 Test St',
                'city' => 'Hanoi',
            ]);
        }

        // Choose a branch if available
        $branch = Branch::first();
        $branchId = $branch?->id;
        $senderProvince = $branch->province_code ?? 'HN';
        $receiverProvince = $senderProvince === 'HN' ? 'HCM' : 'HN';

        $statuses = [
            'BOOKED',
            'PRICE_ESTIMATED',
            'BRANCH_ASSIGNED',
            'PICKUP_SCHEDULED',
            'PICKUP_RESCHEDULED',
            'ON_THE_WAY_PICKUP',
            'VERIFIED_ITEM',
            'ADJUST_ITEM',
            'CONFIRMED_PRICE',
            'ADJUSTED_PRICE',
            'PENDING_PAYMENT',
            'CONFIRM_PAYMENT',
            'PICKUP_COMPLETED',
            'IN_ORIGIN_WAREHOUSE',
            'IN_TRANSIT',
            'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED',
            'DELIVERED_SUCCESS',
            'RETURN_CREATED',
            'RETURN_IN_TRANSIT',
            'RETURNED_TO_ORIGIN',
            'RETURN_COMPLETED',
            'DISPOSED',
            'CLOSED',
        ];

        $now = Carbon::now();
        $createdCount = 0;

        foreach ($statuses as $i => $status) {
            $createdAt = $now->copy()->subMinutes($i + 1);
            $shipment = Shipment::create([
                'user_id' => $customer->id,
                'sender_address_text' => "Sender address {$i}",
                'sender_name' => 'Sender Demo',
                'sender_phone' => '0901234567',
                'sender_province_code' => $senderProvince,
                'receiver_address_text' => "Receiver address {$i}",
                'receiver_name' => 'Receiver Demo',
                'receiver_phone' => '0912345678',
                'receiver_province_code' => $receiverProvince,
                'service_type' => 'STANDARD',
                'goods_type' => 'PARCEL',
                'declared_value' => 100000,
                'total_weight_kg' => 1.5,
                'total_volume_m3' => 0.01,
                'parcel_length_cm' => 20,
                'parcel_width_cm' => 15,
                'parcel_height_cm' => 10,
                'route_scope' => 'INTRA_REGION',
                'assigned_branch_id' => $branchId,
                'assigned_vehicle_id' => null,
                'shipment_status' => $status,
                'assigned_by' => null,
                'assigned_at' => $branchId ? $createdAt : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $createdCount++;
        }

        $this->command->info("✅ Seeded {$createdCount} coverage shipments (one per status).");
    }
}
