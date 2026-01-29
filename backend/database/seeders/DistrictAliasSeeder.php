<?php

namespace Database\Seeders;

use App\Models\DistrictAlias;
use Illuminate\Database\Seeder;

class DistrictAliasSeeder extends Seeder
{
    public function run(): void
    {
        // Generate aliases for districts
        $districts = \App\Models\DistrictMaster::all();
        $count = 0;

        foreach ($districts as $district) {
            $aliases = [
                ['alias_text' => strtoupper($district->district_name), 'priority' => 1],
                ['alias_text' => strtoupper($district->district_name_raw), 'priority' => 5],
            ];

            foreach ($aliases as $alias) {
                DistrictAlias::firstOrCreate(
                    ['district_code' => $district->district_code, 'alias_text' => $alias['alias_text']],
                    ['priority' => $alias['priority']]
                );
                $count++;
            }
        }

        $this->command->info("✅ Created {$count} district aliases");
    }
}
