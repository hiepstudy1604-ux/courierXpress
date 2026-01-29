<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensivePickupScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding pickup schedules...');

        $statuses = [
            'PICKUP_SCHEDULED',
            'ON_THE_WAY_PICKUP',
            'PICKUP_RESCHEDULED',
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
            'CLOSED',
        ];

        $shipments = Shipment::whereIn('shipment_status', $statuses)->get();

        $rows = [];
        $batchSize = 300;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);

            // Deterministic schedule window per shipment (stable across re-seed)
            // Use shipment_id to create consistent offsets.
            $offsetDays = ($shipment->shipment_id % 3) + 1; // 1..3
            $startHour = 8 + ($shipment->shipment_id % 10); // 8..17

            $scheduledStart = $createdAt->copy()->addDays($offsetDays)->setTime($startHour, ($shipment->shipment_id % 60), 0);
            $scheduledEnd = $scheduledStart->copy()->addHours(2 + ($shipment->shipment_id % 3)); // 2..4

            $confirmedAt = null;
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
                $confirmedAt = $scheduledStart->copy()->addMinutes(30 + ($shipment->shipment_id % 90));
            }

            $rows[] = [
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'scheduled_start_at' => $scheduledStart,
                'scheduled_end_at' => $scheduledEnd,
                'confirmed_at' => $confirmedAt,
                'confirmed_by' => $confirmedAt ? 1 : null,
                'confirm_method' => 'AGENT',
                'timezone' => 'Asia/Ho_Chi_Minh',
                'status' => $confirmedAt ? 'CONFIRMED' : 'SCHEDULED',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} pickup schedules...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        $this->command->info("✅ Upserted {$processed} pickup schedules");
    }

    private function flushUpsert(array $rows): void
    {
        // Natural key: shipment_id (1 schedule per shipment in this model)
        DB::table('pickup_schedule')->upsert(
            $rows,
            ['shipment_id'],
            [
                'branch_id',
                'scheduled_start_at',
                'scheduled_end_at',
                'confirmed_at',
                'confirmed_by',
                'confirm_method',
                'timezone',
                'status',
                'updated_at',
            ]
        );
    }
}
