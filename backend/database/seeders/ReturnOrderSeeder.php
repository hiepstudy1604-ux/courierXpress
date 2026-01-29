<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\ReturnOrder;
use App\Models\ReturnEventLog;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class ReturnOrderSeeder extends Seeder
{
    public function run(): void
    {
        // Create return orders from failed delivery shipments
        $shipments = Shipment::where('shipment_status', 'DELIVERY_FAILED')
            ->whereDoesntHave('returnOrder')
            ->get()
            ->take(2);

        $branches = Branch::all();
        if ($branches->count() < 2) {
            $this->command->warn('Insufficient branches for return orders.');
            return;
        }

        $count = 0;
        foreach ($shipments as $shipment) {
            $returnOrder = ReturnOrder::create([
                'original_shipment_id' => $shipment->shipment_id,
                'return_shipment_id' => null,
                'reason_code' => 'DELIVERY_FAILED',
                'reason_note' => 'Khách hàng không nhận hàng',
                'service_type' => $shipment->service_type,
                'route_scope' => $shipment->route_scope,
                'origin_branch_id' => $shipment->assigned_branch_id,
                'dest_branch_id' => $shipment->assigned_branch_id, // Return to same branch
                'current_branch_id' => $shipment->assigned_branch_id,
                'status' => 'CREATED',
                'created_by_type' => 'SYSTEM',
                'created_by' => 1,
            ]);

            // Create event log
            ReturnEventLog::create([
                'return_order_id' => $returnOrder->return_order_id,
                'original_shipment_id' => $shipment->shipment_id,
                'event_type' => 'CREATED',
                'old_status' => null,
                'new_status' => 'CREATED',
                'event_at' => now(),
                'actor_type' => 'SYSTEM',
                'message' => 'Return order created',
            ]);

            $count++;
        }

        $this->command->info("✅ Created {$count} return orders");
    }
}
