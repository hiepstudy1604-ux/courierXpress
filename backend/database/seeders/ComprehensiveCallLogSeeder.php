<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveCallLogSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding call logs...');

        $shipments = Shipment::where('shipment_status', 'PICKUP_RESCHEDULED')->get();

        $rows = [];
        $batchSize = 500;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);

            // Deterministic number of attempts: 1..3
            $attempts = ($shipment->shipment_id % 3) + 1;

            for ($i = 1; $i <= $attempts; $i++) {
                $callStartedAt = $createdAt->copy()->addHours($i * 2)->addMinutes($shipment->shipment_id % 60);

                $results = ['NO_ANSWER', 'BUSY', 'VOICEMAIL', 'WRONG_NUMBER', 'ANSWERED'];
                $result = $results[($shipment->shipment_id + $i) % count($results)];

                $durationSeconds = $result === 'ANSWERED' ? (30 + (($shipment->shipment_id + $i) % 271)) : null;
                $callEndedAt = $durationSeconds ? $callStartedAt->copy()->addSeconds($durationSeconds) : null;

                $rows[] = [
                    'shipment_id' => $shipment->shipment_id,
                    'assignment_id' => null,
                    'call_type' => 'PICKUP_CONTACT',
                    'target_role' => 'CUSTOMER',
                    'target_phone' => $shipment->sender_phone,
                    'driver_id' => null,
                    'branch_id' => $shipment->assigned_branch_id,
                    'attempt_no' => $i,
                    'call_started_at' => $callStartedAt,
                    'call_ended_at' => $callEndedAt,
                    'call_result' => $result,
                    'duration_seconds' => $durationSeconds,
                    'note' => $result === 'ANSWERED' ? 'Customer answered, rescheduled pickup' : 'Failed to contact customer',
                    'created_at' => $callStartedAt,
                    'updated_at' => $callStartedAt,
                ];

                $processed++;

                if (count($rows) >= $batchSize) {
                    $this->flushInsertIgnore($rows);
                    $rows = [];
                    $this->command->info("   Inserted (ignore) {$processed} call logs...");
                }
            }
        }

        if (!empty($rows)) {
            $this->flushInsertIgnore($rows);
        }

        $this->command->info("✅ Seeded call logs (attempted {$processed})");
        $this->command->warn('ℹ️  call_log has no natural unique key; seeder uses INSERT IGNORE. For strict idempotency without truncate, add a unique index (shipment_id, call_type, attempt_no).');
    }

    private function flushInsertIgnore(array $rows): void
    {
        DB::table('call_log')->insertOrIgnore($rows);
    }
}
