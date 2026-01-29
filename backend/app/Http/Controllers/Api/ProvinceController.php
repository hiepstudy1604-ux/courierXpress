<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProvinceMaster;
use Illuminate\Http\Request;

class ProvinceController extends Controller
{
    /**
     * Get all provinces
     */
    public function index(Request $request)
    {
        $query = ProvinceMaster::query();

        // Filter by region
        if ($request->has('region_code')) {
            $query->where('region_code', $request->region_code);
        }

        // Filter by province type
        if ($request->has('province_type')) {
            $query->where('province_type', $request->province_type);
        }

        // Search by name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('province_name', 'like', '%' . $search . '%')
                    ->orWhere('province_code', 'like', '%' . $search . '%');
            });
        }

        $provinces = $query->orderBy('region_code')->orderBy('province_name')->get();

        return response()->json([
            'success' => true,
            'data' => $provinces->map(function ($province) {
                return [
                    'province_code' => $province->province_code,
                    'province_name' => $province->province_name,
                    'province_type' => $province->province_type,
                    'region_code' => $province->region_code,
                    'latitude' => $province->latitude ? (float) $province->latitude : null,
                    'longitude' => $province->longitude ? (float) $province->longitude : null,
                ];
            })
        ]);
    }

    /**
     * Get provinces grouped by region
     */
    public function groupedByRegion()
    {
        $provinces = ProvinceMaster::orderBy('region_code')->orderBy('province_name')->get();

        $grouped = $provinces->groupBy('region_code')->map(function ($group) {
            return $group->map(function ($province) {
                return [
                    'province_code' => $province->province_code,
                    'province_name' => $province->province_name,
                    'province_type' => $province->province_type,
                    'latitude' => $province->latitude ? (float) $province->latitude : null,
                    'longitude' => $province->longitude ? (float) $province->longitude : null,
                ];
            })->values();
        });

        return response()->json([
            'success' => true,
            'data' => [
                'NORTH' => $grouped->get('NORTH', []),
                'CENTRAL' => $grouped->get('CENTRAL', []),
                'SOUTH' => $grouped->get('SOUTH', []),
            ]
        ]);
    }

    /**
     * Get province by code
     */
    public function show($code)
    {
        $province = ProvinceMaster::where('province_code', strtoupper($code))->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'province_code' => $province->province_code,
                'province_name' => $province->province_name,
                'province_type' => $province->province_type,
                'region_code' => $province->region_code,
                'latitude' => $province->latitude ? (float) $province->latitude : null,
                'longitude' => $province->longitude ? (float) $province->longitude : null,
            ]
        ]);
    }
}
