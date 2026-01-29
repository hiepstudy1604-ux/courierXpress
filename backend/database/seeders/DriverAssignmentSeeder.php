<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\Driver;
use App\Models\DriverAssignment;
use Illuminate\Database\Seeder;

class DriverAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $shipments = Shipment::where('shipment_status', 'PICKUP_SCHEDULED')
            ->whereDoesntHave('pickupAssignment')
            ->get();

        $drivers = Driver::where('driver_status', 'AVAILABLE')->get();
        if ($drivers->isEmpty()) {
            $this->command->warn('No available drivers found.');
            return;
        }

        $count = 0;
        $driverIndex = 0;
        foreach ($shipments as $shipment) {
            $driver = $drivers[$driverIndex % $drivers->count()];

            $assignment = DriverAssignment::create([
                'shipment_id' => $shipment->shipment_id,
                'assignment_type' => 'PICKUP',
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => $driver->driver_id,
                'status' => 'ASSIGNED',
                'assigned_by_type' => 'SYSTEM',
                'assigned_by' => 1,
                'assigned_at' => now(),
                'is_active' => true,
            ]);

            // New ORDER_STATUS: after pickup scheduled, driver starts "on the way pickup"
            $shipment->update(['shipment_status' => 'ON_THE_WAY_PICKUP']);
            $driver->update(['driver_status' => 'ASSIGNED']);

            $driverIndex++;
            $count++;
        }

        $this->command->info("✅ Created {$count} driver assignments");
    }
}
