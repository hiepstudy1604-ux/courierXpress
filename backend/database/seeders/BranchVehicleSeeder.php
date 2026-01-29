<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Vehicle;
use App\Models\BranchVehicle;
use Illuminate\Database\Seeder;

class BranchVehicleSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();
        $vehicles = Vehicle::all();
        $count = 0;

        foreach ($branches as $branch) {
            foreach ($vehicles as $vehicle) {
                BranchVehicle::firstOrCreate(
                    ['branch_id' => $branch->id, 'vehicle_id' => $vehicle->vehicle_id],
                    ['quantity' => 5]
                );
                $count++;
            }
        }

        $this->command->info("✅ Created {$count} branch-vehicle assignments");
    }
}
