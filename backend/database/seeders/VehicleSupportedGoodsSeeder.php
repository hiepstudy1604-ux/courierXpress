<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use App\Models\VehicleSupportedGoods;
use Illuminate\Database\Seeder;

class VehicleSupportedGoodsSeeder extends Seeder
{
    public function run(): void
    {
        $goodsTypes = [
            'DOCUMENT',
            'CLOTHING',
            'ELECTRONICS',
            'FURNITURE',
            'FOOD',
            'CONSTRUCTION_MATERIAL',
            'FRAGILE',
            'LIQUID'
        ];

        $vehicles = Vehicle::all();
        $count = 0;

        foreach ($vehicles as $vehicle) {
            // Motorbike supports all goods types
            if ($vehicle->vehicle_type === 'Motorbike') {
                foreach ($goodsTypes as $goodsType) {
                    VehicleSupportedGoods::firstOrCreate(
                        ['vehicle_id' => $vehicle->vehicle_id, 'goods_type' => $goodsType]
                    );
                    $count++;
                }
            } else {
                // Trucks support all except very fragile items
                foreach ($goodsTypes as $goodsType) {
                    if ($goodsType !== 'FRAGILE') {
                        VehicleSupportedGoods::firstOrCreate(
                            ['vehicle_id' => $vehicle->vehicle_id, 'goods_type' => $goodsType]
                        );
                        $count++;
                    }
                }
            }
        }

        $this->command->info("✅ Created {$count} vehicle supported goods records");
    }
}
