<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\PaymentIntent;
use Illuminate\Database\Seeder;

class PaymentIntentSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::whereIn('shipment_status', ['CONFIRMED_PRICE', 'ADJUSTED_PRICE'])
            ->whereDoesntHave('paymentIntent')
            ->get();

        $count = 0;
        foreach ($shipments as $shipment) {
            // Calculate amount based on weight and route
            $basePrice = 20000;
            $weight = (float) $shipment->total_weight_kg;
            $extraWeight = max(0, $weight - 1);
            $extraPrice = ceil($extraWeight / 0.5) * 5000;
            $amount = $basePrice + $extraPrice;

            // Add route multiplier
            if ($shipment->route_scope === 'INTER_REGION_FAR') {
                $amount *= 2.5;
            } elseif ($shipment->route_scope === 'INTER_REGION_NEAR') {
                $amount *= 1.8;
            } elseif ($shipment->route_scope === 'INTRA_REGION') {
                $amount *= 1.3;
            }

            $amount = round($amount, 2);

            $paymentIntent = PaymentIntent::create([
                'shipment_id' => $shipment->shipment_id,
                'currency' => 'VND',
                'method' => 'ONLINE',
                'provider' => 'VNPAY',
                'status' => 'PENDING',
                'amount' => $amount,
                'amount_paid' => 0,
                'payer_role' => 'SENDER',
                'reference_code' => 'PAY-' . $shipment->shipment_id,
                'expires_at' => now()->addHours(24),
            ]);

            // Simulate some confirmed payments
            if ($count % 2 == 0) {
                $paymentIntent->update([
                    'status' => 'CONFIRMED',
                    'amount_paid' => $amount,
                    'confirmed_at' => now()->subHours(1),
                ]);
                $shipment->update(['shipment_status' => 'CONFIRM_PAYMENT']);
            }

            $count++;
        }

        $this->command->info("✅ Created {$count} payment intents");
    }
}
