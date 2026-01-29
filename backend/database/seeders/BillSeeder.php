<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\Shipment;
use App\Models\PaymentIntent;
use Illuminate\Database\Seeder;

class BillSeeder extends Seeder
{
    public function run(): void
    {
        $deliveredShipments = Shipment::where('shipment_status', 'DELIVERED_SUCCESS')
            ->whereDoesntHave('bill')
            ->get();

        $createdCount = 0;

        foreach ($deliveredShipments as $shipment) {
            $paymentIntent = PaymentIntent::where('shipment_id', $shipment->shipment_id)
                ->where('status', 'CONFIRMED')
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$paymentIntent) {
                $paymentIntent = PaymentIntent::where('shipment_id', $shipment->shipment_id)
                    ->orderBy('created_at', 'desc')
                    ->first();
            }

            $amount = $paymentIntent ? (float) $paymentIntent->amount : 50000.00;
            
            if ($amount <= 0) {
                continue;
            }

            $billNumber = 'BILL-' . date('Ymd') . '-' . str_pad((string) $shipment->shipment_id, 6, '0', STR_PAD_LEFT);

            $bill = Bill::create([
                'bill_number' => $billNumber,
                'courier_id' => null,
                'shipment_id' => $shipment->shipment_id,
                'user_id' => $shipment->user_id ?? 1,
                'amount' => $amount,
                'status' => $paymentIntent && $paymentIntent->method === 'ONLINE' ? 'PAID' : 'UNPAID',
                'payment_date' => $paymentIntent && $paymentIntent->status === 'CONFIRMED' && $paymentIntent->confirmed_at 
                    ? $paymentIntent->confirmed_at 
                    : null,
            ]);

            $createdCount++;
        }

        $this->command->info("✅ Created {$createdCount} bills from successfully delivered shipments.");
    }
}
