<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VehicleController extends Controller
{
    /**
     * Get all vehicles
     * GET /vehicles
     */
    public function index(Request $request)
    {
        try {
            $query = Vehicle::query();

            // Filter by is_active
            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active === 'true' || $request->is_active === '1');
            }

            // Filter by vehicle_type
            if ($request->has('vehicle_type')) {
                $query->where('vehicle_type', $request->vehicle_type);
            }

            // Filter by route_scope
            if ($request->has('route_scope')) {
                $query->where('route_scope', $request->route_scope);
            }

            $vehicles = $query->orderBy('vehicle_code')->get();

            return response()->json([
                'success' => true,
                'data' => $vehicles->map(function ($vehicle) {
                    return [
                        'id' => $vehicle->vehicle_id,
                        'code' => $vehicle->vehicle_code,
                        'type' => $vehicle->vehicle_type,
                        'max_load_kg' => $vehicle->max_load_kg,
                        'max_length_cm' => $vehicle->max_length_cm,
                        'max_width_cm' => $vehicle->max_width_cm,
                        'max_height_cm' => $vehicle->max_height_cm,
                        'max_volume_m3' => $vehicle->max_volume_m3,
                        'route_scope' => $vehicle->route_scope,
                        'is_active' => $vehicle->is_active,
                    ];
                })
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching vehicles: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching vehicles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get vehicle by ID
     * GET /vehicles/:id
     */
    public function show($id)
    {
        try {
            $vehicle = Vehicle::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $vehicle->vehicle_id,
                    'code' => $vehicle->vehicle_code,
                    'type' => $vehicle->vehicle_type,
                    'max_load_kg' => $vehicle->max_load_kg,
                    'max_length_cm' => $vehicle->max_length_cm,
                    'max_width_cm' => $vehicle->max_width_cm,
                    'max_height_cm' => $vehicle->max_height_cm,
                    'max_volume_m3' => $vehicle->max_volume_m3,
                    'route_scope' => $vehicle->route_scope,
                    'is_active' => $vehicle->is_active,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Vehicle not found'
            ], 404);
        }
    }
}
