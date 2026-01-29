<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Shipment;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveTransitManifestSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding transit manifests...');

        $shipments = Shipment::whereIn('shipment_status', [
            'IN_TRANSIT',
            'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED',
            'DELIVERED_SUCCESS',
            'CLOSED',
        ])->get();

        $vehicles = Vehicle::all();
        $drivers = Driver::where('is_active', true)->get();

        if ($vehicles->isEmpty() || $drivers->isEmpty()) {
            $this->command->warn('⚠️  No vehicles or drivers found.');
            return;
        }

        // Group shipments by origin branch and day -> 1 manifest per group
        $groupedShipments = $shipments->groupBy(function ($shipment) {
            return $shipment->assigned_branch_id . '_' . Carbon::parse($shipment->created_at)->format('Y-m-d');
        });

        $manifestRows = [];
        $itemRows = [];
        $batchSize = 200;
        $manifestCount = 0;
        $itemCount = 0;

        foreach ($groupedShipments as $groupKey => $groupShipments) {
            if ($groupShipments->count() < 3) {
                continue;
            }

            $firstShipment = $groupShipments->first();
            $originBranchId = $firstShipment->assigned_branch_id;
            $destBranchId = $firstShipment->assigned_branch_id; // simplified

            $vehicle = $vehicles->filter(function ($v) {
                return stripos((string) $v->vehicle_type, 'truck') !== false;
            })->first() ?? $vehicles->random();

            $driver = $drivers->where('branch_id', $originBranchId)->first() ?? $drivers->random();

            $createdAt = Carbon::parse($firstShipment->created_at)->addHours(rand(6, 12));
            $loadedAt = $createdAt->copy()->addMinutes(rand(30, 120));
            $departedAt = $loadedAt->copy()->addMinutes(rand(15, 60));
            $arrivedAt = $departedAt->copy()->addHours(rand(2, 8));

            $closedAt = null;
            if (in_array($firstShipment->shipment_status, [
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                'DELIVERED_SUCCESS',
                'CLOSED',
            ], true)) {
                $closedAt = $arrivedAt->copy()->addMinutes(rand(30, 120));
            }

            $status = $closedAt ? 'CLOSED' : 'ARRIVED';

            // Deterministic manifest_code for idempotency
            // Example: MF-20260124-OB12 (originBranchId + date)
            $dateStr = Carbon::parse($firstShipment->created_at)->format('Ymd');
            $manifestCode = 'MF-' . $dateStr . '-' . $originBranchId;

            $manifestRows[] = [
                'manifest_code' => $manifestCode,
                'vehicle_id' => $vehicle->vehicle_id,
                'driver_id' => $driver->driver_id,
                'origin_branch_id' => $originBranchId,
                'origin_warehouse_role' => 'ORIGIN',
                'dest_branch_id' => $destBranchId,
                'dest_warehouse_role' => 'DESTINATION',
                'route_scope' => $firstShipment->route_scope,
                'service_type' => $firstShipment->service_type,
                'status' => $status,
                'created_by_type' => 'SYSTEM',
                'created_by' => 1,
                'created_at' => $createdAt,
                'loaded_at' => $loadedAt,
                'departed_at' => $departedAt,
                'arrived_at' => $arrivedAt,
                'closed_at' => $closedAt,
                'note' => 'Transit manifest for ' . $groupShipments->count() . ' shipments',
            ];

            // Items: we will insertOrIgnore after we resolve manifest_id
            // Stable key assumption: (manifest_id, shipment_id) is unique-ish; if not, insertOrIgnore still safe.

            // Pick a deterministic subset: first N by shipment_id
            $subset = $groupShipments->sortBy('shipment_id')->take(min(10, $groupShipments->count()));

            foreach ($subset as $idx => $shipment) {
                $addedAt = $loadedAt->copy()->addMinutes(($idx + 1) * 2);
                $removedAt = $closedAt ? $closedAt->copy()->addMinutes($idx + 1) : null;

                $itemRows[] = [
                    'manifest_code' => $manifestCode, // temp for mapping
                    'shipment_id' => $shipment->shipment_id,
                    'item_status' => $removedAt ? 'REMOVED' : 'LOADED',
                    'added_at' => $addedAt,
                    'removed_at' => $removedAt,
                    'note' => null,
                ];
                $itemCount++;
            }

            $manifestCount++;

            if (count($manifestRows) >= $batchSize) {
                $this->flushManifestsAndItems($manifestRows, $itemRows);
                $manifestRows = [];
                $itemRows = [];
                $this->command->info("   Upserted {$manifestCount} manifests, prepared {$itemCount} items...");
            }
        }

        if (!empty($manifestRows)) {
            $this->flushManifestsAndItems($manifestRows, $itemRows);
        }

        $this->command->info("✅ Seeded transit manifests (upserted {$manifestCount})");
    }

    private function flushManifestsAndItems(array $manifestRows, array $itemRows): void
    {
        // Upsert manifests by manifest_code (unique)
        DB::table('transit_manifest')->upsert(
            $manifestRows,
            ['manifest_code'],
            [
                'vehicle_id',
                'driver_id',
                'origin_branch_id',
                'origin_warehouse_role',
                'dest_branch_id',
                'dest_warehouse_role',
                'route_scope',
                'service_type',
                'status',
                'created_by_type',
                'created_by',
                'created_at',
                'loaded_at',
                'departed_at',
                'arrived_at',
                'closed_at',
                'note',
            ]
        );

        if (empty($itemRows)) {
            return;
        }

        // Resolve manifest_id by manifest_code (1 query)
        $codes = array_values(array_unique(array_map(function ($r) {
            return $r['manifest_code'];
        }, $itemRows)));

        $manifestIdByCode = DB::table('transit_manifest')
            ->whereIn('manifest_code', $codes)
            ->pluck('manifest_id', 'manifest_code')
            ->toArray();

        $finalItems = [];
        foreach ($itemRows as $row) {
            $code = $row['manifest_code'];
            $manifestId = $manifestIdByCode[$code] ?? null;
            if (!$manifestId) {
                continue;
            }

            unset($row['manifest_code']);
            $row['manifest_id'] = $manifestId;
            $finalItems[] = $row;
        }

        // Insert idempotently
        DB::table('transit_manifest_item')->insertOrIgnore($finalItems);
    }
}
