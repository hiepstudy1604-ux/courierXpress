<?php

namespace Database\Seeders;

use App\Models\DriverAssignment;
use App\Models\CallLog;
use App\Models\Shipment;
use Illuminate\Database\Seeder;

class CallLogSeeder extends Seeder
{
    public function run(): void
    {
        $assignments = DriverAssignment::where('assignment_type', 'PICKUP')
            ->where('status', 'ASSIGNED')
            ->get()
            ->take(2); // Only create for first 2 assignments

        $count = 0;
        foreach ($assignments as $assignment) {
            $shipment = $assignment->shipment;
            if (!$shipment) continue;

            // Create 2-3 call attempts
            for ($i = 1; $i <= 3; $i++) {
                CallLog::create([
                    'shipment_id' => $shipment->shipment_id,
                    'assignment_id' => $assignment->assignment_id,
                    'call_type' => 'OUTBOUND',
                    'target_role' => 'SENDER',
                    'target_phone' => $shipment->sender_phone,
                    'driver_id' => $assignment->driver_id,
                    'branch_id' => $assignment->branch_id,
                    'attempt_no' => $i,
                    'call_started_at' => now()->subMinutes(30 - ($i * 5)),
                    'call_ended_at' => now()->subMinutes(30 - ($i * 5))->addSeconds(30),
                    'call_result' => $i < 3 ? 'NO_ANSWER' : 'FAILED',
                    'duration_seconds' => 30,
                    'note' => "Call attempt {$i}",
                ]);
                $count++;
            }

            // Update assignment and shipment status if all calls failed
            if ($count >= 3) {
                $assignment->update(['status' => 'FAILED']);
                $shipment->update(['shipment_status' => 'PICKUP_RESCHEDULED']);
                $assignment->driver->update(['driver_status' => 'AVAILABLE']);
            }
        }

        $this->command->info("✅ Created {$count} call logs");
    }
}
