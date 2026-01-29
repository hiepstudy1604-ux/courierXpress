<?php

namespace Database\Seeders;

use App\Models\ProhibitedCategory;
use App\Models\ProhibitedKeyword;
use Illuminate\Database\Seeder;

class ProhibitedKeywordSeeder extends Seeder
{
    public function run(): void
    {
        $keywords = [
            ['category_code' => 'EXPLOSIVE', 'keyword' => 'thuốc nổ', 'match_type' => 'CONTAINS', 'risk_weight' => 10],
            ['category_code' => 'EXPLOSIVE', 'keyword' => 'pháo', 'match_type' => 'CONTAINS', 'risk_weight' => 8],
            ['category_code' => 'FLAMMABLE', 'keyword' => 'xăng', 'match_type' => 'CONTAINS', 'risk_weight' => 9],
            ['category_code' => 'FLAMMABLE', 'keyword' => 'dầu', 'match_type' => 'CONTAINS', 'risk_weight' => 7],
            ['category_code' => 'FLAMMABLE', 'keyword' => 'gas', 'match_type' => 'CONTAINS', 'risk_weight' => 8],
            ['category_code' => 'TOXIC', 'keyword' => 'hóa chất', 'match_type' => 'CONTAINS', 'risk_weight' => 7],
            ['category_code' => 'TOXIC', 'keyword' => 'thuốc trừ sâu', 'match_type' => 'CONTAINS', 'risk_weight' => 8],
        ];

        $count = 0;
        foreach ($keywords as $keywordData) {
            $category = ProhibitedCategory::where('code', $keywordData['category_code'])->first();
            if ($category) {
                ProhibitedKeyword::firstOrCreate(
                    ['prohibited_category_id' => $category->id, 'keyword' => $keywordData['keyword']],
                    [
                        'match_type' => $keywordData['match_type'],
                        'risk_weight' => $keywordData['risk_weight'],
                        'is_active' => true,
                    ]
                );
                $count++;
            }
        }

        $this->command->info("✅ Created {$count} prohibited keywords");
    }
}
