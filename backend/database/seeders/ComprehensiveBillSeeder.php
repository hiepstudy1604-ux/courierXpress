<?php

namespace Database\Seeders;

use App\Models\PaymentIntent;
use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveBillSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding bills...');

        // Bills are generated from delivered shipments (plus a small % refunded/unpaid for chart realism)
        $shipments = Shipment::whereIn('shipment_status', ['DELIVERED_SUCCESS', 'CLOSED'])->get();

        $rows = [];
        $batchSize = 200;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $paymentIntent = PaymentIntent::where('shipment_id', $shipment->shipment_id)
                ->orderBy('created_at', 'desc')
                ->first();

            $amountPaid = $paymentIntent ? (float) ($paymentIntent->amount_paid ?? 0) : 0.0;
            $amount = $amountPaid > 0 ? $amountPaid : (float) SeedHelper::calculateShippingFee(
                (float) $shipment->total_weight_kg,
                (string) $shipment->route_scope,
                (string) $shipment->service_type
            );

            if ($amount <= 0) {
                continue;
            }

            // Stable bill_number for idempotency
            $billNumber = 'BILL-' . str_pad((string) $shipment->shipment_id, 10, '0', STR_PAD_LEFT);

            // Spread payment_date around delivery/update time for charting
            $baseTs = Carbon::parse($shipment->updated_at ?? $shipment->created_at);

            // Determine bill status with some realistic variance
            $status = 'UNPAID';
            $paymentDate = null;

            if ($paymentIntent && ($paymentIntent->status ?? null) === 'CONFIRMED') {
                $status = 'PAID';
                $paymentDate = $paymentIntent->confirmed_at ? Carbon::parse($paymentIntent->confirmed_at) : $baseTs->copy()->subMinutes(rand(10, 180));
            } else {
                // 85% paid, 10% unpaid, 5% refunded among delivered/closed (for dashboard)
                $roll = rand(1, 100);
                if ($roll <= 85) {
                    $status = 'PAID';
                    $paymentDate = $baseTs->copy()->subMinutes(rand(10, 240));
                } elseif ($roll <= 95) {
                    $status = 'UNPAID';
                    $paymentDate = null;
                } else {
                    $status = 'REFUNDED';
                    $paymentDate = $baseTs->copy()->subDays(rand(1, 7));
                }
            }

            $rows[] = [
                'bill_number' => $billNumber,
                'courier_id' => null,
                'shipment_id' => $shipment->shipment_id,
                'user_id' => $shipment->user_id ?? 1,
                'amount' => $amount,
                'status' => $status,
                'payment_date' => $paymentDate,
                'created_at' => $baseTs,
                'updated_at' => $baseTs,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} bills...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        $this->command->info("✅ Upserted {$processed} bills");
    }

    private function flushUpsert(array $rows): void
    {
        DB::table('bills')->upsert(
            $rows,
            ['bill_number'],
            [
                'courier_id',
                'shipment_id',
                'user_id',
                'amount',
                'status',
                'payment_date',
                'updated_at',
            ]
        );
    }
}
