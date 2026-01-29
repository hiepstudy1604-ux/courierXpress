<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DistrictMaster;
use Illuminate\Http\Request;

class DistrictController extends Controller
{
    /**
     * Get districts by province code
     */
    public function index(Request $request)
    {
        $query = DistrictMaster::query();

        // Filter by province code (required)
        if ($request->has('province_code')) {
            $query->where('province_code', $request->province_code);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'province_code parameter is required'
            ], 400);
        }

        // Filter by district type
        if ($request->has('district_type')) {
            $query->where('district_type', $request->district_type);
        }

        // Only active districts
        $query->where('is_active', true);

        // Search by name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('district_name', 'like', '%' . $search . '%')
                    ->orWhere('district_name_raw', 'like', '%' . $search . '%')
                    ->orWhere('district_code', 'like', '%' . $search . '%');
            });
        }

        $districts = $query->orderBy('district_type')->orderBy('district_name')->get();

        return response()->json([
            'success' => true,
            'data' => $districts->map(function ($district) {
                return [
                    'district_code' => $district->district_code,
                    'district_name' => $district->district_name,
                    'district_name_raw' => $district->district_name_raw,
                    'district_type' => $district->district_type,
                    'province_code' => $district->province_code,
                ];
            })
        ]);
    }

    /**
     * Get district by code
     */
    public function show($code)
    {
        $district = DistrictMaster::where('district_code', $code)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'district_code' => $district->district_code,
                'district_name' => $district->district_name,
                'district_name_raw' => $district->district_name_raw,
                'district_type' => $district->district_type,
                'province_code' => $district->province_code,
            ]
        ]);
    }
}
