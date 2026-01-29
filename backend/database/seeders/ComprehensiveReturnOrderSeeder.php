<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveReturnOrderSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding return orders...');

        $shipments = Shipment::whereIn('shipment_status', [
            'RETURN_CREATED',
            'RETURN_IN_TRANSIT',
            'RETURNED_TO_ORIGIN',
            'RETURN_COMPLETED',
        ])->get();

        $rows = [];
        $batchSize = 300;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);

            $reasonCodes = [
                'DELIVERY_FAILED',
                'CUSTOMER_REFUSED',
                'ADDRESS_INCORRECT',
                'DAMAGED',
                'WRONG_ITEM',
            ];
            $reasonCode = $reasonCodes[array_rand($reasonCodes)];

            $status = match ($shipment->shipment_status) {
                'RETURN_CREATED' => 'CREATED',
                'RETURN_IN_TRANSIT' => 'IN_TRANSIT',
                'RETURNED_TO_ORIGIN' => 'RETURNED',
                'RETURN_COMPLETED' => 'COMPLETED',
                default => 'CREATED',
            };

            // Deterministic key for idempotency
            // One return order per original shipment.
            $originalShipmentId = $shipment->shipment_id;

            $rows[] = [
                'original_shipment_id' => $originalShipmentId,
                'return_shipment_id' => null,
                'reason_code' => $reasonCode,
                'reason_note' => match ($reasonCode) {
                    'DELIVERY_FAILED' => 'Multiple delivery attempts failed',
                    'CUSTOMER_REFUSED' => 'Customer refused to receive',
                    'ADDRESS_INCORRECT' => 'Address incorrect or unreachable',
                    'DAMAGED' => 'Package damaged during transit',
                    'WRONG_ITEM' => 'Wrong item delivered',
                    default => 'Return requested',
                },
                'service_type' => $shipment->service_type,
                'route_scope' => $shipment->route_scope,
                'origin_branch_id' => $shipment->assigned_branch_id,
                'dest_branch_id' => $shipment->assigned_branch_id,
                'current_branch_id' => in_array($status, ['RETURNED', 'COMPLETED'], true) ? $shipment->assigned_branch_id : null,
                'status' => $status,
                'created_by_type' => 'SYSTEM',
                'created_by' => 1,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $processed++;

            if (count($rows) >= $batchSize) {
                $this->flushUpsert($rows);
                $rows = [];
                $this->command->info("   Upserted {$processed} return orders...");
            }
        }

        if (!empty($rows)) {
            $this->flushUpsert($rows);
        }

        $this->command->info("✅ Upserted {$processed} return orders");
    }

    private function flushUpsert(array $rows): void
    {
        // No unique index exists by default; we use original_shipment_id as natural key.
        DB::table('return_order')->upsert(
            $rows,
            ['original_shipment_id'],
            [
                'return_shipment_id',
                'reason_code',
                'reason_note',
                'service_type',
                'route_scope',
                'origin_branch_id',
                'dest_branch_id',
                'current_branch_id',
                'status',
                'created_by_type',
                'created_by',
                'updated_at',
            ]
        );
    }
}
