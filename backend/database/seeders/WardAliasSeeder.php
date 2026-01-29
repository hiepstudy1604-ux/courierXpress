<?php

namespace Database\Seeders;

use App\Models\WardAlias;
use Illuminate\Database\Seeder;

class WardAliasSeeder extends Seeder
{
    public function run(): void
    {
        $wards = \App\Models\WardMaster::all();
        $count = 0;

        foreach ($wards as $ward) {
            $aliases = [
                ['alias_text' => strtoupper($ward->ward_name), 'priority' => 1],
                ['alias_text' => strtoupper($ward->ward_name_raw), 'priority' => 5],
            ];

            foreach ($aliases as $alias) {
                WardAlias::firstOrCreate(
                    ['ward_code' => $ward->ward_code, 'alias_text' => $alias['alias_text']],
                    ['priority' => $alias['priority']]
                );
                $count++;
            }
        }

        $this->command->info("✅ Created {$count} ward aliases");
    }
}
