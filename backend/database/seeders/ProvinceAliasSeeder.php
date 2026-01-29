<?php

namespace Database\Seeders;

use App\Models\ProvinceAlias;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProvinceAliasSeeder extends Seeder
{
    public function run(): void
    {
        $aliases = [
            ['province_code' => 'HN', 'alias_text' => 'HA NOI', 'priority' => 1],
            ['province_code' => 'HN', 'alias_text' => 'HANOI', 'priority' => 5],
            ['province_code' => 'HCM', 'alias_text' => 'HO CHI MINH', 'priority' => 1],
            ['province_code' => 'HCM', 'alias_text' => 'TP HCM', 'priority' => 5],
            ['province_code' => 'HCM', 'alias_text' => 'SAIGON', 'priority' => 10],
            ['province_code' => 'DN', 'alias_text' => 'DA NANG', 'priority' => 1],
            ['province_code' => 'DN', 'alias_text' => 'DANANG', 'priority' => 5],
        ];

        foreach ($aliases as $alias) {
            ProvinceAlias::firstOrCreate(
                ['province_code' => $alias['province_code'], 'alias_text' => $alias['alias_text']],
                $alias
            );
        }

        $this->command->info('✅ Created ' . count($aliases) . ' province aliases');
    }
}
