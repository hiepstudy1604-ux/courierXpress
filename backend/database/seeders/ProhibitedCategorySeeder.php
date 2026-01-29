<?php

namespace Database\Seeders;

use App\Models\ProhibitedCategory;
use Illuminate\Database\Seeder;

class ProhibitedCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['code' => 'EXPLOSIVE', 'name' => 'Chất nổ', 'description' => 'Các chất nổ, pháo nổ', 'is_active' => true],
            ['code' => 'FLAMMABLE', 'name' => 'Chất dễ cháy', 'description' => 'Xăng, dầu, gas', 'is_active' => true],
            ['code' => 'TOXIC', 'name' => 'Chất độc hại', 'description' => 'Hóa chất độc hại', 'is_active' => true],
            ['code' => 'RADIOACTIVE', 'name' => 'Chất phóng xạ', 'description' => 'Vật liệu phóng xạ', 'is_active' => true],
            ['code' => 'CORROSIVE', 'name' => 'Chất ăn mòn', 'description' => 'Axit, kiềm mạnh', 'is_active' => true],
        ];

        foreach ($categories as $category) {
            ProhibitedCategory::firstOrCreate(
                ['code' => $category['code']],
                $category
            );
        }

        $this->command->info('✅ Created ' . count($categories) . ' prohibited categories');
    }
}
