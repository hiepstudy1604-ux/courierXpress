<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\TransitManifest;
use App\Models\TransitManifestItem;
use App\Models\TransitManifestEvent;
use App\Models\Branch;
use App\Models\Vehicle;
use App\Models\Driver;
use Illuminate\Database\Seeder;

class TransitManifestSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::where('shipment_status', 'IN_ORIGIN_WAREHOUSE')
            ->whereNotNull('assigned_branch_id')
            ->get()
            ->take(1);

        if ($shipments->isEmpty()) {
            $this->command->warn('No shipments in origin warehouse found.');
            return;
        }

        $branches = Branch::all();
        $vehicles = Vehicle::where('vehicle_type', 'like', '%Truck%')->get();
        $drivers = Driver::where('vehicle_type', 'like', '%Truck%')->get();

        if ($branches->count() < 2 || $vehicles->isEmpty() || $drivers->isEmpty()) {
            $this->command->warn('Insufficient data for transit manifest creation.');
            return;
        }

        $originBranch = $branches->first();
        $destBranch = $branches->skip(1)->first();
        $vehicle = $vehicles->first();
        $driver = $drivers->first();

        $manifest = TransitManifest::create([
            'manifest_code' => 'MF-' . now()->format('YmdHis'),
            'vehicle_id' => $vehicle->vehicle_id,
            'driver_id' => $driver->driver_id,
            'origin_branch_id' => $originBranch->id,
            'dest_branch_id' => $destBranch->id,
            'route_scope' => 'INTER_REGION_FAR',
            'service_type' => 'Standard',
            'status' => 'CREATED',
            'created_by_type' => 'SYSTEM',
            'created_by' => 1,
            'created_at' => now()->subDays(1),
        ]);

        // Add shipments to manifest
        foreach ($shipments as $shipment) {
            TransitManifestItem::create([
                'manifest_id' => $manifest->manifest_id,
                'shipment_id' => $shipment->shipment_id,
                'item_status' => 'LOADED',
                'added_at' => now()->subDays(1),
            ]);

            $shipment->update(['shipment_status' => 'IN_TRANSIT']);
        }

        // Create events
        TransitManifestEvent::create([
            'manifest_id' => $manifest->manifest_id,
            'event_type' => 'CREATED',
            'event_at' => $manifest->created_at,
            'actor_type' => 'SYSTEM',
            'old_status' => null,
            'new_status' => 'CREATED',
            'message' => 'Manifest created',
        ]);

        TransitManifestEvent::create([
            'manifest_id' => $manifest->manifest_id,
            'event_type' => 'LOADED',
            'event_at' => now()->subDays(1)->addHours(2),
            'actor_type' => 'WAREHOUSE_STAFF',
            'old_status' => 'CREATED',
            'new_status' => 'LOADED',
            'message' => 'Shipments loaded',
        ]);

        $manifest->update([
            'status' => 'LOADED',
            'loaded_at' => now()->subDays(1)->addHours(2),
        ]);

        $this->command->info("✅ Created 1 transit manifest with " . $shipments->count() . " items");
    }
}
