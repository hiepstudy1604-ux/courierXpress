<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Agent;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BranchController extends Controller
{
    /**
     * Get all branches
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Branch::query();

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $branches = $query->with(['vehicles' => function ($q) {
            $q->select(['vehicles.vehicle_id', 'vehicles.vehicle_code', 'vehicles.vehicle_type', 'vehicles.max_load_kg', 'vehicles.max_volume_m3', 'vehicles.is_active']);
        }])->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $branches->map(function ($branch) {
                $vehicles = [
                    'motorbike' => $branch->motorbike ?? 0,
                    'truck_500kg' => $branch->truck_500kg ?? 0,
                    'truck_1t' => $branch->truck_1t ?? 0,
                    'truck_2t' => $branch->truck_2t ?? 0,
                    'truck_2_5t' => $branch->truck_2_5t ?? 0,
                    'truck_3_5t' => $branch->truck_3_5t ?? 0,
                    'truck_5t' => $branch->truck_5t ?? 0,
                ];

                $fleetByType = [
                    'Motorbike' => (int) ($branch->motorbike ?? 0),
                    '2-ton Truck' => (int) ($branch->truck_2t ?? 0),
                    '3.5-ton Truck' => (int) ($branch->truck_3_5t ?? 0),
                    '5-ton Truck' => (int) ($branch->truck_5t ?? 0),
                ];

                return [
                    'id' => (string) $branch->id,
                    'name' => $branch->name,
                    'location' => $branch->location,
                    'city' => $branch->city,
                    'district' => $branch->district,
                    'address' => $branch->address,
                    'status' => $branch->status,
                    'agent_code' => $branch->agent_code,
                    'branch_image' => $branch->branch_image ? asset('storage/' . $branch->branch_image) : null,
                    'branch_manager_name' => $branch->branch_manager_name,
                    'branch_manager_phone' => $branch->branch_manager_phone,
                    'vehicles' => $vehicles,
                    'fleet_by_type' => $fleetByType,
                    'assigned_vehicles' => $branch->vehicles?->map(function ($v) {
                        return [
                            'vehicle_id' => $v->vehicle_id,
                            'vehicle_code' => $v->vehicle_code,
                            'vehicle_type' => $v->vehicle_type,
                            'max_load_kg' => $v->max_load_kg,
                            'max_volume_m3' => $v->max_volume_m3,
                            'is_active' => $v->is_active,
                        ];
                    })->values(),
                    'total_shipments' => $branch->total_shipments ?? 0,
                    'active_shipments' => $branch->active_shipments ?? 0,
                ];
            })
        ]);
    }

/**
     * Get branch by ID
     */
public function show($id)
    {
        // 1. Tìm Branch theo ID
        $branch = Branch::find($id);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'Branch not found'
            ], 404);
        }

        // 2. Tìm Agent tương ứng qua mã code để lấy mật khẩu
        $agent = \App\Models\Agent::where('agent_code', $branch->agent_code)->first();
        
        // --- THÊM DÒNG NÀY ĐỂ KIỂM TRA ---
        if (!$agent) {
             dd("Tìm không thấy Agent có mã: " . $branch->agent_code);
        }

        // 3. Chuẩn bị dữ liệu trả về
        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $branch->id,
                'name' => $branch->name,
                'agent_code' => $branch->agent_code,
                'location' => $branch->location,
                'city' => $branch->city,
                'district' => $branch->district,
                'address' => $branch->address,
                'status' => $branch->status,
                'branch_manager_name' => $branch->branch_manager_name,
                'branch_manager_phone' => $branch->branch_manager_phone,
                'branch_image' => $branch->branch_image ? asset('storage/' . $branch->branch_image) : null,
                
                // Gom các cột xe cộ thành một object 'vehicles' cho Frontend dễ dùng
                'vehicles' => [
                    'motorbike' => $branch->motorbike ?? 0,
                    'truck_500kg' => $branch->truck_500kg ?? 0,
                    'truck_1t' => $branch->truck_1t ?? 0,
                    'truck_2t' => $branch->truck_2t ?? 0,
                    'truck_2_5t' => $branch->truck_2_5t ?? 0,
                    'truck_3_5t' => $branch->truck_3_5t ?? 0,
                    'truck_5t' => $branch->truck_5t ?? 0,
                ],

                // --- PHẦN QUAN TRỌNG: THÔNG TIN ĐĂNG NHẬP ---
                'login_info' => [
                    'email' => $agent ? $agent->email : 'N/A',
                    'password' => $agent ? $agent->raw_password : null, // Lấy password thô
                ],
            ]
        ]);
    }

    /**
     * Delete branch and related data
     */
    public function destroy($id)
    {
        $user = Auth::user();

        // 1. Chỉ Admin mới được xóa
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        try {
            // 2. Tìm Branch
            $branch = Branch::findOrFail($id);

            // 3. Tìm Agent liên quan (để xóa)
            $agent = \App\Models\Agent::where('agent_code', $branch->agent_code)->first();

            if ($agent) {
                // 4. Xóa tài khoản User đăng nhập của Agent đó
                if ($agent->user_id) {
                    \App\Models\User::destroy($agent->user_id);
                }
                // 5. Xóa hồ sơ Agent
                $agent->delete();
            }

            // 6. Cuối cùng xóa Branch
            $branch->delete();

            return response()->json([
                'success' => true, 
                'message' => 'Branch and related accounts deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Failed to delete branch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update branch and fleet data
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        // Only admin can update branches
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'password' => 'nullable|string|min:6',
            'name' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'branch_manager_name' => 'nullable|string|max:255',
            'branch_manager_phone' => 'nullable|string|max:50',
            'vehicles.motorbike' => 'nullable|integer|min:0',
            'vehicles.truck_500kg' => 'nullable|integer|min:0',
            'vehicles.truck_1t' => 'nullable|integer|min:0',
            'vehicles.truck_2t' => 'nullable|integer|min:0',
            'vehicles.truck_2_5t' => 'nullable|integer|min:0',
            'vehicles.truck_3_5t' => 'nullable|integer|min:0',
            'vehicles.truck_5t' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $branch = Branch::findOrFail($id);

        $branch->fill($request->only([
            'name',
            'city',
            'district',
            'address',
            'status',
            'branch_manager_name',
            'branch_manager_phone',
        ]));

        if ($request->has('city') || $request->has('district')) {
            $city = $request->input('city', $branch->city);
            $district = $request->input('district', $branch->district);
            $branch->location = trim($city . ', ' . $district, ', ');
        }

        if ($request->has('status')) {
            $branch->is_active = $request->input('status') === 'ACTIVE';
        }

        $branch->save();

        if ($request->filled('password')) {
            $newPassword = $request->input('password');
            
            // Tìm Agent theo mã Branch
            $agent = \App\Models\Agent::where('agent_code', $branch->agent_code)->first();
            
            if ($agent) {
                // a. Lưu mật khẩu thô vào bảng Agent (để admin xem lại được)
                $agent->raw_password = $newPassword;
                $agent->save();

                // b. Lưu mật khẩu mã hóa vào bảng User (để đăng nhập)
                if ($agent->user_id) {
                    $agentUser = \App\Models\User::find($agent->user_id);
                    if ($agentUser) {
                        $agentUser->password = $newPassword; // Model User của bạn tự hash hoặc bạn dùng Hash::make($newPassword)
                        $agentUser->save();
                    }
                }
            }
        }

        $agent = \App\Models\Agent::where('agent_code', $branch->agent_code)->first();

        if ($agent) {
            // A. Đồng bộ thông tin cơ bản sang AGENT
            $agent->name = $branch->branch_manager_name;  // Tên quản lý
            $agent->phone = $branch->branch_manager_phone; // SĐT
            $agent->status = $branch->status;              // Trạng thái (Active/Inactive)
            
            // Đồng bộ luôn số lượng xe sang Agent (để báo cáo khớp nhau)
            $agent->motorbike = $branch->motorbike;
            $agent->truck_500kg = $branch->truck_500kg;
            $agent->truck_1t = $branch->truck_1t;
            $agent->truck_2t = $branch->truck_2t;
            $agent->truck_2_5t = $branch->truck_2_5t;
            $agent->truck_3_5t = $branch->truck_3_5t;
            $agent->truck_5t = $branch->truck_5t;

            // B. Xử lý đổi mật khẩu (nếu có nhập)
            if ($request->filled('password')) {
                $agent->raw_password = $request->input('password');
            }
            
            $agent->save(); // Lưu Agent

            if ($agent->user_id) {
                $agentUser = \App\Models\User::find($agent->user_id);
                if ($agentUser) {
                    $agentUser->name = $branch->branch_manager_name; // Cập nhật tên hiển thị
                    $agentUser->phone = $branch->branch_manager_phone; // Cập nhật SĐT
                    $agentUser->status = $branch->status; // Khóa nick nếu Branch Inactive

                    // Đổi pass User nếu có yêu cầu
                    if ($request->filled('password')) {
                        $agentUser->password = $request->input('password'); // Laravel sẽ tự hash nếu Model User có setup, hoặc dùng Hash::make()
                    }
                    $agentUser->save();
                }
            }
        }

        if ($request->has('vehicles')) {
            $vehicles = $request->input('vehicles', []);
            foreach (
                [
                    'motorbike',
                    'truck_500kg',
                    'truck_1t',
                    'truck_2t',
                    'truck_2_5t',
                    'truck_3_5t',
                    'truck_5t',
                ] as $key
            ) {
                if (array_key_exists($key, $vehicles)) {
                    $branch->{$key} = $vehicles[$key];
                }
            }
            $branch->save();

            // Sync branch fleet into branch_vehicles pivot so reports use correct quantities
            $motorbike = (int) ($branch->motorbike ?? 0);
            $truck2t = (int) ($branch->truck_2t ?? 0);
            $truck3_5t = (int) ($branch->truck_3_5t ?? 0);
            $truck5t = (int) ($branch->truck_5t ?? 0);

            $vehicleByType = Vehicle::whereIn('vehicle_type', ['Motorbike', '2.5-ton Truck', '3.5-ton Truck', '5-ton Truck'])
                ->get(['vehicle_id', 'vehicle_type'])
                ->keyBy('vehicle_type');

            $syncRows = [];
            if (isset($vehicleByType['Motorbike'])) {
                $syncRows[$vehicleByType['Motorbike']->vehicle_id] = ['quantity' => $motorbike];
            }
            if (isset($vehicleByType['2.5-ton Truck'])) {
                $syncRows[$vehicleByType['2.5-ton Truck']->vehicle_id] = ['quantity' => $truck2t];
            }
            if (isset($vehicleByType['3.5-ton Truck'])) {
                $syncRows[$vehicleByType['3.5-ton Truck']->vehicle_id] = ['quantity' => $truck3_5t];
            }
            if (isset($vehicleByType['5-ton Truck'])) {
                $syncRows[$vehicleByType['5-ton Truck']->vehicle_id] = ['quantity' => $truck5t];
            }

            if (!empty($syncRows)) {
                $branch->vehicles()->syncWithoutDetaching($syncRows);
            }
        }

        $vehicles = [
            'motorbike' => $branch->motorbike ?? 0,
            'truck_500kg' => $branch->truck_500kg ?? 0,
            'truck_1t' => $branch->truck_1t ?? 0,
            'truck_2t' => $branch->truck_2t ?? 0,
            'truck_2_5t' => $branch->truck_2_5t ?? 0,
            'truck_3_5t' => $branch->truck_3_5t ?? 0,
            'truck_5t' => $branch->truck_5t ?? 0,
        ];

        return response()->json([
            'success' => true,
            'message' => 'Branch updated successfully',
            'data' => [
                'id' => (string) $branch->id,
                'name' => $branch->name,
                'location' => $branch->location,
                'city' => $branch->city,
                'district' => $branch->district,
                'address' => $branch->address,
                'status' => $branch->status,
                'agent_code' => $branch->agent_code,
                'branch_image' => $branch->branch_image ? asset('storage/' . $branch->branch_image) : null,
                'branch_manager_name' => $branch->branch_manager_name,
                'branch_manager_phone' => $branch->branch_manager_phone,
                'vehicles' => $vehicles,
                'total_shipments' => $branch->total_shipments ?? 0,
                'active_shipments' => $branch->active_shipments ?? 0,
            ]
        ]);
    }
}
