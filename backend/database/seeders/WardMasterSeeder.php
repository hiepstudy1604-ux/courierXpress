<?php

namespace Database\Seeders;

use App\Models\WardMaster;
use Illuminate\Database\Seeder;

class WardMasterSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/vn_units_simplified.json');

        if (!file_exists($path)) {
            $this->command->error('Ward dataset not found: ' . $path);
            return;
        }

        $data = json_decode(file_get_contents($path), true);
        if (!is_array($data)) {
            $this->command->error('Invalid ward dataset: ' . $path);
            return;
        }

        $provinceCodeMap = [
            '01' => 'HN',
            '79' => 'HCM',
            '48' => 'DN',
            '31' => 'HP',
            '92' => 'CT',
            '46' => 'HUE',
            '04' => 'CB',
            '20' => 'LS',
            '37' => 'NB',
            '25' => 'PT',
            '22' => 'QN',
            '14' => 'SL',
            '08' => 'TQ',
            '26' => 'VP',
            '27' => 'BN',
            '33' => 'HY',
            '10' => 'LC',
            '12' => 'LCH',
            '11' => 'DB',
            '38' => 'TH',
            '40' => 'NA',
            '42' => 'HT',
            '45' => 'QT',
            '51' => 'QNG',
            '64' => 'GL',
            '56' => 'KH',
            '68' => 'LD',
            '66' => 'DLK',
            '75' => 'DNA',
            '72' => 'TN',
            '86' => 'VL',
            '87' => 'DT',
            '96' => 'CM',
            '89' => 'AG',
            '74' => 'BDU',
            '80' => 'LA',
        ];

        $count = 0;

        foreach ($data as $province) {
            $wards = $province['Wards'] ?? [];
            if (!is_array($wards)) continue;

            foreach ($wards as $ward) {
                $wardCode = (string)($ward['Code'] ?? '');
                $wardFullName = (string)($ward['FullName'] ?? '');
                $provinceNumeric = (string)($ward['ProvinceCode'] ?? $province['Code'] ?? '');

                if ($wardCode === '' || $wardFullName === '' || $provinceNumeric === '') {
                    continue;
                }

                $provinceNumeric = str_pad($provinceNumeric, 2, '0', STR_PAD_LEFT);
                $internalProvinceCode = $provinceCodeMap[$provinceNumeric] ?? null;
                if (!$internalProvinceCode) {
                    continue;
                }

                WardMaster::updateOrCreate(
                    ['ward_code' => $wardCode],
                    [
                        'district_code' => null,
                        'province_code' => $internalProvinceCode,
                        'ward_name' => $wardFullName,
                        'ward_name_raw' => $ward['Name'] ?? $wardFullName,
                        'ward_type' => (isset($ward['FullName']) && is_string($ward['FullName']) && str_starts_with($ward['FullName'], 'Phường')) ? 'PHUONG' : 'XA',
                        'is_active' => true,
                        'source_name' => 'vietnamese-provinces-database',
                        'source_ref' => 'simplified_json_generated_data_vn_units.json',
                    ]
                );

                $count++;
            }
        }

        $this->command->info('✅ Created/updated ' . $count . ' wards');
    }
}
