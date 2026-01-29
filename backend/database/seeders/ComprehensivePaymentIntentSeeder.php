<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ComprehensivePaymentIntentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding payment intents...');

        $statuses = [
            'CONFIRM_PAYMENT',
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
        $batchSize = 200;
        $processed = 0;
        $timeoutCount = 0;

        foreach ($shipments as $shipment) {
            $weight = $shipment->goodsInspection ? $shipment->goodsInspection->actual_weight_kg : $shipment->total_weight_kg;

            $amount = SeedHelper::calculateShippingFee(
                (float) $weight,
                (string) $shipment->route_scope,
                (string) $shipment->service_type
            );

            $createdAt = Carbon::parse($shipment->created_at);
            if ($shipment->goodsInspection) {
                $createdAt = Carbon::parse($shipment->goodsInspection->inspected_at)->addMinutes(rand(5, 30));
            }

            $method = rand(0, 100) < 70 ? 'ONLINE' : 'CASH';
            $provider = $method === 'ONLINE' ? (rand(0, 100) < 50 ? 'VNPAY' : 'MOMO') : null;

            $refPrefix = $method === 'ONLINE' ? 'PAY-' : 'CASH-';
            $referenceCode = $refPrefix . $shipment->shipment_id;

            // 10% timeout fallback (tạo record EXPIRED + record CASH CONFIRMED)
            $willTimeout = $method === 'ONLINE' && rand(0, 100) < 10;

            $status = 'PENDING';
            $confirmedAt = null;
            $failedAt = null;
            $amountPaid = 0;
            $fallbackReferenceCode = null;

            if (!$willTimeout) {
                if ($method === 'ONLINE') {
                    $status = 'CONFIRMED';
                    $confirmedAt = $createdAt->copy()->addMinutes(rand(5, 60));
                    $amountPaid = $amount;
                } else {
                    if (in_array($shipment->shipment_status, [
                        'IN_ORIGIN_WAREHOUSE',
                        'IN_TRANSIT',
                        'IN_DEST_WAREHOUSE',
                        'OUT_FOR_DELIVERY',
                        'DELIVERED_SUCCESS',
                        'CLOSED',
                    ], true)) {
                        $status = 'CONFIRMED';
                        $confirmedAt = $createdAt->copy()->addHours(rand(1, 6));
                        $amountPaid = $amount;
                    }
                }
            } else {
                $status = 'EXPIRED';
                $failedAt = $createdAt->copy()->addHours(24);

                // fallback CASH (stable ref code)
                $fallbackReferenceCode = 'CASH-' . $shipment->shipment_id;

                $timeoutCount++;

                // Create/Upsert fallback cash intent
                DB::table('payment_intent')->upsert(
                    [[
                        'shipment_id' => $shipment->shipment_id,
                        'currency' => 'VND',
                        'method' => 'CASH',
                        'provider' => null,
                        'status' => 'CONFIRMED',
                        'amount' => $amount,
                        'amount_paid' => $amount,
                        'payer_role' => 'SENDER',
                        'reference_code' => $fallbackReferenceCode,
                        'provider_txn_id' => null,
                        'expires_at' => null,
                        'confirmed_at' => $failedAt->copy()->addHours(rand(1, 3)),
                        'failed_at' => null,
                        'fallback_payment_intent_id' => null,
                        'note' => 'Fallback cash after online timeout',
                        'created_at' => $failedAt->copy()->addMinutes(5),
                        'updated_at' => $failedAt->copy()->addMinutes(5),
                    ]],
                    ['reference_code'],
                    [
                        'shipment_id',
                        'currency',
                        'method',
                        'provider',
                        'status',
                        'amount',
                        'amount_paid',
                        'payer_role',
                        'provider_txn_id',
                        'expires_at',
                        'confirmed_at',
                        'failed_at',
                        'fallback_payment_intent_id',
                        'note',
                        'updated_at',
                    ]
                );
            }

            $rows[] = [
                'shipment_id' => $shipment->shipment_id,
                'currency' => 'VND',
                'method' => $method,
                'provider' => $provider,
                'status' => $status,
                'amount' => $amount,
                'amount_paid' => $amountPaid,
                'payer_role' => 'SENDER',
                'reference_code' => $referenceCode,
                'provider_txn_id' => $method === 'ONLINE' && $status === 'CONFIRMED'
                    ? 'TXN-' . strtoupper(Str::random(12))
                    : null,
                'expires_at' => $method === 'ONLINE' ? $createdAt->copy()->addHours(24) : null,
                'confirmed_at' => $confirmedAt,
                'failed_at' => $failedAt,
                // We'll link fallback via reference code after upsert (avoid needing insertGetId)
                'fallback_payment_intent_id' => null,
                'note' => $willTimeout ? 'Online payment expired; fallback cash created' : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} payment intents...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        // Link fallbacks (best-effort): set fallback_payment_intent_id for expired ONLINE intents
        // This step is idempotent and safe to re-run.
        DB::table('payment_intent as pi')
            ->join('payment_intent as fb', function ($join) {
                $join->on('fb.shipment_id', '=', 'pi.shipment_id')
                    ->where('fb.method', '=', 'CASH')
                    ->where('fb.status', '=', 'CONFIRMED');
            })
            ->where('pi.method', 'ONLINE')
            ->where('pi.status', 'EXPIRED')
            ->whereNull('pi.fallback_payment_intent_id')
            ->update(['pi.fallback_payment_intent_id' => DB::raw('fb.payment_intent_id')]);

        $this->command->info("✅ Upserted {$processed} payment intents ({$timeoutCount} with timeout fallback)");
    }

    private function flushUpsert(array $rows): void
    {
        DB::table('payment_intent')->upsert(
            $rows,
            ['reference_code'],
            [
                'shipment_id',
                'currency',
                'method',
                'provider',
                'status',
                'amount',
                'amount_paid',
                'payer_role',
                'provider_txn_id',
                'expires_at',
                'confirmed_at',
                'failed_at',
                'fallback_payment_intent_id',
                'note',
                'updated_at',
            ]
        );
    }
}
