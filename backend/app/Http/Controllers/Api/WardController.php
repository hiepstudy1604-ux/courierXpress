<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WardMaster;
use Illuminate\Http\Request;

class WardController extends Controller
{
    /**
     * Get wards by district code
     */
    public function index(Request $request)
    {
        $query = WardMaster::query();

        // Filter by province code (required)
        if ($request->has('province_code')) {
            $query->where('province_code', $request->province_code);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'province_code parameter is required'
            ], 400);
        }

        // Filter by ward type
        if ($request->has('ward_type')) {
            $query->where('ward_type', $request->ward_type);
        }

        // Only active wards
        $query->where('is_active', true);

        // Search by name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ward_name', 'like', '%' . $search . '%')
                    ->orWhere('ward_name_raw', 'like', '%' . $search . '%')
                    ->orWhere('ward_code', 'like', '%' . $search . '%');
            });
        }

        $wards = $query->orderBy('ward_type')->orderBy('ward_name')->get();

        return response()->json([
            'success' => true,
            'data' => $wards->map(function ($ward) {
                return [
                    'ward_code' => $ward->ward_code,
                    'ward_name' => $ward->ward_name,
                    'ward_name_raw' => $ward->ward_name_raw,
                    'ward_type' => $ward->ward_type,
                    'province_code' => $ward->province_code,
                ];
            })
        ]);
    }

    /**
     * Get ward by code
     */
    public function show($code)
    {
        $ward = WardMaster::where('ward_code', $code)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'ward_code' => $ward->ward_code,
                'ward_name' => $ward->ward_name,
                'ward_name_raw' => $ward->ward_name_raw,
                'ward_type' => $ward->ward_type,
                'province_code' => $ward->province_code,
            ]
        ]);
    }
}
