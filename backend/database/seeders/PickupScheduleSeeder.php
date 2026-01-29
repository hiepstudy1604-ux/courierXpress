<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\PickupSchedule;
use App\Models\PickupScheduleHistory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PickupScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::where('shipment_status', 'BRANCH_ASSIGNED')
            ->whereDoesntHave('pickupSchedule')
            ->get();

        $count = 0;
        foreach ($shipments as $shipment) {
            $schedule = PickupSchedule::create([
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'scheduled_start_at' => now()->addHours(2),
                'scheduled_end_at' => now()->addHours(3),
                'confirmed_at' => now(),
                'confirmed_by' => 1, // Admin
                'confirm_method' => 'AGENT',
                'timezone' => 'Asia/Ho_Chi_Minh',
                'status' => 'SCHEDULED',
                'customer_note' => 'Vui lòng gọi trước 5 phút',
                'internal_note' => 'Initial pickup schedule',
            ]);

            // Create history record
            PickupScheduleHistory::create([
                'pickup_schedule_id' => $schedule->pickup_schedule_id,
                'shipment_id' => $shipment->shipment_id,
                'old_start_at' => null,
                'old_end_at' => null,
                'new_start_at' => $schedule->scheduled_start_at,
                'new_end_at' => $schedule->scheduled_end_at,
                'change_reason' => 'CONFIRM',
                'changed_by' => 1,
                'changed_at' => now(),
                'note' => 'Initial pickup schedule confirmed',
            ]);

            // Update shipment status
            $shipment->update(['shipment_status' => 'PICKUP_SCHEDULED']);
            $count++;
        }

        $this->command->info("✅ Created {$count} pickup schedules");
    }
}
