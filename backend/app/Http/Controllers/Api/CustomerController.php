<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Class CustomerController
 *
 * Purpose:
 * Handles API requests related to Customer management.
 * This includes listing customers with statistics, viewing specific details,
 * updating profiles, and deleting accounts. It implements Role-Based Access Control (RBAC).
 *
 * Mục đích:
 * Xử lý các yêu cầu API liên quan đến quản lý Khách hàng.
 * Bao gồm việc liệt kê khách hàng cùng với số liệu thống kê, xem chi tiết cụ thể,
 * cập nhật hồ sơ và xóa tài khoản. Nó thực thi Kiểm soát truy cập dựa trên vai trò (RBAC).
 */
class CustomerController extends Controller
{

    /**
     * Get all customers (Admin & Agent only)
     * Lấy danh sách tất cả khách hàng (Chỉ Admin & Agent)
     *
     * Purpose:
     * Retrieves a paginated list of customers, applying various filters (name, phone, city, etc.).
     * Calculates shipment statistics (total, success, failed) for each customer on the fly.
     *
     * Mục đích:
     * Truy xuất danh sách phân trang các khách hàng, áp dụng các bộ lọc khác nhau (tên, sđt, thành phố,...).
     * Tính toán thống kê vận đơn (tổng, thành công, thất bại) cho từng khách hàng ngay trong quá trình truy xuất.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // Get currently authenticated user / Lấy người dùng đang đăng nhập
        $user = Auth::user();

        // 1. Authorization Check / Kiểm tra quyền truy cập
        // Only ADMIN and AGENT roles can view the full customer list.
        // Chỉ vai trò ADMIN và AGENT mới có thể xem toàn bộ danh sách khách hàng.
        if (!in_array($user->role, ['ADMIN', 'AGENT'])) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // 2. Initialize Query Builder / Khởi tạo trình xây dựng truy vấn
        // Select users explicitly defined as 'CUSTOMER'.
        // Chọn người dùng được định nghĩa rõ ràng là 'CUSTOMER'.
        $query = User::where('role', 'CUSTOMER');

        // 3. Apply Filters / Áp dụng bộ lọc
        
        // Filter by Name / Lọc theo Tên
        if ($request->has('name')) {
            $query->where('name', 'like', '%' . $request->name . '%');
        }
        // Filter by Phone / Lọc theo Số điện thoại
        if ($request->has('phone')) {
            $query->where('phone', 'like', '%' . $request->phone . '%');
        }
        // Filter by Custom ID (e.g., KH-0001) / Lọc theo ID tùy chỉnh
        if ($request->has('customer_id')) {
            // Remove 'KH-' prefix to match database integer ID
            // Loại bỏ tiền tố 'KH-' để khớp với ID số nguyên trong cơ sở dữ liệu
            $customerId = str_replace('KH-', '', $request->customer_id);
            $query->where('id', 'like', '%' . $customerId . '%');
        }
        // Filter by City / Lọc theo Thành phố
        if ($request->has('city')) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }
        // Filter by Status / Lọc theo Trạng thái
        if ($request->has('status')) {
            // Map frontend display status to database values
            // Ánh xạ trạng thái hiển thị frontend sang giá trị trong database
            $status = $request->status === 'Active' ? 'ACTIVE' : ($request->status === 'Blocked' ? 'BLOCKED' : 'INACTIVE');
            $query->where('status', $status);
        }

        // 4. Pagination / Phân trang
        // Default to 1000 items if not specified (large default for admin dashboards)
        // Mặc định 1000 mục nếu không chỉ định (mặc định lớn cho bảng điều khiển admin)
        $perPage = $request->get('per_page', 1000);
        $customers = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // 5. Data Transformation & Statistics / Chuyển đổi dữ liệu & Thống kê
        // Iterate through the paginated collection to append shipment stats.
        // Lặp qua bộ sưu tập đã phân trang để đính kèm thống kê vận đơn.
        $customers->getCollection()->transform(function ($customer) {
            // Perform a sub-query to calculate orders for this specific customer
            // Thực hiện truy vấn phụ để tính toán đơn hàng cho khách hàng cụ thể này
            $stats = DB::table('shipments')
                ->where('user_id', $customer->id)
                ->selectRaw('COUNT(*) as total_orders') // Total shipments / Tổng vận đơn
                ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERED_SUCCESS", "CLOSED") THEN 1 END) as success_deliveries') // Successful ones / Đơn thành công
                ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERY_FAILED", "RETURN_COMPLETED", "DISPOSED") THEN 1 END) as failed_deliveries') // Failed ones / Đơn thất bại
                ->first();

            // Format the final output structure
            // Định dạng cấu trúc đầu ra cuối cùng
            return [
                'id' => 'KH-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT), // Format ID: KH-0001
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'city' => $customer->city,
                'totalOrders' => $stats->total_orders ?? 0,
                'successDeliveries' => $stats->success_deliveries ?? 0,
                'failedDeliveries' => $stats->failed_deliveries ?? 0,
                'status' => $customer->status === 'ACTIVE' ? 'Active' : ($customer->status === 'BLOCKED' ? 'Blocked' : 'Inactive'),
            ];
        });

        // 6. Return Response / Trả về phản hồi
        return response()->json([
            'success' => true,
            'data' => $customers->items(),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'total' => $customers->total(),
                'per_page' => $customers->perPage(),
            ]
        ]);
    }

    /**
     * Get customer by ID
     * Lấy thông tin khách hàng theo ID
     *
     * Purpose:
     * Fetches detailed information for a single customer, including aggregate stats
     * and a list of their recent shipments.
     *
     * Mục đích:
     * Lấy thông tin chi tiết cho một khách hàng, bao gồm thống kê tổng hợp
     * và danh sách các vận đơn gần đây của họ.
     *
     * @param string $id Format "KH-xxxx" or "xxxx"
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $user = Auth::user();
        // Normalize ID input
        // Chuẩn hóa đầu vào ID
        $customerId = str_replace('KH-', '', $id);

        // Authorization: A Customer can only view their own profile.
        // Quyền hạn: Khách hàng chỉ có thể xem hồ sơ của chính mình.
        if ($user->role === 'CUSTOMER' && $user->id != $customerId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Find customer or fail (404)
        // Tìm khách hàng hoặc báo lỗi (404)
        $customer = User::where('id', $customerId)->where('role', 'CUSTOMER')->firstOrFail();

        // Calculate statistics (same logic as index method)
        // Tính toán thống kê (logic tương tự phương thức index)
        $stats = DB::table('shipments')
            ->where('user_id', $customer->id)
            ->selectRaw('COUNT(*) as total_orders')
            ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERED_SUCCESS", "CLOSED") THEN 1 END) as success_deliveries')
            ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERY_FAILED", "RETURN_COMPLETED", "DISPOSED") THEN 1 END) as failed_deliveries')
            ->first();

        // Fetch recent shipments (Top 10 most recent)
        // Lấy các vận đơn gần đây (10 vận đơn mới nhất)
        $shipments = DB::table('shipments')
            ->where('user_id', $customer->id)
            ->select('shipment_id as id', 'shipment_status as status', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => 'KH-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT),
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'city' => $customer->city,
                'totalOrders' => $stats->total_orders ?? 0,
                'successDeliveries' => $stats->success_deliveries ?? 0,
                'failedDeliveries' => $stats->failed_deliveries ?? 0,
                'status' => $customer->status === 'ACTIVE' ? 'Active' : ($customer->status === 'BLOCKED' ? 'Blocked' : 'Inactive'),
                'shipments' => $shipments->map(function ($shipment) {
                    return [
                        'id' => (string) $shipment->id,
                        'trackingId' => 'CX-' . str_pad((string) $shipment->id, 6, '0', STR_PAD_LEFT),
                        'status' => $shipment->status,
                        'createdDate' => $shipment->created_at,
                    ];
                }),
            ]
        ]);
    }

    /**
     * Update customer profile
     * Cập nhật hồ sơ khách hàng
     *
     * Purpose:
     * Updates customer details. Handles complex authorization logic regarding who can update what.
     * Uses direct DB updates to potentially bypass problematic model events/observers.
     *
     * Mục đích:
     * Cập nhật thông tin chi tiết khách hàng. Xử lý logic phân quyền phức tạp về việc ai được cập nhật gì.
     * Sử dụng cập nhật DB trực tiếp để có thể bỏ qua các model events/observers gây lỗi.
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $customerId = (int) str_replace('KH-', '', $id);

        // Authorization logic / Logic phân quyền:
        // 1. Admin/Agent can update any customer. / Admin/Agent có thể cập nhật bất kỳ khách hàng nào.
        // 2. A Customer can only update their own profile. / Khách hàng chỉ cập nhật được hồ sơ của mình.
        // 3. A Customer cannot change their own status. / Khách hàng không thể đổi trạng thái của mình.
        $isOwner = $user->id === $customerId;

        if (in_array($user->role, ['ADMIN', 'AGENT'])) {
            // Admins and Agents are allowed to proceed.
            // Admin và Agent được phép tiếp tục.
        } elseif ($user->role === 'CUSTOMER' && $isOwner) {
            // Customers can edit their own profile, but not their status.
            // Khách hàng sửa được hồ sơ, nhưng chặn sửa trạng thái.
            if ($request->has('status')) {
                return response()->json(['success' => false, 'message' => 'You are not authorized to change your own status.'], 403);
            }
        } else {
            // All other cases are unauthorized.
            // Các trường hợp còn lại là không được phép.
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Verify customer existence
        // Xác minh khách hàng tồn tại
        $customer = User::where('id', $customerId)->where('role', 'CUSTOMER')->firstOrFail();

        // Validation / Xác thực dữ liệu
        $validator = \Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $customer->id,
            'phone' => 'sometimes|nullable|string|max:20',
            'address' => 'sometimes|nullable|string|max:500',
            'city' => 'sometimes|nullable|string|max:100',
            'status' => 'sometimes|string|in:Active,Blocked,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Build the data array for mass update (Only allow specific fields)
        // Xây dựng mảng dữ liệu để cập nhật hàng loạt (Chỉ cho phép các trường cụ thể)
        $updateData = $request->only(['name', 'email', 'phone', 'address', 'city']);

        // Handle Status Update (Admin/Agent Only)
        // Xử lý cập nhật Trạng thái (Chỉ Admin/Agent)
        if ($request->has('status') && in_array($user->role, ['ADMIN', 'AGENT'])) {
            $statusMap = [
                'Active' => 'ACTIVE',
                'Blocked' => 'BLOCKED',
                'Inactive' => 'INACTIVE'
            ];

            if (array_key_exists($request->status, $statusMap)) {
                $updateData['status'] = $statusMap[$request->status];
            }
        }

        if (!empty($updateData)) {
            // Use direct database update via Query Builder instead of Eloquent Model.
            // WHY: To bypass Eloquent model events or mutators that might be triggering 
            // unintended side effects (like re-hashing passwords or triggering auth checks).
            // TẠI SAO: Để bỏ qua các sự kiện model Eloquent hoặc mutators có thể gây ra 
            // tác dụng phụ không mong muốn (như hash lại mật khẩu hoặc kích hoạt kiểm tra xác thực).
            DB::table('users')->where('id', $customerId)->update($updateData);

            // Manually update the in-memory object for the response to reflect changes
            // Cập nhật thủ công đối tượng trong bộ nhớ để phản hồi phản ánh các thay đổi
            $customer->fill($updateData);
        }

        // Refetch stats to return complete object structure
        // Lấy lại thống kê để trả về cấu trúc đối tượng hoàn chỉnh
        $stats = DB::table('shipments')
            ->where('user_id', $customer->id)
            ->selectRaw('COUNT(*) as total_orders')
            ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERED_SUCCESS", "CLOSED") THEN 1 END) as success_deliveries')
            ->selectRaw('COUNT(CASE WHEN shipment_status IN ("DELIVERY_FAILED", "RETURN_COMPLETED", "DISPOSED") THEN 1 END) as failed_deliveries')
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data' => [
                'id' => 'KH-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT),
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'city' => $customer->city,
                'totalOrders' => $stats->total_orders ?? 0,
                'successDeliveries' => $stats->success_deliveries ?? 0,
                'failedDeliveries' => $stats->failed_deliveries ?? 0,
                'status' => $customer->status === 'ACTIVE' ? 'Active' : ($customer->status === 'BLOCKED' ? 'Blocked' : 'Inactive'),
            ]
        ]);
    }

    /**
     * Delete customer
     * Xóa khách hàng
     *
     * Purpose:
     * Permanently removes a customer record from the database.
     * Restricted strictly to Admin and Agent roles.
     *
     * Mục đích:
     * Xóa vĩnh viễn bản ghi khách hàng khỏi cơ sở dữ liệu.
     * Giới hạn nghiêm ngặt cho vai trò Admin và Agent.
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $user = Auth::user();

        // 1. Authorization: Only Admin and Agent have permission to delete
        // 1. Phân quyền: Chỉ Admin và Agent mới có quyền xóa
        if (!in_array($user->role, ['ADMIN', 'AGENT'])) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // 2. Process ID: Remove 'KH-' prefix and cast to int to find in DB accurately
        // Example: "KH-0018" -> "0018" -> 18
        // 2. Xử lý ID: Xóa tiền tố 'KH-' và ép kiểu sang int để tìm trong DB chính xác
        $customerId = (int) str_replace('KH-', '', $id);

        try {
            // Find User with corresponding ID and must be role CUSTOMER
            // Tìm User với ID tương ứng và bắt buộc vai trò là CUSTOMER
            $customer = User::where('id', $customerId)->where('role', 'CUSTOMER')->firstOrFail();

            // Execute delete (Standard Eloquent delete)
            // Thực hiện xóa (Xóa Eloquent tiêu chuẩn)
            $customer->delete();

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete customer. Error: ' . $e->getMessage()
            ], 500);
        }
    }
}