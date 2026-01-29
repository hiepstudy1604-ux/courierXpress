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
            
            // Only get bills from shipments that are DELIVERED_SUCCESS
            $query = Bill::with(['shipment.user', 'user'])
                ->whereHas('shipment', function ($q) {
                    $q->where('shipment_status', 'DELIVERED_SUCCESS');
                });

            // Filter by user role
            if ($user->role === 'CUSTOMER') {
                $query->where('user_id', $user->id);
            } elseif ($user->role === 'AGENT') {
                // Agent can only see bills from their branch
                if ($user->branch_id) {
                    $query->whereHas('shipment', function ($q) use ($user) {
                        $q->where('assigned_branch_id', $user->branch_id);
                    });
                }
            }

            // Apply filters
            if ($request->has('tracking_id')) {
                $trackingId = $request->tracking_id;
                // Remove 'CX-' prefix if present and extract numeric ID
                $numericId = preg_replace('/^CX-/', '', $trackingId);
                $numericId = preg_replace('/[^0-9]/', '', $numericId);
                
                if ($numericId) {
                    $query->whereHas('shipment', function ($q) use ($numericId) {
                        $q->where('shipment_id', $numericId);
                    });
                }
            }
            
            if ($request->has('bill_id')) {
                $query->where('bill_number', 'like', '%' . $request->bill_id . '%');
            }
            
            if ($request->has('date')) {
                $query->whereDate('created_at', $request->date);
            }

            $perPage = $request->get('per_page', 1000); // Large number for frontend pagination
            $bills = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $bills->map(function ($bill) {
                    $shipment = $bill->shipment;
                    $trackingId = $shipment ? 'CX-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT) : null;
                    
                    return [
                        'id' => (string) $bill->id,
                        'bill_id' => $bill->bill_number,
                        'tracking_id' => $trackingId,
                        'trackingId' => $trackingId, // For compatibility
                        'amount' => (float) $bill->amount,
                        'total_amount' => (float) $bill->amount, // For compatibility
                        'status' => $bill->status,
                        'date' => $bill->created_at ? $bill->created_at->toDateString() : null,
                        'created_at' => $bill->created_at ? $bill->created_at->toISOString() : null,
                        'customer_name' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
                        'customer' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
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
                'message' => 'Error fetching bills: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get bill by ID
     */
    public function show($id)
    {
        try {
            $bill = Bill::with(['shipment.user', 'user'])->findOrFail($id);
            $user = Auth::user();

            // Check authorization
            if ($user->role === 'CUSTOMER' && $bill->user_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            } elseif ($user->role === 'AGENT') {
                if ($user->branch_id && $bill->shipment && $bill->shipment->assigned_branch_id !== $user->branch_id) {
                    return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
                }
            }

            $shipment = $bill->shipment;
            $trackingId = $shipment ? 'CX-' . str_pad((string) $shipment->shipment_id, 8, '0', STR_PAD_LEFT) : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => (string) $bill->id,
                    'bill_id' => $bill->bill_number,
                    'billId' => $bill->bill_number,
                    'tracking_id' => $trackingId,
                    'trackingId' => $trackingId,
                    'amount' => (float) $bill->amount,
                    'status' => $bill->status,
                    'date' => $bill->created_at ? $bill->created_at->toDateString() : null,
                    'created_at' => $bill->created_at ? $bill->created_at->toISOString() : null,
                    'customer_name' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
                    'customer' => $bill->user ? $bill->user->name : ($shipment && $shipment->user ? $shipment->user->name : null),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching bill: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching bill: ' . $e->getMessage()
            ], 500);
        }
    }
}
