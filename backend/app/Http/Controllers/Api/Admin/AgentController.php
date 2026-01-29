<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Branch;
use App\Models\BranchVehicle;
use App\Models\Notification;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    /**
     * Create new agent/branch
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Only admin can create agents
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string|max:255',
            'branch_manager_name' => 'required|string|max:255',
            'branch_manager_phone' => 'required|string',
            'branch_image' => 'nullable|image|max:2048',
            'address.city' => 'required|string',
            'address.district' => 'required|string',
            'address.street' => 'required|string',
            'vehicles.motorbike' => 'nullable|integer|min:0',
            'vehicles.truck_2t' => 'nullable|integer|min:0',
            'vehicles.truck_3_5t' => 'nullable|integer|min:0',
            'vehicles.truck_5t' => 'nullable|integer|min:0',
            'login.status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generate agent code: CE-[MÃ TP]-[QUẬN]-[TÊN]
        $agentCode = $this->generateAgentCode(
            $request->input('address.city'),
            $request->input('address.district'),
            $request->branch_name
        );

        // Handle image upload
        $imagePath = null;
        if ($request->hasFile('branch_image')) {
            $image = $request->file('branch_image');
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('branches', $imageName, 'public');
        }

        // Create branch + agent atomically
        $branch = null;
        $agent = null;

        $branchStatus = $request->input('login.status', 'active') === 'active' ? 'ACTIVE' : 'INACTIVE';

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
        $branch = Branch::create([
                'branch_code' => $agentCode,
            'name' => $request->branch_name,
            'location' => $request->input('address.city') . ', ' . $request->input('address.district'),
            'city' => $request->input('address.city'),
            'district' => $request->input('address.district'),
            'address' => $request->input('address.street'),
            'branch_image' => $imagePath,
            'branch_manager_name' => $request->branch_manager_name,
            'branch_manager_phone' => $request->branch_manager_phone,
            'agent_code' => $agentCode,
                'status' => $branchStatus,
            'motorbike' => $request->input('vehicles.motorbike', 0),
            'truck_500kg' => $request->input('vehicles.truck_500kg', 0),
            'truck_1t' => $request->input('vehicles.truck_1t', 0),
            'truck_2t' => $request->input('vehicles.truck_2t', 0),
            'truck_2_5t' => $request->input('vehicles.truck_2_5t', 0),
            'truck_3_5t' => $request->input('vehicles.truck_3_5t', 0),
            'truck_5t' => $request->input('vehicles.truck_5t', 0),
            'total_shipments' => 0,
            'active_shipments' => 0,
        ]);

        // Create agent
$agentStatus = $branchStatus;
        // Ưu tiên dùng email từ frontend gửi lên, nếu không có thì tự tạo
        $agentEmail = $request->input('branch_manager_email') 
                      ?? strtolower(str_replace('-', '', $agentCode)) . '@courierexpress.com';

        // Ưu tiên dùng password từ frontend gửi lên, nếu không có thì tự tạo
        $loginPassword = $request->input('password') ?? $this->generatePassword();

        // Create User account
        $agentUser = User::create([
            'name' => $request->branch_manager_name,
            'email' => $agentEmail,
            'password' => $loginPassword, // User model sẽ tự hash cái này
            'role' => 'AGENT',
            'branch_id' => $branch->id,
            'phone' => $request->branch_manager_phone,
            'status' => $branchStatus,
        ]);

        $agent = Agent::create([
            'agent_code' => $agentCode,
            'name' => $request->branch_manager_name,
            'phone' => $request->branch_manager_phone,
            'email' => $agentEmail,
            'branch_id' => $branch->id,
            'user_id' => $agentUser->id,
            'status' => $agentStatus,
            'raw_password' => $loginPassword, // <--- LƯU PASSWORD ĐỂ XEM LẠI SAU NÀY
                'motorbike' => $request->input('vehicles.motorbike', 0),
                'truck_500kg' => $request->input('vehicles.truck_500kg', 0),
                'truck_1t' => $request->input('vehicles.truck_1t', 0),
                'truck_2t' => $request->input('vehicles.truck_2t', 0),
                'truck_2_5t' => $request->input('vehicles.truck_2_5t', 0),
                'truck_3_5t' => $request->input('vehicles.truck_3_5t', 0),
                'truck_5t' => $request->input('vehicles.truck_5t', 0),
                'total_shipments' => 0,
                'active_shipments' => 0,
            ]);

            // Sync branch fleet into branch_vehicles pivot so reports use correct quantities
            $motorbike = (int) $request->input('vehicles.motorbike', 0);
            $truck2t = (int) $request->input('vehicles.truck_2t', 0);
            $truck3_5t = (int) $request->input('vehicles.truck_3_5t', 0);
            $truck5t = (int) $request->input('vehicles.truck_5t', 0);

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

            \Illuminate\Support\Facades\DB::commit();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();

            // Clean up uploaded image if DB write fails
            if ($imagePath) {
                try {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($imagePath);
                } catch (\Throwable $ignored) {
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to create agent',
                'error' => $e->getMessage(),
            ], 500);
        }

        // Send notification to all admins (email + password already created above)
        $this->notifyAdminsAboutNewAgent($agent, $agentEmail, $loginPassword, $request->branch_name);

        // Return response with email and password (password is plain text here for display, already hashed in DB)
        return response()->json([
            'success' => true,
            'message' => 'Agent created successfully',
            'data' => [
                'id' => (string) $branch->id,
                'agent_code' => $agentCode,
                'name' => $branch->name,
                'branch_image' => $imagePath ? asset('storage/' . $imagePath) : null,
                'login' => [
                    'email' => $agentEmail, // Email for login
                    'password' => $loginPassword, // Plain password (already saved hashed in DB)
                ],
            ]
        ], 201);
    }

    /**
     * Check agent code availability
     */
    public function checkAvailability($agentCode)
    {
        $exists = Branch::where('agent_code', $agentCode)->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'available' => !$exists,
                'agent_code' => $agentCode,
            ]
        ]);
    }

    /**
     * Generate login ID
     */
    private function generateLoginId($city, $district, $branchName)
    {
        $cityCode = strtoupper(substr($city, 0, 2));
        $districtCode = strtoupper(substr($district, 0, 2));
        $branchCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $branchName), 0, 3));
        return $cityCode . '-' . $districtCode . '-' . $branchCode;
    }

    /**
     * Generate password
     */
    private function generatePassword($length = 12)
    {
        return Str::random($length);
    }

    /**
     * Generate agent code: CE-[MÃ TP]-Q[QUẬN]-[TÊN]
     */
    private function generateAgentCode($city, $district, $branchName)
    {
        // Map city to code
        $cityMap = [
            'Hanoi' => 'HN',
            'Ho Chi Minh City' => 'SG',
            'Danang' => 'DN',
            'Da Nang' => 'DN',
            'Khanh Hoa' => 'KH',
        ];
        
        $cityCode = $cityMap[$city] ?? strtoupper(substr($city, 0, 2));
        
        // Map common districts
        $districtMap = [
            'Cau Giay' => 'QCG',
            'Nam Tu Liem' => 'QNTL',
            'Tan Binh' => 'QTB',
            'District 1' => 'Q1',
            'District 3' => 'Q3',
            'District 11' => 'Q11',
            'Binh Thanh' => 'QBT',
            'Thu Duc' => 'QTP',
            'Ngu Hanh Son' => 'QNHS',
            'Lien Chieu' => 'QLC',
            'Nha Trang' => 'QNT',
        ];
        
        $districtCode = $districtMap[$district] ?? 'Q' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $district), 0, 3));
        
        // Ensure district code starts with Q
        if (strpos($districtCode, 'Q') !== 0) {
            $districtCode = 'Q' . $districtCode;
        }
        
        // Clean branch name (remove special chars, take first few uppercase letters)
        $cleanName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $branchName));
        $nameCode = substr($cleanName, 0, min(10, strlen($cleanName)));
        
        return "CE-{$cityCode}-{$districtCode}-{$nameCode}";
    }

    /**
     * Notify all admins about new agent creation with login credentials
     */
    private function notifyAdminsAboutNewAgent(Agent $agent, $email, $password, $branchName)
    {
        try {
            // Get all admin users
            $admins = User::where('role', 'ADMIN')->get();

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'agent_created',
                    'title' => 'Agent mới được tạo',
                    'message' => "Chi nhánh '{$branchName}' và tài khoản agent đã được tạo thành công.\n\n" .
                                 "📧 Email: {$email}\n" .
                                 "🔑 Password: {$password}\n\n" .
                                 "⚠️ Vui lòng gửi thông tin đăng nhập cho agent và yêu cầu đổi password lần đầu.",
                    'related_type' => 'agent',
                    'related_id' => $agent->id,
                    'is_read' => false,
                ]);
            }
        } catch (\Throwable $e) {
            // Log error but don't fail the agent creation
            \Illuminate\Support\Facades\Log::error('Failed to create notification for new agent', [
                'agent_id' => $agent->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
