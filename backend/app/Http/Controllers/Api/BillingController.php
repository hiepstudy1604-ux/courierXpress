<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    /**
     * Get all bills (only from successfully delivered shipments)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            // Step 1: Initialize query and eager load relationships
            // We only retrieve bills where the associated shipment status is 'DELIVERED_SUCCESS'
            $query = Bill::with(['shipment.user', 'user'])
                ->whereHas('shipment', function ($q) {
                    $q->where('shipment_status', 'DELIVERED_SUCCESS');
                });

            // Step 2: Apply Role-Based Access Control (RBAC)
            if ($user->role === 'CUSTOMER') {
                // Customers can only view their own bills
                $query->where('user_id', $user->id);
            } elseif ($user->role === 'AGENT') {
                // Agents can only see bills from shipments assigned to their specific branch
                if ($user->branch_id) {
                    $query->whereHas('shipment', function ($q) use ($user) {
                        $q->where('assigned_branch_id', $user->branch_id);
                    });
                }
            }

            // Step 3: Apply Customer Name Search Filter
            // Only Admins and Agents are allowed to search by customer name
            if ($request->has('customer_name') && in_array($user->role, ['ADMIN', 'AGENT'])) {
                $name = $request->customer_name;
                $query->whereHas('user', function ($q) use ($name) {
                    $q->where('name', 'like', '%' . $name . '%');
                });
                // Note: For Agents, this search is automatically restricted to their branch 
                // due to the 'assigned_branch_id' constraint applied in Step 2.
            }

            // Step 4: Apply Tracking ID Filter
            if ($request->has('tracking_id')) {
                $trackingId = $request->tracking_id;
                // Sanitize input: Remove 'CX-' prefix and keep only numeric digits
                $numericId = preg_replace('/^CX-/', '', $trackingId);
                $numericId = preg_replace('/[^0-9]/', '', $numericId);

                if ($numericId) {
                    $query->whereHas('shipment', function ($q) use ($numericId) {
                        $q->where('shipment_id', $numericId);
                    });
                }
            }

            // Step 5: Apply Bill ID Filter
            if ($request->has('bill_id')) {
                $billId = $request->bill_id;
                $query->where(function ($q) use ($billId) {
                    $q->where('bill_number', $billId)
                        ->orWhere('id', $billId);
                });
            }

            // Step 6: Apply Date Filter
            if ($request->has('date')) {
                $query->whereDate('created_at', $request->date);
            }

            // Step 7: Pagination and Execution
            $perPage = $request->get('per_page', 1000);
            $bills = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Step 8: Transform data for Response
            return response()->json([
                'success' => true,
                'data' => $bills->map(function ($bill) {
                    $shipment = $bill->shipment;
                    // Format tracking ID to standard CX-00000000 format
                    $trackingId = $shipment ? 'CX-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT) : null;

                    return [
                        'id' => (string) $bill->id,
                        'bill_id' => $bill->bill_number,
                        'tracking_id' => $trackingId,
                        'amount' => (float) $bill->amount,
                        'status' => $bill->status,
                        'date' => $bill->created_at ? $bill->created_at->toDateString() : null,
                        'customer_name' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
                    ];
                }),
                'meta' => [
                    'current_page' => $bills->currentPage(),
                    'total' => $bills->total(),
                    'per_page' => $bills->perPage(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching bills: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal Server Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single bill details by ID
     */
    public function show($id)
    {
        try {
            $bill = Bill::with(['shipment.user', 'user'])->findOrFail($id);
            $user = Auth::user();

            // Security Check: Ensure user has permission to view this specific bill
            if ($user->role === 'CUSTOMER' && $bill->user_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access'], 403);
            } elseif ($user->role === 'AGENT') {
                if ($user->branch_id && $bill->shipment && $bill->shipment->assigned_branch_id !== $user->branch_id) {
                    return response()->json(['success' => false, 'message' => 'Unauthorized access to this branch bill'], 403);
                }
            }

            $shipment = $bill->shipment;
            $trackingId = $shipment ? 'CX-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT) : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => (string) $bill->id,
                    'bill_id' => $bill->bill_number,
                    'tracking_id' => $trackingId,
                    'amount' => (float) $bill->amount,
                    'status' => $bill->status,
                    'date' => $bill->created_at ? $bill->created_at->toDateString() : null,
                    'customer_name' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching bill details: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Bill not found or error occurred'
            ], 500);
        }
    }
}
