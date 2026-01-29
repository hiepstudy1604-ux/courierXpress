<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\ProhibitedCategory;
use App\Models\ProhibitedKeyword;
use App\Models\Notification;
use App\Models\Shipment;
use App\Models\User;
use App\Models\ProvinceMaster;
use App\Models\ProvinceAlias;
use App\Models\DistrictMaster;
use App\Models\DistrictAlias;
use App\Models\WardMaster;
use App\Models\WardAlias;
use App\Models\Vehicle;
use App\Models\VehicleSupportedGoods;
use App\Models\Branch;
use App\Models\VehicleLoadTracking;
use App\Models\ShipmentVehicleAssignmentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CourierController extends Controller
{
    /**
     * Get all couriers
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Courier::with(['user', 'branch', 'agent']);

        // Filter by user role
        if ($user->role === 'CUSTOMER') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'AGENT') {
            $query->where('agent_id', $user->branch?->agents?->first()?->id ?? -1);
        }

        // Apply filters
        if ($request->has('tracking_id')) {
            $query->where('tracking_id', 'like', '%' . $request->tracking_id . '%');
        }
        if ($request->has('branch_id') && $user->role === 'ADMIN') {
            $query->where('branch_id', $request->branch_id);
        }

        $perPage = $request->get('per_page', 100);
        $couriers = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $couriers->map(function ($courier) {
                return $this->formatCourier($courier);
            }),
            'meta' => [
                'current_page' => $couriers->currentPage(),
                'total' => $couriers->total(),
                'per_page' => $couriers->perPage(),
            ]
        ]);
    }

    /**
     * Get courier by ID
     */
    public function show($id)
    {
        $courier = Courier::with(['user', 'branch', 'agent'])->findOrFail($id);
        $user = Auth::user();

        // Check authorization
        if ($user->role === 'CUSTOMER' && $courier->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatCourier($courier)
        ]);
    }

    /**
     * Quote shipping fee (Step 1)
     * - Validate input and coverage
     * - Calculate pricing breakdown
     * - Does NOT create any DB record
     */
    public function quote(Request $request)
    {
        try {
            $user = Auth::user();

            $validationResult = $this->validateStep1Input($request);
            if (!$validationResult['valid']) {
                Log::warning('Quote courier order validation failed', [
                    'user_id' => $user?->id,
                    'errors' => $validationResult['errors'] ?? null,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validationResult['errors']
                ], 422);
            }

            // Coverage check (same as store, but without creating drafts)
            try {
                $senderAddress = $request->input('sender.address_detail') . ', ' . $request->input('sender.ward') . ', ' . $request->input('sender.province');
                $receiverAddress = $request->input('receiver.address_detail') . ', ' . $request->input('receiver.ward') . ', ' . $request->input('receiver.province');

                $senderGeo = $this->normalizeAddress($senderAddress);
                $receiverGeo = $this->normalizeAddress($receiverAddress);

                $branches = Branch::where('is_active', true)->get();
                $hasBranchWithGeo = false;
                $minDistanceKm = PHP_FLOAT_MAX;

                foreach ($branches as $branch) {
                    if (!$branch->latitude || !$branch->longitude) {
                        continue;
                    }
                    $hasBranchWithGeo = true;

                    $distance = $this->geoDistanceKm(
                        ['lat' => (float) $senderGeo['geo']['lat'], 'lng' => (float) $senderGeo['geo']['lng']],
                        ['lat' => (float) $branch->latitude, 'lng' => (float) $branch->longitude]
                    );

                    if ($distance < $minDistanceKm) {
                        $minDistanceKm = $distance;
                    }
                }

                $MAX_COVERAGE_KM = 150;
                if ($hasBranchWithGeo && $minDistanceKm > $MAX_COVERAGE_KM) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Outside service coverage area',
                        'errors' => [
                            'coverage' => 'Outside service coverage area',
                        ],
                    ], 422);
                }

                unset($receiverGeo);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outside service coverage area',
                    'errors' => [
                        'coverage' => 'Outside service coverage area',
                    ],
                ], 422);
            }

            $serviceType = $request->input('service_type') === 'EXPRESS' ? 'Express' : 'Standard';
            $senderProvince = $request->input('sender.province');
            $receiverProvince = $request->input('receiver.province');

            $routeType = $this->determineRouteType($senderProvince, $receiverProvince);

            $items = $request->input('items', []);
            $totalWeight = 0;
            $totalVolume = 0;

            foreach ($items as $item) {
                $weightKg = ($item['weight_g'] ?? 0) / 1000;
                $totalWeight += $weightKg;

                if ($serviceType === 'Standard') {
                    $volume = ($item['length_cm'] ?? 0) * ($item['width_cm'] ?? 0) * ($item['height_cm'] ?? 0);
                    $totalVolume += $volume;
                } else {
                    $expressSizes = [
                        'S' => 20 * 20 * 10,
                        'M' => 30 * 30 * 15,
                        'L' => 40 * 40 * 20,
                        'XL' => 50 * 50 * 25,
                    ];
                    $totalVolume += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
                }
            }

            $volumetricWeight = $totalVolume / 5000;
            $chargeableWeight = max($totalWeight, $volumetricWeight);

            $originCity = $this->determineCityType($senderProvince);
            $destinationCity = $this->determineCityType($receiverProvince);

            $estimatedFee = $this->calculateShippingFeeByRules(
                $serviceType,
                $routeType,
                $originCity,
                $destinationCity,
                $chargeableWeight,
                $totalVolume
            );

            // For display breakdown (mirror calculateShippingFee)
            $basePrice = 0;
            $extraWeightPrice = 0;

            if ($serviceType === 'Standard' && $chargeableWeight < 20) {
                if ($routeType === 'intra_province' || $routeType === 'intra_region') {
                    $basePrice = 30000;
                } elseif ($routeType === 'adjacent_region') {
                    $basePrice = 32000;
                } else {
                    $basePrice = 35000;
                }

                if ($chargeableWeight > 3) {
                    $extraWeight = $chargeableWeight - 3;
                    if ($routeType === 'intra_province' || $routeType === 'intra_region') {
                        $extraWeightPrice = ceil($extraWeight / 0.5) * 2500;
                    } else {
                        $extraWeightPrice = ceil($extraWeight / 0.5) * 5000;
                    }
                }
            } else {
                $basePrice = $estimatedFee;
            }

            $senderAddress = $request->input('sender.address_detail') . ', ' . $request->input('sender.province');
            $receiverAddress = $request->input('receiver.address_detail') . ', ' . $request->input('receiver.province');

            $vehicleResult = $this->determineVehicleTypeForCourier(
                $senderAddress,
                $receiverAddress,
                $serviceType,
                $chargeableWeight,
                $totalVolume,
                $items,
                null
            );

            $sla = $this->estimateSLA($routeType, $serviceType);

            return response()->json([
                'success' => true,
                'message' => 'Quote calculated successfully',
                'data' => [
                    'status' => 'QUOTE',
                    'estimated_fee' => $estimatedFee,
                    'pricing_breakdown' => [
                        'base_price' => $basePrice,
                        'extra_weight_price' => $extraWeightPrice,
                        'chargeable_weight' => round($chargeableWeight, 2),
                        'actual_weight' => round($totalWeight, 2),
                        'volumetric_weight' => round($volumetricWeight, 2),
                        'route_type' => $routeType,
                        'vehicle_type' => $vehicleResult['vehicle_type'] ?? null,
                        'sla' => $sla,
                    ],
                    'sla' => $sla,
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('Quote calculation failed: ' . $e->getMessage(), [
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Quote calculation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new order - Comprehensive flow (Steps 2-5)
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            $user = Auth::user();

            // Step 1: Validate input (client-side validation should have passed)
            $validationResult = $this->validateStep1Input($request);
            if (!$validationResult['valid']) {
                Log::warning('Create courier order validation failed', [
                    'user_id' => $user?->id,
                    'errors' => $validationResult['errors'] ?? null,
                    'sender' => $request->input('sender'),
                    'receiver' => $request->input('receiver'),
                    'service_type' => $request->input('service_type'),
                    'pickup_date' => $request->input('pickup_date'),
                    'pickup_slot' => $request->input('pickup_slot'),
                    'payment_method' => $request->input('payment_method'),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validationResult['errors']
                ], 422);
            }

            // Coverage check (block Step1 if outside service area)
            // We intentionally do this BEFORE creating the Courier record to avoid generating orphan drafts.
            try {
                $senderAddress = $request->input('sender.address_detail') . ', ' . $request->input('sender.ward') . ', ' . $request->input('sender.province');
                $receiverAddress = $request->input('receiver.address_detail') . ', ' . $request->input('receiver.ward') . ', ' . $request->input('receiver.province');

                // Normalize will throw if province cannot be determined (treat as out-of-coverage/unserviceable)
                $senderGeo = $this->normalizeAddress($senderAddress);
                $receiverGeo = $this->normalizeAddress($receiverAddress);

                $branches = Branch::where('is_active', true)->get();
                $hasBranchWithGeo = false;
                $minDistanceKm = PHP_FLOAT_MAX;

                foreach ($branches as $branch) {
                    if (!$branch->latitude || !$branch->longitude) {
                        continue;
                    }
                    $hasBranchWithGeo = true;

                    $distance = $this->geoDistanceKm(
                        ['lat' => (float) $senderGeo['geo']['lat'], 'lng' => (float) $senderGeo['geo']['lng']],
                        ['lat' => (float) $branch->latitude, 'lng' => (float) $branch->longitude]
                    );

                    if ($distance < $minDistanceKm) {
                        $minDistanceKm = $distance;
                    }
                }

                // If we have no geo-enabled branches, skip coverage enforcement (cannot compute coverage)
                // Otherwise enforce a max distance threshold.
                $MAX_COVERAGE_KM = 150;
                if ($hasBranchWithGeo && $minDistanceKm > $MAX_COVERAGE_KM) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Outside service coverage area',
                        'errors' => [
                            'coverage' => 'Outside service coverage area',
                        ],
                    ], 422);
                }

                // Also ensure receiver province normalization succeeded (if not, will be caught)
                unset($receiverGeo);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outside service coverage area',
                    'errors' => [
                        'coverage' => 'Outside service coverage area',
                    ],
                ], 422);
            }

            // Check idempotency - only for orders that have been priced or confirmed
            // Allow re-submission if order is still BOOKED (user can go back and modify)
            if ($request->has('idempotency_key')) {
                $existing = Courier::where('input_snapshot->idempotency_key', $request->idempotency_key)
                    ->whereIn('status', ['PRICE_ESTIMATED', 'CONFIRMED'])
                    ->first();
                if ($existing) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Duplicate request detected',
                        'order_id' => $existing->order_id,
                        'tracking_code' => $existing->tracking_id
                    ], 409);
                }

                // No BOOKED stage in the 2-step flow; keep existing priced/confirmed idempotency protection only
            }

            // Step 2: Create order record with status BOOKED
            $orderId = 'ORD-' . date('Ymd') . '-' . strtoupper(Str::random(8));
            $trackingCode = 'CX-' . strtoupper(Str::random(10));

            // Ensure unique tracking code
            $maxRetries = 5;
            $retryCount = 0;
            while (Courier::where('tracking_id', $trackingCode)->exists() && $retryCount < $maxRetries) {
                $trackingCode = 'CX-' . strtoupper(Str::random(10));
                $retryCount++;
            }
            if ($retryCount >= $maxRetries) {
                throw new \Exception('Failed to generate unique tracking code');
            }

            // Calculate total weight from items
            $items = $request->input('items', []);
            $totalWeight = array_sum(array_column($items, 'weight_g')) / 1000; // Convert to kg

            // Store input snapshot
            $inputSnapshot = [
                'idempotency_key' => $request->idempotency_key ?? Str::uuid()->toString(),
                'sender' => $request->input('sender'),
                'receiver' => $request->input('receiver'),
                'service_type' => $request->input('service_type'),
                'items' => $items,
                'pickup_date' => $request->input('pickup_date'),
                'pickup_slot' => $request->input('pickup_slot'),
                'inspection_policy' => $request->input('inspection_policy'),
                'payment_method' => $request->input('payment_method'),
                'note' => $request->input('note'),
                'submitted_at' => now()->toISOString(),
            ];

            $courier = Courier::create([
                'order_id' => $orderId,
                'tracking_id' => $trackingCode,
                'user_id' => $user->id,
                'created_by' => $user->id,
                'branch_id' => null,
                'sender_name' => $request->input('sender.name'),
                'sender_phone' => $request->input('sender.phone'),
                'sender_address' => $request->input('sender.address_detail'),
                'sender_ward' => $request->input('sender.ward'),
                'sender_district' => null,
                'sender_province' => $request->input('sender.province'),
                'receiver_name' => $request->input('receiver.name'),
                'receiver_phone' => $request->input('receiver.phone'),
                'receiver_address' => $request->input('receiver.address_detail'),
                'receiver_ward' => $request->input('receiver.ward'),
                'receiver_district' => null,
                'receiver_province' => $request->input('receiver.province'),
                'service_type' => $request->input('service_type') === 'EXPRESS' ? 'Express' : 'Standard',
                'weight' => $totalWeight,
                'items' => $items,
                'pickup_date' => $request->input('pickup_date'),
                'pickup_slot' => $request->input('pickup_slot'),
                'inspection_policy' => $request->input('inspection_policy'),
                'payment_method' => $request->input('payment_method'),
                'delivery_notes' => $request->input('note'),
                'input_snapshot' => $inputSnapshot,
                'base_charge' => 0, // Will be updated after pricing calculation
                'tax' => 0, // Will be updated after pricing calculation
                'total' => 0, // Will be updated after pricing calculation
                'status' => 'PRICE_ESTIMATED',
                'booking_date' => now(),
            ]);

            // Step 3: Validate address, service, and items
            $validationResult = $this->validateStep3($courier);
            if (!$validationResult['valid']) {
                $courier->update(['status' => 'CLOSED']);
                DB::commit();
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validationResult['errors'],
                    'order_id' => $orderId,
                    'tracking_code' => $trackingCode,
                ], 422);
            }

            // Step 4: Calculate shipping fee
            $pricingResult = $this->calculateShippingFee($courier);
            if (!$pricingResult['success']) {
                $courier->update(['status' => 'CLOSED']);
                DB::commit();
                return response()->json([
                    'success' => false,
                    'message' => 'Pricing calculation failed',
                    'errors' => $pricingResult['errors'] ?? ['Pricing engine error'],
                    'order_id' => $orderId,
                    'tracking_code' => $trackingCode,
                ], 500);
            }

            // Update order with pricing
            $courier->update([
                'estimated_fee' => $pricingResult['estimated_fee'],
                'pricing_breakdown' => $pricingResult['breakdown'],
                'base_charge' => $pricingResult['breakdown']['base_price'] ?? 0,
                'tax' => ($pricingResult['estimated_fee'] ?? 0) * 0.1,
                'total' => ($pricingResult['estimated_fee'] ?? 0) * 1.1,
                'vehicle_type' => $pricingResult['breakdown']['vehicle_type'] ?? null,
                'status' => 'PRICE_ESTIMATED',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order created and price estimated successfully',
                'data' => [
                    'order_id' => $orderId,
                    'tracking_code' => $trackingCode,
                    'status' => 'PRICE_ESTIMATED',
                    'estimated_fee' => $pricingResult['estimated_fee'],
                    'pricing_breakdown' => $pricingResult['breakdown'],
                    'sla' => $pricingResult['breakdown']['sla'] ?? null,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order creation failed: ' . $e->getMessage(), [
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Order creation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirm order (Step 5)
     */
    public function confirmOrder(Request $request, $orderId)
    {
        $courier = Courier::where('order_id', $orderId)->orWhere('id', $orderId)->firstOrFail();
        $user = Auth::user();

        // Check authorization
        if ($courier->user_id !== $user->id && $user->role !== 'ADMIN' && $user->role !== 'AGENT') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($courier->status !== 'PRICE_ESTIMATED') {
            return response()->json([
                'success' => false,
                'message' => 'Order is not in PRICE_ESTIMATED status'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $courier->update([
                'status' => 'BOOKED',
            ]);

            // Create bill
            $bill = $courier->bills()->create([
                'bill_number' => 'BILL-' . strtoupper(Str::random(8)),
                'user_id' => $user->id,
                'amount' => $courier->total,
                'status' => $courier->payment_method === 'TRANSFER' ? 'PAID' : 'UNPAID',
            ]);

            // Sync to shipments table after booking confirmation
            // Keep shipment status aligned with what the frontend expects in Booked view
            $this->syncShipmentFromCourier($courier, 'BOOKED');

            // Send notifications to admin, agent, and customer
            $this->sendOrderConfirmedNotifications($courier);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order confirmed successfully',
                'data' => $this->formatCourier($courier->load(['user', 'branch', 'agent']))
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order confirmation failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Order confirmation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get suitable vehicles for courier order (for Admin/Agent to assign)
     */
    public function getSuitableVehicles($orderId)
    {
        $courier = Courier::where('order_id', $orderId)->orWhere('id', $orderId)->firstOrFail();
        $user = Auth::user();

        // Check authorization - only Admin and Agent can assign vehicles
        if ($user->role !== 'ADMIN' && $user->role !== 'AGENT') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        try {
            // Get order details
            $senderAddress = $courier->sender_address . ', ' . $courier->sender_province;
            $receiverAddress = $courier->receiver_address . ', ' . $courier->receiver_province;
            $serviceType = $courier->service_type === 'Express' ? 'Express' : 'Standard';

            // Calculate weight and volume
            $items = $courier->items ?? [];
            $totalWeight = 0;
            $totalVolume = 0;

            foreach ($items as $item) {
                $weightKg = ($item['weight_g'] ?? 0) / 1000;
                $totalWeight += $weightKg;

                if ($serviceType === 'Standard') {
                    $volume = ($item['length_cm'] ?? 0) * ($item['width_cm'] ?? 0) * ($item['height_cm'] ?? 0);
                    $totalVolume += $volume;
                } else {
                    $expressSizes = [
                        'S' => 20 * 20 * 10,
                        'M' => 30 * 30 * 15,
                        'L' => 40 * 40 * 20,
                        'XL' => 50 * 50 * 25,
                    ];
                    $totalVolume += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
                }
            }

            $volumetricWeight = $totalVolume / 5000;
            $chargeableWeight = max($totalWeight, $volumetricWeight);
            $volumeM3 = $totalVolume / 1000000;

            // Determine nearest branch
            $branch = $this->determineNearestBranch($senderAddress);
            if ($courier->branch_id) {
                $existingBranch = Branch::find($courier->branch_id);
                if ($existingBranch) {
                    $branch = $existingBranch;
                }
            }

            // Derive route scope
            $routeScope = $this->deriveRouteScope($senderAddress, $receiverAddress);

            // Analyze goods characteristics
            $goodsType = $this->extractGoodsTypeFromItems($items);
            $goodsReq = [
                'required_goods_type' => $this->normalizeGoodsTypeForVehicle($goodsType),
                'weight' => $chargeableWeight,
                'volume' => $volumeM3,
                'dimensions' => null,
            ];

            // Identify constraints
            $constraints = [
                'service_type' => $serviceType,
                'route_scope' => $routeScope,
                'goods_type' => $goodsReq['required_goods_type'],
                'total_weight' => $chargeableWeight,
                'total_volume' => $volumeM3,
            ];

            // Match suitable vehicle types
            $candidateVehicles = $this->matchSuitableVehicleTypes($constraints, $goodsReq, $branch);

            // Calculate vehicle capacity usage
            $availableVehicles = $this->calculateVehicleCapacityUsage($candidateVehicles, $goodsReq);

            // Sort suggestions
            $suggestionList = $this->sortSuggestionsCostOptimized($availableVehicles, [
                'total_weight_kg' => $chargeableWeight,
                'total_volume_m3' => $volumeM3,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'nearest_branch' => [
                        'branch_id' => $branch->id,
                        'branch_code' => $branch->branch_code,
                        'branch_name' => $branch->name,
                    ],
                    'suggestions' => array_map(function ($item) {
                        return [
                            'vehicle_id' => $item['vehicle']->vehicle_id,
                            'vehicle_code' => $item['vehicle']->vehicle_code,
                            'vehicle_type' => $item['vehicle']->vehicle_type,
                            'max_dimensions' => [
                                'length_cm' => $item['vehicle']->max_length_cm,
                                'width_cm' => $item['vehicle']->max_width_cm,
                                'height_cm' => $item['vehicle']->max_height_cm,
                            ],
                            'max_load_capacity' => (float) $item['vehicle']->max_load_kg,
                            'max_volume' => (float) $item['vehicle']->max_volume_m3,
                            'current_order_count' => $item['current_order_count'],
                            'used_weight' => (float) $item['used_weight'],
                            'used_volume' => (float) $item['used_volume'],
                            'remaining_weight' => (float) $item['remaining_weight'],
                            'remaining_volume' => (float) $item['remaining_volume'],
                            'cost_score' => $item['cost_score'] ?? 0,
                        ];
                    }, $suggestionList),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Get suitable vehicles failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get suitable vehicles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign vehicle to courier order (for Admin/Agent)
     */
    public function assignVehicle(Request $request, $orderId)
    {
        $request->validate([
            'vehicle_id' => 'required|exists:vehicles,vehicle_id',
        ]);

        $courier = Courier::where('order_id', $orderId)->orWhere('id', $orderId)->firstOrFail();
        $user = Auth::user();

        // Check authorization
        if ($user->role !== 'ADMIN' && $user->role !== 'AGENT') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($courier->status !== 'CONFIRMED') {
            return response()->json([
                'success' => false,
                'message' => 'Order must be in CONFIRMED status to assign vehicle'
            ], 400);
        }

        try {
            $vehicle = Vehicle::findOrFail($request->vehicle_id);

            // Calculate order weight and volume
            $items = $courier->items ?? [];
            $totalWeight = 0;
            $totalVolume = 0;

            foreach ($items as $item) {
                $weightKg = ($item['weight_g'] ?? 0) / 1000;
                $totalWeight += $weightKg;

                if ($courier->service_type === 'Standard') {
                    $volume = ($item['length_cm'] ?? 0) * ($item['width_cm'] ?? 0) * ($item['height_cm'] ?? 0);
                    $totalVolume += $volume;
                } else {
                    $expressSizes = [
                        'S' => 20 * 20 * 10,
                        'M' => 30 * 30 * 15,
                        'L' => 40 * 40 * 20,
                        'XL' => 50 * 50 * 25,
                    ];
                    $totalVolume += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
                }
            }

            $volumetricWeight = $totalVolume / 5000;
            $chargeableWeight = max($totalWeight, $volumetricWeight);
            $volumeM3 = $totalVolume / 1000000;

            // Re-validate to avoid race condition
            $load = VehicleLoadTracking::firstOrCreate(
                ['vehicle_id' => $vehicle->vehicle_id],
                [
                    'current_load_kg' => 0,
                    'current_volume_m3' => 0,
                    'current_order_count' => 0,
                ]
            );

            // Check capacity
            $newWeight = (float) $load->current_load_kg + $chargeableWeight;
            $newVolume = (float) $load->current_volume_m3 + $volumeM3;

            if ($newWeight > (float) $vehicle->max_load_kg) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vehicle capacity exceeded (weight). Please refresh suggestions.'
                ], 400);
            }

            if ($newVolume > (float) $vehicle->max_volume_m3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vehicle capacity exceeded (volume). Please refresh suggestions.'
                ], 400);
            }

            // Determine branch if not set
            $branch = $courier->branch;
            if (!$branch) {
                $senderAddress = $courier->sender_address . ', ' . $courier->sender_province;
                $branch = $this->determineNearestBranch($senderAddress);
            }

            // Update in transaction
            DB::beginTransaction();
            try {
                // Update vehicle load tracking
                $load->update([
                    'current_load_kg' => $newWeight,
                    'current_volume_m3' => $newVolume,
                    'current_order_count' => $load->current_order_count + 1,
                ]);

                // Update courier
                $courier->update([
                    'branch_id' => $branch->id,
                    'vehicle_type' => $vehicle->vehicle_type,
                    'status' => 'VEHICLE_ASSIGNED',
                ]);

                // Sync to shipments table and write assignment log
                $this->syncShipmentFromCourier($courier, 'BRANCH_ASSIGNED');

                $shipment = Shipment::where('shipment_id', $courier->id)->first();
                if ($shipment) {
                    $shipment->assigned_branch_id = $branch->id;
                    $shipment->assigned_vehicle_id = $vehicle->vehicle_id;
                    $shipment->assigned_by = $user->id;
                    $shipment->assigned_at = now();
                    $shipment->shipment_status = 'BRANCH_ASSIGNED';
                    $shipment->save();

                    ShipmentVehicleAssignmentLog::create([
                        'shipment_id' => $shipment->shipment_id,
                        'vehicle_id' => $vehicle->vehicle_id,
                        'branch_id' => $branch->id,
                        'assigned_by' => $user->id,
                        'assigned_at' => now(),
                        'note' => 'Assigned via CourierController',
                    ]);

                    // Notify customer
                    if ($courier->user_id) {
                        Notification::create([
                            'user_id' => $courier->user_id,
                            'type' => 'shipment_status',
                            'title' => 'Đơn hàng đã được phân bổ chi nhánh',
                            'message' => "Đơn hàng {$courier->tracking_id} đã được phân bổ đến chi nhánh. Vui lòng chờ nhận hàng.",
                            'related_type' => 'shipment',
                            'related_id' => $shipment->shipment_id,
                        ]);
                    }
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Vehicle assigned successfully',
                    'data' => $this->formatCourier($courier->load(['user', 'branch', 'agent']))
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Assign vehicle failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign vehicle: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update courier
     */
    public function update(Request $request, $id)
    {
        $courier = Courier::findOrFail($id);
        $user = Auth::user();

        // Check authorization
        if ($user->role === 'CUSTOMER' && $courier->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'nullable|in:BOOKED,PRICE_ESTIMATED,BRANCH_ASSIGNED,PICKUP_SCHEDULED,PICKUP_RESCHEDULED,ON_THE_WAY_PICKUP,VERIFIED_ITEM,ADJUST_ITEM,CONFIRMED_PRICE,ADJUSTED_PRICE,PENDING_PAYMENT,CONFIRM_PAYMENT,PICKUP_COMPLETED,IN_ORIGIN_WAREHOUSE,IN_TRANSIT,IN_DEST_WAREHOUSE,OUT_FOR_DELIVERY,DELIVERY_FAILED,DELIVERED_SUCCESS,RETURN_CREATED,RETURN_IN_TRANSIT,RETURNED_TO_ORIGIN,RETURN_COMPLETED,DISPOSED,CLOSED',
            'agent_id' => 'nullable|exists:agents,id',
            'vehicle_type' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $courier->update($request->only(['status', 'agent_id', 'vehicle_type']));

        return response()->json([
            'success' => true,
            'message' => 'Courier updated successfully',
            'data' => $this->formatCourier($courier->load(['user', 'branch', 'agent']))
        ]);
    }

    /**
     * Delete courier
     */
    public function destroy($id)
    {
        $courier = Courier::findOrFail($id);
        $user = Auth::user();

        // Only admin can delete
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $courier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Courier deleted successfully'
        ]);
    }

    /**
     * Track courier by tracking ID
     */
    public function track($trackingId)
    {
        $courier = Courier::with(['user', 'branch', 'agent'])
            ->where('tracking_id', $trackingId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $this->formatCourier($courier)
        ]);
    }

    /**
     * Format courier for response
     */
    private function formatCourier($courier)
    {
        // Try to get related shipment data if available
        // Look for shipment by matching branch and status, or by ID if courier.id matches shipment_id
        $shipment = null;
        try {
            $shipment = \App\Models\Shipment::where('shipment_id', $courier->id)
                ->with(['pickupSchedule', 'paymentIntent', 'goodsInspection', 'pickupAssignment'])
                ->first();
        } catch (\Exception $e) {
            // Shipment table might not exist or courier.id doesn't match shipment_id
        }

        $pickupSchedule = $shipment?->pickupSchedule;
        $paymentIntent = $shipment?->paymentIntent;
        $goodsInspection = $shipment?->goodsInspection;
        $driverAssignment = $shipment?->pickupAssignment;

        // Format pickup window
        $pickupWindow = null;
        if ($pickupSchedule) {
            $pickupWindow = [
                'start' => $pickupSchedule->scheduled_start_at?->toISOString(),
                'end' => $pickupSchedule->scheduled_end_at?->toISOString(),
            ];
        }

        // Get actual weight from goods inspection
        $actualWeight = $goodsInspection?->actual_weight_kg ?? null;

        // Get payment method and status
        $paymentMethod = $paymentIntent?->method ?? $courier->payment_method ?? null;
        $paymentStatus = $paymentIntent?->status ?? null;

        return [
            'id' => (string) $courier->id,
            'trackingId' => $courier->tracking_id,
            'sender' => [
                'name' => $courier->sender_name,
                'phone' => $courier->sender_phone,
                'address' => $courier->sender_address,
            ],
            'receiver' => [
                'name' => $courier->receiver_name,
                'phone' => $courier->receiver_phone,
                'address' => $courier->receiver_address,
            ],
            'details' => [
                'type' => $courier->package_type,
                'weight' => (float) $courier->weight,
                'dimensions' => $courier->dimensions,
            ],
            'pricing' => [
                'baseCharge' => (float) $courier->base_charge,
                'tax' => (float) $courier->tax,
                'total' => (float) $courier->total,
            ],
            'status' => $courier->status,
            'bookingDate' => $courier->booking_date?->toISOString() ?? now()->toISOString(),
            'eta' => $courier->eta ? $courier->eta->toISOString() : null,
            'agentId' => $courier->agent_id ? (string) $courier->agent_id : null,
            'branchId' => $courier->branch_id ? (string) $courier->branch_id : null,
            'serviceType' => $courier->service_type ?? 'Standard',
            'vehicleType' => $courier->vehicle_type ?? null,
            'pickupWindow' => $pickupWindow,
            'actualWeight' => $actualWeight ? (string) $actualWeight . 'kg' : null,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => $paymentStatus,
        ];
    }

    /**
     * Create/update shipment record from courier data.
     */
    private function syncShipmentFromCourier(Courier $courier, ?string $statusOverride = null): void
    {
        $items = $courier->items ?? [];
        $totalWeightKg = 0.0;
        $totalVolumeCm3 = 0.0;
        $declaredValue = 0.0;
        $maxLength = null;
        $maxWidth = null;
        $maxHeight = null;

        foreach ($items as $item) {
            $weightKg = ((float) ($item['weight_g'] ?? 0)) / 1000;
            $totalWeightKg += $weightKg;
            $declaredValue += (float) ($item['declared_value'] ?? 0);

            if ($courier->service_type === 'Standard') {
                $length = isset($item['length_cm']) ? (float) $item['length_cm'] : null;
                $width = isset($item['width_cm']) ? (float) $item['width_cm'] : null;
                $height = isset($item['height_cm']) ? (float) $item['height_cm'] : null;

                if ($length !== null && $width !== null && $height !== null) {
                    $totalVolumeCm3 += $length * $width * $height;
                    $maxLength = $maxLength === null ? $length : max($maxLength, $length);
                    $maxWidth = $maxWidth === null ? $width : max($maxWidth, $width);
                    $maxHeight = $maxHeight === null ? $height : max($maxHeight, $height);
                }
            } else {
                $expressSizes = [
                    'S' => 20 * 20 * 10,
                    'M' => 30 * 30 * 15,
                    'L' => 40 * 40 * 20,
                    'XL' => 50 * 50 * 25,
                ];
                $totalVolumeCm3 += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
            }
        }

        if ($totalWeightKg <= 0) {
            $totalWeightKg = (float) ($courier->weight ?? 0);
        }

        $totalVolumeM3 = $totalVolumeCm3 > 0 ? $totalVolumeCm3 / 1000000 : null;

        $senderProvinceCode = $this->findProvinceInDatabase($courier->sender_province)?->province_code;
        $receiverProvinceCode = $this->findProvinceInDatabase($courier->receiver_province)?->province_code;

        $routeScope = 'UNKNOWN';
        try {
            $routeScope = $this->deriveRouteScope(
                $courier->sender_address . ', ' . $courier->sender_province,
                $courier->receiver_address . ', ' . $courier->receiver_province
            );
        } catch (\Exception $e) {
            Log::warning('Derive route scope failed for courier ' . $courier->id . ': ' . $e->getMessage());
        }

        $statusMap = [
            'CONFIRMED' => 'CONFIRMED_PRICE',
        ];
        $normalizedStatus = strtoupper($courier->status ?? '');
        $shipmentStatus = $statusOverride ?? ($statusMap[$normalizedStatus] ?? $normalizedStatus ?: 'BOOKED');

        $goodsType = $this->extractGoodsTypeFromItems($items);

        $shipment = Shipment::find($courier->id);
        if (!$shipment) {
            $shipment = new Shipment();
            $shipment->shipment_id = $courier->id;
        }

        $shipment->fill([
            'tracking_id' => $courier->tracking_id,
            'user_id' => $courier->user_id,
            'sender_address_text' => $courier->sender_address,
            'sender_name' => $courier->sender_name,
            'sender_phone' => $courier->sender_phone,
            'sender_province_code' => $senderProvinceCode,
            'receiver_address_text' => $courier->receiver_address,
            'receiver_name' => $courier->receiver_name,
            'receiver_phone' => $courier->receiver_phone,
            'receiver_province_code' => $receiverProvinceCode,
            'service_type' => $courier->service_type ?? 'Standard',
            'goods_type' => $goodsType,
            'declared_value' => $declaredValue,
            'total_weight_kg' => $totalWeightKg,
            'total_volume_m3' => $totalVolumeM3,
            'parcel_length_cm' => $maxLength,
            'parcel_width_cm' => $maxWidth,
            'parcel_height_cm' => $maxHeight,
            'route_scope' => $routeScope,
            'assigned_branch_id' => $courier->branch_id,
            'assigned_vehicle_id' => null,
            'shipment_status' => $shipmentStatus,
            'assigned_by' => null,
            'assigned_at' => null,
        ]);

        $shipment->save();
    }

    /**
     * Validate Step 1 input
     */
    private function validateStep1Input(Request $request)
    {
        $errors = [];

        // Validate sender
        if (!$request->has('sender.name') || empty($request->input('sender.name'))) {
            $errors['sender.name'] = 'Sender name is required';
        }
        if (!$request->has('sender.phone') || !$this->isValidPhone($request->input('sender.phone'))) {
            $errors['sender.phone'] = 'Invalid sender phone number';
        }
        if (!$request->has('sender.address_detail') || empty($request->input('sender.address_detail'))) {
            $errors['sender.address_detail'] = 'Sender address detail is required';
        }
        if (!$request->has('sender.ward') || empty($request->input('sender.ward'))) {
            $errors['sender.ward'] = 'Sender ward is required';
        }
        // District is intentionally not required on the API.
        // We only need (address_detail + ward + province) for normalization/coverage.
        // If provided, it will be accepted.

        if (!$request->has('sender.province') || empty($request->input('sender.province'))) {
            $errors['sender.province'] = 'Sender province is required';
        }

        // Validate receiver
        if (!$request->has('receiver.name') || empty($request->input('receiver.name'))) {
            $errors['receiver.name'] = 'Receiver name is required';
        }
        if (!$request->has('receiver.phone') || !$this->isValidPhone($request->input('receiver.phone'))) {
            $errors['receiver.phone'] = 'Invalid receiver phone number';
        }
        if (!$request->has('receiver.address_detail') || empty($request->input('receiver.address_detail'))) {
            $errors['receiver.address_detail'] = 'Receiver address detail is required';
        }
        if (!$request->has('receiver.ward') || empty($request->input('receiver.ward'))) {
            $errors['receiver.ward'] = 'Receiver ward is required';
        }
        // District is intentionally not required on the API.
        // We only need (address_detail + ward + province) for normalization/coverage.
        // If provided, it will be accepted.

        if (!$request->has('receiver.province') || empty($request->input('receiver.province'))) {
            $errors['receiver.province'] = 'Receiver province is required';
        }

        // Validate service type
        $serviceType = $request->input('service_type');
        if (!$serviceType || !in_array($serviceType, ['STANDARD', 'EXPRESS'])) {
            $errors['service_type'] = 'Service type must be STANDARD or EXPRESS';
        }

        // Validate items
        $items = $request->input('items', []);
        if (empty($items) || !is_array($items)) {
            $errors['items'] = 'At least one item is required';
        } else {
            foreach ($items as $index => $item) {
                if (empty($item['name'])) {
                    $errors["items.{$index}.name"] = 'Item name is required';
                }
                if (empty($item['weight_g']) || $item['weight_g'] <= 0) {
                    $errors["items.{$index}.weight_g"] = 'Item weight must be greater than 0';
                }
                if ($serviceType === 'STANDARD') {
                    if (empty($item['length_cm']) || empty($item['width_cm']) || empty($item['height_cm'])) {
                        $errors["items.{$index}.dimensions"] = 'Dimensions are required for STANDARD service';
                    }
                } elseif ($serviceType === 'EXPRESS') {
                    if (empty($item['express_size']) || !in_array($item['express_size'], ['S', 'M', 'L', 'XL'])) {
                        $errors["items.{$index}.express_size"] = 'Express size is required for EXPRESS service';
                    }
                }
                if (empty($item['declared_value']) || $item['declared_value'] < 0) {
                    $errors["items.{$index}.declared_value"] = 'Declared value must be >= 0';
                }
            }
        }

        // Validate pickup date and slot
        $pickupDate = $request->input('pickup_date');
        if (empty($pickupDate)) {
            $errors['pickup_date'] = 'Pickup date is required';
        } elseif (strtotime($pickupDate) < strtotime('today')) {
            $errors['pickup_date'] = 'Pickup date cannot be in the past';
        }

        $pickupSlot = $request->input('pickup_slot');
        if (empty($pickupSlot) || !in_array($pickupSlot, ['ca1', 'ca2'])) {
            $errors['pickup_slot'] = 'Pickup slot is required';
        }

        // Validate payment method
        $paymentMethod = $request->input('payment_method');
        if (empty($paymentMethod) || !in_array($paymentMethod, ['CASH', 'TRANSFER'])) {
            $errors['payment_method'] = 'Payment method is required';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Validate phone number (Vietnamese format)
     */
    private function isValidPhone($phone)
    {
        // Vietnamese phone: 10 digits starting with 0, or 11 digits starting with 84
        return preg_match('/^(0|\+84)[0-9]{9,10}$/', preg_replace('/\s+/', '', $phone));
    }

    /**
     * Step 3: Validate address, service eligibility, and items
     */
    private function validateStep3(Courier $courier)
    {
        $errors = [];

        // 3.1 Address Validation
        // TODO: Check against master data tables (provinces, districts, wards)
        // For now, just check they're not empty (already validated in Step 1)
        if (strlen($courier->sender_address) < 10 || strlen($courier->sender_address) > 500) {
            $errors['sender.address_detail'] = 'Sender address detail must be between 10 and 500 characters';
        }
        if (strlen($courier->receiver_address) < 10 || strlen($courier->receiver_address) > 500) {
            $errors['receiver.address_detail'] = 'Receiver address detail must be between 10 and 500 characters';
        }

        // 3.2 Service Type Eligibility
        $senderProvince = strtoupper($courier->sender_province);
        $receiverProvince = strtoupper($courier->receiver_province);

        if ($courier->service_type === 'Express') {
            // EXPRESS only for inner HCMC & Hanoi
            $allowedProvinces = ['HCM', 'HO CHI MINH', 'HANOI', 'HÀ NỘI', 'HN'];
            $senderAllowed = in_array($senderProvince, $allowedProvinces) ||
                stripos($senderProvince, 'HO CHI MINH') !== false ||
                stripos($senderProvince, 'HANOI') !== false ||
                stripos($senderProvince, 'HÀ NỘI') !== false;
            $receiverAllowed = in_array($receiverProvince, $allowedProvinces) ||
                stripos($receiverProvince, 'HO CHI MINH') !== false ||
                stripos($receiverProvince, 'HANOI') !== false ||
                stripos($receiverProvince, 'HÀ NỘI') !== false;

            if (!$senderAllowed || !$receiverAllowed) {
                $errors['service_type'] = 'EXPRESS service is only available for inner HCMC and Hanoi';
            }
        }

        // 3.3 Validate items
        $items = $courier->items ?? [];
        foreach ($items as $index => $item) {
            // Check prohibited items
            $prohibitedCheck = $this->checkProhibitedItems($item);
            if (!$prohibitedCheck['allowed']) {
                $errors["items.{$index}.prohibited"] = $prohibitedCheck['reason'];
            }

            // Size limits
            if ($courier->service_type === 'Standard') {
                $maxDimension = 150; // cm
                if (($item['length_cm'] ?? 0) > $maxDimension ||
                    ($item['width_cm'] ?? 0) > $maxDimension ||
                    ($item['height_cm'] ?? 0) > $maxDimension
                ) {
                    $errors["items.{$index}.dimensions"] = "Maximum dimension is {$maxDimension}cm for STANDARD service";
                }
            }

            // Declared value limits
            $maxDeclaredValue = 50000000; // 50M VND
            if (($item['declared_value'] ?? 0) > $maxDeclaredValue) {
                $errors["items.{$index}.declared_value"] = "Maximum declared value is " . number_format($maxDeclaredValue) . " VND";
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Check if item contains prohibited keywords
     */
    private function checkProhibitedItems($item)
    {
        $itemName = strtolower($item['name'] ?? '');
        $itemCategory = strtolower($item['category'] ?? '');

        $keywords = ProhibitedKeyword::where('is_active', true)
            ->with('category')
            ->get();

        $riskScore = 0;
        $matchedKeywords = [];

        foreach ($keywords as $keyword) {
            $keywordText = strtolower($keyword->keyword);
            $matchFound = false;

            switch ($keyword->match_type) {
                case 'EXACT':
                    $matchFound = $itemName === $keywordText || $itemCategory === $keywordText;
                    break;
                case 'CONTAINS':
                    $matchFound = strpos($itemName, $keywordText) !== false ||
                        strpos($itemCategory, $keywordText) !== false;
                    break;
                case 'REGEX':
                    $matchFound = preg_match('/' . $keywordText . '/i', $itemName) ||
                        preg_match('/' . $keywordText . '/i', $itemCategory);
                    break;
            }

            if ($matchFound) {
                $riskScore += $keyword->risk_weight;
                $matchedKeywords[] = [
                    'keyword' => $keyword->keyword,
                    'category' => $keyword->category->name ?? 'Unknown',
                    'risk_weight' => $keyword->risk_weight,
                ];
            }
        }

        // If risk score >= 5, item is prohibited
        if ($riskScore >= 5) {
            return [
                'allowed' => false,
                'reason' => 'Item contains prohibited keywords: ' . implode(', ', array_column($matchedKeywords, 'keyword')),
                'risk_score' => $riskScore,
                'matched_keywords' => $matchedKeywords,
            ];
        }

        return [
            'allowed' => true,
            'risk_score' => $riskScore,
        ];
    }

    /**
     * Step 4: Calculate shipping fee
     */
    private function calculateShippingFee(Courier $courier)
    {
        try {
            // Determine route type
            $routeType = $this->determineRouteType($courier->sender_province, $courier->receiver_province);

            // Calculate total weight and volume
            $items = $courier->items ?? [];
            $totalWeight = 0; // kg
            $totalVolume = 0; // cm³

            foreach ($items as $item) {
                $weightKg = ($item['weight_g'] ?? 0) / 1000;
                $totalWeight += $weightKg;

                if ($courier->service_type === 'Standard') {
                    $volume = ($item['length_cm'] ?? 0) * ($item['width_cm'] ?? 0) * ($item['height_cm'] ?? 0);
                    $totalVolume += $volume;
                } else {
                    // EXPRESS predefined sizes
                    $expressSizes = [
                        'S' => 20 * 20 * 10, // cm³
                        'M' => 30 * 30 * 15,
                        'L' => 40 * 40 * 20,
                        'XL' => 50 * 50 * 25,
                    ];
                    $totalVolume += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
                }
            }

            // Chargeable weight = max(actual weight, volumetric weight)
            $volumetricWeight = $totalVolume / 5000; // 5000 cm³ = 1 kg
            $chargeableWeight = max($totalWeight, $volumetricWeight);

            // Determine city types
            $originCity = $this->determineCityType($courier->sender_province);
            $destinationCity = $this->determineCityType($courier->receiver_province);

            $serviceType = $courier->service_type === 'Express' ? 'Express' : 'Standard';

            // Calculate shipping fee according to new pseudo code
            $estimatedFee = $this->calculateShippingFeeByRules(
                $serviceType,
                $routeType,
                $originCity,
                $destinationCity,
                $chargeableWeight,
                $totalVolume
            );

            // Calculate breakdown for display
            $basePrice = 0;
            $extraWeightPrice = 0;

            if ($serviceType === 'Standard' && $chargeableWeight < 20) {
                // For STANDARD < 20kg, calculate base and extra
                if ($routeType === 'intra_province' || $routeType === 'intra_region') {
                    $basePrice = 30000;
                } elseif ($routeType === 'adjacent_region') {
                    $basePrice = 32000;
                } else {
                    $basePrice = 35000;
                }

                if ($chargeableWeight > 3) {
                    $extraWeight = $chargeableWeight - 3;
                    if ($routeType === 'intra_province' || $routeType === 'intra_region') {
                        $extraWeightPrice = ceil($extraWeight / 0.5) * 2500;
                    } else {
                        $extraWeightPrice = ceil($extraWeight / 0.5) * 5000;
                    }
                }
            } else {
                // For other cases, show total as base_price
                $basePrice = $estimatedFee;
            }

            // Determine vehicle type and assign branch
            $senderAddress = $courier->sender_address . ', ' . $courier->sender_province;
            $receiverAddress = $courier->receiver_address . ', ' . $courier->receiver_province;

            $vehicleResult = $this->determineVehicleTypeForCourier(
                $senderAddress,
                $receiverAddress,
                $serviceType,
                $chargeableWeight,
                $totalVolume,
                $items,
                $courier->branch_id
            );

            $vehicleType = $vehicleResult['vehicle_type'];

            // Update branch_id if determined
            if ($vehicleResult['branch_id'] && !$courier->branch_id) {
                $courier->update(['branch_id' => $vehicleResult['branch_id']]);
            }

            // Estimate SLA
            $sla = $this->estimateSLA($routeType, $serviceType);

            $breakdown = [
                'base_price' => $basePrice,
                'extra_weight_price' => $extraWeightPrice,
                'chargeable_weight' => round($chargeableWeight, 2),
                'actual_weight' => round($totalWeight, 2),
                'volumetric_weight' => round($volumetricWeight, 2),
                'route_type' => $routeType,
                'vehicle_type' => $vehicleType,
                'sla' => $sla,
            ];

            return [
                'success' => true,
                'estimated_fee' => $estimatedFee,
                'breakdown' => $breakdown,
            ];
        } catch (\Exception $e) {
            Log::error('Pricing calculation failed: ' . $e->getMessage());
            return [
                'success' => false,
                'errors' => ['Pricing engine error: ' . $e->getMessage()],
            ];
        }
    }

    /**
     * Determine route type based on provinces (using province_masters table)
     */
    private function determineRouteType($senderProvince, $receiverProvince)
    {
        // Try to find provinces in database
        $senderProvinceData = $this->findProvinceInDatabase($senderProvince);
        $receiverProvinceData = $this->findProvinceInDatabase($receiverProvince);

        // If both provinces found in database
        if ($senderProvinceData && $receiverProvinceData) {
            // Same province
            if ($senderProvinceData->province_code === $receiverProvinceData->province_code) {
                return 'intra_province';
            }

            $senderRegion = $senderProvinceData->region_code;
            $receiverRegion = $receiverProvinceData->region_code;

            // Same region
            if ($senderRegion === $receiverRegion) {
                return 'intra_region';
            }

            // Check if adjacent regions
            $adjacentPairs = [
                ['NORTH', 'CENTRAL'],
                ['CENTRAL', 'SOUTH'],
            ];
            foreach ($adjacentPairs as $pair) {
                if (($senderRegion === $pair[0] && $receiverRegion === $pair[1]) ||
                    ($senderRegion === $pair[1] && $receiverRegion === $pair[0])
                ) {
                    return 'adjacent_region';
                }
            }

            // Cross region (North <-> South)
            return 'cross_region';
        }

        // Fallback to old logic if province not found in database
        $senderProvince = strtoupper(trim($senderProvince));
        $receiverProvince = strtoupper(trim($receiverProvince));

        // Same province (fallback)
        if (
            $senderProvince === $receiverProvince ||
            (stripos($senderProvince, 'HCM') !== false && stripos($receiverProvince, 'HCM') !== false) ||
            (stripos($senderProvince, 'HANOI') !== false && stripos($receiverProvince, 'HANOI') !== false) ||
            (stripos($senderProvince, 'HN') !== false && stripos($receiverProvince, 'HN') !== false)
        ) {
            return 'intra_province';
        }

        // Regions mapping (fallback)
        $regions = [
            'NORTH' => ['HANOI', 'HN', 'HÀ NỘI', 'HAIPHONG', 'HP', 'QUANGNINH', 'QN'],
            'CENTRAL' => ['DANANG', 'DN', 'ĐÀ NẴNG', 'HUE', 'HUẾ', 'QUANGNAM', 'QN'],
            'SOUTH' => ['HCM', 'HO CHI MINH', 'HỒ CHÍ MINH', 'CANTHO', 'CT', 'CẦN THƠ', 'DONGNAI', 'ĐỒNG NAI'],
        ];

        $senderRegion = null;
        $receiverRegion = null;

        foreach ($regions as $region => $provinces) {
            foreach ($provinces as $province) {
                if (stripos($senderProvince, $province) !== false) {
                    $senderRegion = $region;
                }
                if (stripos($receiverProvince, $province) !== false) {
                    $receiverRegion = $region;
                }
            }
        }

        if ($senderRegion === $receiverRegion && $senderRegion !== null) {
            return 'intra_region';
        }

        // Check if adjacent regions
        $adjacentPairs = [
            ['NORTH', 'CENTRAL'],
            ['CENTRAL', 'SOUTH'],
        ];
        foreach ($adjacentPairs as $pair) {
            if (($senderRegion === $pair[0] && $receiverRegion === $pair[1]) ||
                ($senderRegion === $pair[1] && $receiverRegion === $pair[0])
            ) {
                return 'adjacent_region';
            }
        }

        // Cross region (North <-> South)
        return 'cross_region';
    }

    /**
     * Find province in database by name, code, or alias
     */
    private function findProvinceInDatabase($province)
    {
        $province = trim($province);
        $provinceUpper = strtoupper($province);

        // Normalize: remove Vietnamese accents and convert to uppercase
        $normalizedProvince = strtoupper($this->removeVietnameseAccents($provinceUpper));

        // Try to find by province_code first
        $provinceData = ProvinceMaster::where('province_code', $provinceUpper)->first();
        if ($provinceData) {
            return $provinceData;
        }

        // Try to find by alias (with priority sorting - lower priority number = higher priority)
        $alias = ProvinceAlias::where('alias_text', $normalizedProvince)
            ->orderBy('priority', 'asc')
            ->first();
        if ($alias) {
            $provinceData = ProvinceMaster::where('province_code', $alias->province_code)->first();
            if ($provinceData) {
                return $provinceData;
            }
        }

        // Try to find by province_name (exact match)
        $provinceData = ProvinceMaster::where('province_name', $province)->first();
        if ($provinceData) {
            return $provinceData;
        }

        // Try to find by province_name (case-insensitive, partial match)
        $provinceData = ProvinceMaster::whereRaw('UPPER(province_name) LIKE ?', ['%' . $provinceUpper . '%'])->first();
        if ($provinceData) {
            return $provinceData;
        }

        // Try to find by alias (partial match)
        $alias = ProvinceAlias::whereRaw('UPPER(alias_text) LIKE ?', ['%' . $normalizedProvince . '%'])
            ->orderBy('priority', 'asc')
            ->first();
        if ($alias) {
            $provinceData = ProvinceMaster::where('province_code', $alias->province_code)->first();
            if ($provinceData) {
                return $provinceData;
            }
        }

        return null;
    }


    /**
     * Determine city type (HCM, HANOI, OTHER) using province_masters table
     */
    private function determineCityType($province)
    {
        $provinceData = $this->findProvinceInDatabase($province);

        if ($provinceData) {
            // Check by province_code
            if ($provinceData->province_code === 'HCM') {
                return 'HCM';
            }
            if ($provinceData->province_code === 'HN') {
                return 'HANOI';
            }
        }

        // Fallback to old logic
        $province = strtoupper(trim($province));

        if (
            stripos($province, 'HCM') !== false ||
            stripos($province, 'HO CHI MINH') !== false ||
            stripos($province, 'HỒ CHÍ MINH') !== false
        ) {
            return 'HCM';
        }

        if (
            stripos($province, 'HANOI') !== false ||
            stripos($province, 'HÀ NỘI') !== false ||
            stripos($province, 'HN') !== false
        ) {
            return 'HANOI';
        }

        return 'OTHER';
    }

    /**
     * Calculate shipping fee according to new pseudo code rules
     */
    private function calculateShippingFeeByRules($serviceType, $routeType, $originCity, $destinationCity, $weightKg, $volumeCm3)
    {
        $fee = 0;

        // =====================================================================
        // STANDARD DELIVERY
        // =====================================================================
        if ($serviceType === 'Standard') {
            // CASE 1: Weight < 20kg
            if ($weightKg < 20) {
                // Base price for first 3kg
                $basePrice = 0;
                switch ($routeType) {
                    case 'intra_province':
                    case 'intra_region':
                        $basePrice = 30000;
                        break;
                    case 'adjacent_region':
                        $basePrice = 32000;
                        break;
                    case 'cross_region':
                        $basePrice = 35000;
                        break;
                }

                // Extra weight calculation
                if ($weightKg <= 3) {
                    $fee = $basePrice;
                } else {
                    $extraWeight = $weightKg - 3;

                    $extraPrice = 0;
                    switch ($routeType) {
                        case 'intra_province':
                        case 'intra_region':
                            // CEIL(extraWeight / 0.5) * 2500
                            $extraPrice = ceil($extraWeight / 0.5) * 2500;
                            break;
                        case 'adjacent_region':
                        case 'cross_region':
                            // CEIL(extraWeight / 0.5) * 5000
                            $extraPrice = ceil($extraWeight / 0.5) * 5000;
                            break;
                    }

                    $fee = $basePrice + $extraPrice;
                }
            }
            // CASE 2: 20kg – 300kg
            else if ($weightKg >= 20 && $weightKg <= 300) {
                // 20 – 30kg
                if ($weightKg <= 30) {
                    switch ($routeType) {
                        case 'intra_province':
                            $fee = 130000;
                            break;
                        case 'intra_region':
                            $fee = 165000;
                            break;
                        case 'adjacent_region':
                            $fee = 260000;
                            break;
                        case 'cross_region':
                            $fee = 320000;
                            break;
                    }
                }
                // 30 – 40kg
                else if ($weightKg <= 40) {
                    switch ($routeType) {
                        case 'intra_province':
                            $fee = 170000;
                            break;
                        case 'intra_region':
                            $fee = 205000;
                            break;
                        case 'adjacent_region':
                            $fee = 340000;
                            break;
                        case 'cross_region':
                            $fee = 420000;
                            break;
                    }
                }
                // 40 – 50kg
                else if ($weightKg <= 50) {
                    switch ($routeType) {
                        case 'intra_province':
                            $fee = 210000;
                            break;
                        case 'intra_region':
                            $fee = 245000;
                            break;
                        case 'adjacent_region':
                            $fee = 420000;
                            break;
                        case 'cross_region':
                            $fee = 520000;
                            break;
                    }
                }
                // > 50kg
                else {
                    $extraWeight = $weightKg - 50;

                    switch ($routeType) {
                        case 'intra_province':
                            $fee = 210000 + round($extraWeight) * 5000;
                            break;
                        case 'intra_region':
                            $fee = 245000 + round($extraWeight) * 5000;
                            break;
                        case 'adjacent_region':
                            $fee = 420000 + round($extraWeight) * 7000;
                            break;
                        case 'cross_region':
                            $fee = 520000 + round($extraWeight) * 8000;
                            break;
                    }
                }
            }
        }

        // =====================================================================
        // EXPRESS DELIVERY
        // =====================================================================
        if ($serviceType === 'Express') {
            // Only support intra-city HCM or Hanoi
            if (
                $weightKg <= 20 &&
                (($originCity === 'HCM' && $destinationCity === 'HCM') ||
                    ($originCity === 'HANOI' && $destinationCity === 'HANOI'))
            ) {

                // 0 – 5kg
                if ($weightKg <= 5) {
                    if ($volumeCm3 < 9600) {
                        $fee = 50000;
                    } else if ($volumeCm3 < 100000) {
                        $fee = 60000;
                    } else {
                        $fee = 70000;
                    }
                }
                // 5 – 20kg
                else {
                    if ($volumeCm3 < 9600) {
                        $fee = 60000;
                    } else if ($volumeCm3 < 100000) {
                        $fee = 70000;
                    } else {
                        $fee = 80000;
                    }
                }
            } else {
                // EXPRESS not available for this route
                throw new \Exception('EXPRESS service is only available for intra-city HCM or Hanoi with weight <= 20kg');
            }
        }

        return $fee;
    }

    /**
     * Determine vehicle type and assign branch for Courier (replaces old determineVehicleType)
     * This method uses the logic from ShipmentController
     */
    private function determineVehicleTypeForCourier($senderAddress, $receiverAddress, $serviceType, $weightKg, $volumeCm3, $items = [], $existingBranchId = null)
    {
        try {
            // Determine nearest branch if not provided
            $branch = null;
            if ($existingBranchId) {
                $branch = Branch::find($existingBranchId);
            }

            if (!$branch) {
                $branch = $this->determineNearestBranch($senderAddress);
            }

            // Derive route scope
            $routeScope = $this->deriveRouteScope($senderAddress, $receiverAddress);

            // Analyze goods characteristics
            $goodsType = $this->extractGoodsTypeFromItems($items);
            $goodsReq = [
                'required_goods_type' => $this->normalizeGoodsTypeForVehicle($goodsType),
                'weight' => $weightKg,
                'volume' => $volumeCm3 / 1000000, // Convert to m³
                'dimensions' => null, // Courier doesn't have parcel dimensions in this context
            ];

            // Identify constraints
            $constraints = [
                'service_type' => $serviceType,
                'route_scope' => $routeScope,
                'goods_type' => $goodsReq['required_goods_type'],
                'total_weight' => $weightKg,
                'total_volume' => $goodsReq['volume'],
            ];

            // Match suitable vehicle types
            $candidateVehicles = $this->matchSuitableVehicleTypes($constraints, $goodsReq, $branch);

            // Calculate vehicle capacity usage
            $availableVehicles = $this->calculateVehicleCapacityUsage($candidateVehicles, $goodsReq);

            // Sort suggestions
            $suggestionList = $this->sortSuggestionsCostOptimized($availableVehicles, [
                'total_weight_kg' => $weightKg,
                'total_volume_m3' => $goodsReq['volume'],
            ]);

            // Return the best vehicle type
            if (!empty($suggestionList)) {
                return [
                    'branch_id' => $branch->id,
                    'vehicle_type' => $suggestionList[0]['vehicle']->vehicle_type,
                ];
            }

            // Fallback
            return [
                'branch_id' => $branch->id,
                'vehicle_type' => $serviceType === 'Express' ? 'Motorbike' : '2.5-ton Truck',
            ];
        } catch (\Exception $e) {
            Log::error('Determine vehicle type for courier failed: ' . $e->getMessage());
            // Fallback
            return [
                'branch_id' => $existingBranchId,
                'vehicle_type' => $serviceType === 'Express' ? 'Motorbike' : '2.5-ton Truck',
            ];
        }
    }

    /**
     * Determine Nearest Branch
     */
    private function determineNearestBranch($senderAddress)
    {
        $senderGeo = $this->normalizeAddress($senderAddress);

        $branches = Branch::where('is_active', true)->get();
        $nearestBranch = null;
        $minDistanceKm = PHP_FLOAT_MAX;

        foreach ($branches as $branch) {
            if (!$branch->latitude || !$branch->longitude) {
                continue;
            }

            $distance = $this->geoDistanceKm(
                ['lat' => (float) $senderGeo['geo']['lat'], 'lng' => (float) $senderGeo['geo']['lng']],
                ['lat' => (float) $branch->latitude, 'lng' => (float) $branch->longitude]
            );

            if ($distance < $minDistanceKm) {
                $minDistanceKm = $distance;
                $nearestBranch = $branch;
            }
        }

        if (!$nearestBranch) {
            // Fallback: get first active branch
            $nearestBranch = Branch::where('is_active', true)->first();
        }

        return $nearestBranch;
    }

    /**
     * Derive Route Scope
     */
    private function deriveRouteScope($senderAddress, $receiverAddress)
    {
        $s = $this->normalizeAddress($senderAddress);
        $r = $this->normalizeAddress($receiverAddress);

        // 1) Intra-province
        if ($s['province_code'] === $r['province_code']) {
            return 'INTRA_PROVINCE';
        }

        $sGroup = $this->getRegionGroup($s['region_code']);
        $rGroup = $this->getRegionGroup($r['region_code']);

        // 2) Intra-region
        if ($sGroup === $rGroup) {
            return 'INTRA_REGION';
        }

        // 3) Inter-region near (adjacent)
        $adjacentPairs = [
            ['NORTH', 'CENTRAL'],
            ['CENTRAL', 'NORTH'],
            ['CENTRAL', 'SOUTH'],
            ['SOUTH', 'CENTRAL'],
        ];

        foreach ($adjacentPairs as $pair) {
            if ($sGroup === $pair[0] && $rGroup === $pair[1]) {
                return 'INTER_REGION_NEAR';
            }
        }

        // 4) Inter-region far (North <-> South)
        if (($sGroup === 'NORTH' && $rGroup === 'SOUTH') || ($sGroup === 'SOUTH' && $rGroup === 'NORTH')) {
            return 'INTER_REGION_FAR';
        }

        return 'UNKNOWN';
    }

    /**
     * Get Region Group
     */
    private function getRegionGroup($regionCode)
    {
        if ($regionCode === 'NORTH') {
            return 'NORTH';
        }
        if ($regionCode === 'CENTRAL') {
            return 'CENTRAL';
        }
        if ($regionCode === 'SOUTH') {
            return 'SOUTH';
        }
        throw new \Exception("Invalid region_code: {$regionCode}");
    }

    /**
     * Normalize Address
     */
    private function normalizeAddress($address)
    {
        // Normalize text
        $normalizedText = $this->standardizeAddressText($address);

        // Find province
        $province = $this->findProvinceByAddress($normalizedText);

        if (!$province) {
            throw new \Exception("Cannot determine province from address: {$address}");
        }

        return [
            'province_code' => $province->province_code,
            'region_code' => $province->region_code,
            'geo' => [
                'lat' => (float) $province->latitude,
                'lng' => (float) $province->longitude,
            ],
        ];
    }

    /**
     * Standardize Address Text
     */
    private function standardizeAddressText($address)
    {
        // Remove Vietnamese accents and convert to uppercase
        $text = $this->removeVietnameseAccents($address);
        $text = strtoupper(trim($text));

        // Remove common words
        $text = str_replace(['TP.', 'TP', 'THÀNH PHỐ', 'THANH PHO'], '', $text);
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Remove Vietnamese Accents
     */
    private function removeVietnameseAccents($text)
    {
        $text = str_replace(
            ['à', 'á', 'ạ', 'ả', 'ã', 'â', 'ầ', 'ấ', 'ậ', 'ẩ', 'ẫ', 'ă', 'ằ', 'ắ', 'ặ', 'ẳ', 'ẵ'],
            'a',
            $text
        );
        $text = str_replace(
            ['è', 'é', 'ẹ', 'ẻ', 'ẽ', 'ê', 'ề', 'ế', 'ệ', 'ể', 'ễ'],
            'e',
            $text
        );
        $text = str_replace(['ì', 'í', 'ị', 'ỉ', 'ĩ'], 'i', $text);
        $text = str_replace(
            ['ò', 'ó', 'ọ', 'ỏ', 'õ', 'ô', 'ồ', 'ố', 'ộ', 'ổ', 'ỗ', 'ơ', 'ờ', 'ớ', 'ợ', 'ở', 'ỡ'],
            'o',
            $text
        );
        $text = str_replace(
            ['ù', 'ú', 'ụ', 'ủ', 'ũ', 'ư', 'ừ', 'ứ', 'ự', 'ử', 'ữ'],
            'u',
            $text
        );
        $text = str_replace(['ỳ', 'ý', 'ỵ', 'ỷ', 'ỹ'], 'y', $text);
        $text = str_replace(['đ'], 'd', $text);
        $text = str_replace(
            ['À', 'Á', 'Ạ', 'Ả', 'Ã', 'Â', 'Ầ', 'Ấ', 'Ậ', 'Ẩ', 'Ẫ', 'Ă', 'Ằ', 'Ắ', 'Ặ', 'Ẳ', 'Ẵ'],
            'A',
            $text
        );
        $text = str_replace(
            ['È', 'É', 'Ẹ', 'Ẻ', 'Ẽ', 'Ê', 'Ề', 'Ế', 'Ệ', 'Ể', 'Ễ'],
            'E',
            $text
        );
        $text = str_replace(['Ì', 'Í', 'Ị', 'Ỉ', 'Ĩ'], 'I', $text);
        $text = str_replace(
            ['Ò', 'Ó', 'Ọ', 'Ỏ', 'Õ', 'Ô', 'Ồ', 'Ố', 'Ộ', 'Ổ', 'Ỗ', 'Ơ', 'Ờ', 'Ớ', 'Ợ', 'Ở', 'Ỡ'],
            'O',
            $text
        );
        $text = str_replace(
            ['Ù', 'Ú', 'Ụ', 'Ủ', 'Ũ', 'Ư', 'Ừ', 'Ứ', 'Ự', 'Ử', 'Ữ'],
            'U',
            $text
        );
        $text = str_replace(['Ỳ', 'Ý', 'Ỵ', 'Ỷ', 'Ỹ'], 'Y', $text);
        $text = str_replace(['Đ'], 'D', $text);

        return $text;
    }

    /**
     * Find Province By Address
     */
    private function findProvinceByAddress($text)
    {
        // Try exact match with province name
        $provinces = ProvinceMaster::all();
        foreach ($provinces as $province) {
            $provinceNameNormalized = $this->removeVietnameseAccents(strtoupper($province->province_name));
            if (stripos($text, $provinceNameNormalized) !== false) {
                return $province;
            }
        }

        // Try alias match
        $aliases = ProvinceAlias::with('province')->orderBy('priority', 'asc')->get();
        foreach ($aliases as $alias) {
            if (stripos($text, $alias->alias_text) !== false) {
                return $alias->province;
            }
        }

        return null;
    }

    /**
     * Normalize Address Full (Province → District → Ward) with Confidence Scores
     * 
     * @param string $address Full address string
     * @return array|null Returns normalized address with confidence scores or null if not found
     */
    private function normalizeAddressFull($address)
    {
        // Step 1: Normalize text
        $normalizedText = $this->standardizeAddressText($address);

        // Step 2: Find Province with confidence score
        $provinceResult = $this->findProvinceWithConfidence($normalizedText);
        if (!$provinceResult) {
            return null;
        }

        $province = $provinceResult['province'];
        $provinceConfidence = $provinceResult['confidence'];

        // Step 3: Find District within province with confidence score
        $districtResult = $this->findDistrictWithConfidence($normalizedText, $province->province_code);
        $district = $districtResult ? $districtResult['district'] : null;
        $districtConfidence = $districtResult ? $districtResult['confidence'] : 0;

        // Step 4: Find Ward within district with confidence score
        $wardResult = null;
        $wardConfidence = 0;
        if ($district) {
            $wardResult = $this->findWardWithConfidence($normalizedText, $district->district_code);
            $wardConfidence = $wardResult ? $wardResult['confidence'] : 0;
        }

        // Calculate overall confidence (weighted average)
        $overallConfidence = ($provinceConfidence * 0.4) + ($districtConfidence * 0.35) + ($wardConfidence * 0.25);

        return [
            'province' => [
                'code' => $province->province_code,
                'name' => $province->province_name,
                'region_code' => $province->region_code,
                'confidence' => $provinceConfidence,
            ],
            'district' => $district ? [
                'code' => $district->district_code,
                'name' => $district->district_name,
                'type' => $district->district_type,
                'confidence' => $districtConfidence,
            ] : null,
            'ward' => ($wardResult && isset($wardResult['ward']) && $wardResult['ward']) ? [
                'code' => $wardResult['ward']->ward_code,
                'name' => $wardResult['ward']->ward_name,
                'type' => $wardResult['ward']->ward_type,
                'confidence' => $wardConfidence,
            ] : null,
            'geo' => [
                'lat' => (float) $province->latitude,
                'lng' => (float) $province->longitude,
            ],
            'overall_confidence' => round($overallConfidence, 2),
        ];
    }

    /**
     * Find Province with Confidence Score
     */
    private function findProvinceWithConfidence($normalizedText)
    {
        // Try exact match with province name (highest confidence)
        $provinces = ProvinceMaster::where('is_active', true)->get();
        foreach ($provinces as $province) {
            $provinceNameNormalized = $this->removeVietnameseAccents(strtoupper($province->province_name));
            if (stripos($normalizedText, $provinceNameNormalized) !== false) {
                // Check if it's exact match or contains
                $confidence = (stripos($normalizedText, $provinceNameNormalized) === 0 ||
                    stripos($normalizedText, $provinceNameNormalized) === (strlen($normalizedText) - strlen($provinceNameNormalized)))
                    ? 100 : 85;
                return ['province' => $province, 'confidence' => $confidence];
            }
        }

        // Try alias match (priority-based confidence)
        $aliases = ProvinceAlias::with('province')
            ->whereHas('province', function ($q) {
                $q->where('is_active', true);
            })
            ->orderBy('priority', 'asc')
            ->get();

        foreach ($aliases as $alias) {
            if (stripos($normalizedText, $alias->alias_text) !== false) {
                // Higher priority (lower number) = higher confidence
                // Priority 1 = 95, Priority 5 = 85, Priority 10 = 75, Priority 20+ = 65
                $confidence = max(65, 100 - ($alias->priority * 2));
                return ['province' => $alias->province, 'confidence' => $confidence];
            }
        }

        return null;
    }

    /**
     * Find District with Confidence Score (within a province)
     */
    private function findDistrictWithConfidence($normalizedText, $provinceCode)
    {
        // Try exact match with district name (highest confidence)
        $districts = DistrictMaster::where('province_code', $provinceCode)
            ->where('is_active', true)
            ->get();

        foreach ($districts as $district) {
            $districtNameNormalized = $this->removeVietnameseAccents(strtoupper($district->district_name));
            $districtNameRawNormalized = $this->removeVietnameseAccents(strtoupper($district->district_name_raw));

            // Check full name
            if (stripos($normalizedText, $districtNameNormalized) !== false) {
                $confidence = 95;
                return ['district' => $district, 'confidence' => $confidence];
            }

            // Check raw name
            if (stripos($normalizedText, $districtNameRawNormalized) !== false) {
                $confidence = 90;
                return ['district' => $district, 'confidence' => $confidence];
            }
        }

        // Try alias match (priority-based confidence)
        $aliases = DistrictAlias::with('district')
            ->whereHas('district', function ($q) use ($provinceCode) {
                $q->where('province_code', $provinceCode)
                    ->where('is_active', true);
            })
            ->orderBy('priority', 'asc')
            ->get();

        foreach ($aliases as $alias) {
            if (stripos($normalizedText, $alias->alias_text) !== false) {
                // Higher priority (lower number) = higher confidence
                // Priority 1 = 90, Priority 5 = 80, Priority 10 = 70, Priority 20+ = 60
                $confidence = max(60, 95 - ($alias->priority * 2));
                return ['district' => $alias->district, 'confidence' => $confidence];
            }
        }

        return null;
    }

    /**
     * Find Ward with Confidence Score (within a district)
     */
    private function findWardWithConfidence($normalizedText, $districtCode)
    {
        // Try exact match with ward name (highest confidence)
        $wards = WardMaster::where('district_code', $districtCode)
            ->where('is_active', true)
            ->get();

        foreach ($wards as $ward) {
            $wardNameNormalized = $this->removeVietnameseAccents(strtoupper($ward->ward_name));
            $wardNameRawNormalized = $this->removeVietnameseAccents(strtoupper($ward->ward_name_raw));

            // Check full name
            if (stripos($normalizedText, $wardNameNormalized) !== false) {
                $confidence = 95;
                return ['ward' => $ward, 'confidence' => $confidence];
            }

            // Check raw name
            if (stripos($normalizedText, $wardNameRawNormalized) !== false) {
                $confidence = 90;
                return ['ward' => $ward, 'confidence' => $confidence];
            }
        }

        // Try alias match (priority-based confidence)
        $aliases = WardAlias::with('ward')
            ->whereHas('ward', function ($q) use ($districtCode) {
                $q->where('district_code', $districtCode)
                    ->where('is_active', true);
            })
            ->orderBy('priority', 'asc')
            ->get();

        foreach ($aliases as $alias) {
            if (stripos($normalizedText, $alias->alias_text) !== false) {
                // Higher priority (lower number) = higher confidence
                // Priority 1 = 90, Priority 5 = 80, Priority 10 = 70, Priority 20+ = 60
                $confidence = max(60, 95 - ($alias->priority * 2));
                return ['ward' => $alias->ward, 'confidence' => $confidence];
            }
        }

        return null;
    }

    /**
     * Match Suitable Vehicle Types
     */
    private function matchSuitableVehicleTypes($constraints, $goodsReq, Branch $branch)
    {
        // Get vehicles assigned to this branch
        $vehicleIds = $branch->vehicles()->pluck('vehicles.vehicle_id')->toArray();

        $candidateVehicles = [];

        foreach ($vehicleIds as $vehicleId) {
            $vehicle = Vehicle::with('supportedGoods')->find($vehicleId);
            if (!$vehicle || !$vehicle->is_active) {
                continue;
            }

            // Check route scope compatibility
            if (!$this->routeScopeCompatible($constraints['route_scope'], $vehicle->route_scope)) {
                continue;
            }

            // Check goods type support
            $supportedGoodsTypes = $vehicle->supportedGoods->pluck('goods_type')->toArray();
            if (!$this->goodsTypeSupported($goodsReq['required_goods_type'], $supportedGoodsTypes)) {
                continue;
            }

            // Check max load capacity
            if ($goodsReq['weight'] > (float) $vehicle->max_load_kg) {
                continue;
            }

            // Check max volume
            if ($goodsReq['volume'] > (float) $vehicle->max_volume_m3) {
                continue;
            }

            // Check dimensions if available
            if ($goodsReq['dimensions'] !== null) {
                if (!$this->dimensionsFit($goodsReq['dimensions'], [
                    'length_cm' => (float) $vehicle->max_length_cm,
                    'width_cm' => (float) $vehicle->max_width_cm,
                    'height_cm' => (float) $vehicle->max_height_cm,
                ])) {
                    continue;
                }
            }

            // Check service compatibility
            if (!$this->serviceCompatible($constraints['service_type'], $vehicle->vehicle_type)) {
                continue;
            }

            $candidateVehicles[] = $vehicle;
        }

        return $candidateVehicles;
    }

    /**
     * Calculate Vehicle Capacity Usage
     */
    private function calculateVehicleCapacityUsage($candidateVehicles, $goodsReq)
    {
        $availableVehicles = [];

        foreach ($candidateVehicles as $vehicle) {
            $load = VehicleLoadTracking::firstOrCreate(
                ['vehicle_id' => $vehicle->vehicle_id],
                [
                    'current_load_kg' => 0,
                    'current_volume_m3' => 0,
                    'current_order_count' => 0,
                ]
            );

            $remainingWeight = (float) $vehicle->max_load_kg - (float) $load->current_load_kg;
            $remainingVolume = (float) $vehicle->max_volume_m3 - (float) $load->current_volume_m3;

            // Filter vehicles with enough capacity
            if ($remainingWeight < $goodsReq['weight']) {
                continue;
            }

            if ($remainingVolume < $goodsReq['volume']) {
                continue;
            }

            $availableVehicles[] = [
                'vehicle' => $vehicle,
                'current_order_count' => $load->current_order_count,
                'used_weight' => (float) $load->current_load_kg,
                'used_volume' => (float) $load->current_volume_m3,
                'remaining_weight' => $remainingWeight,
                'remaining_volume' => $remainingVolume,
            ];
        }

        return $availableVehicles;
    }

    /**
     * Sort Suggestions Cost Optimized
     */
    private function sortSuggestionsCostOptimized($availableVehicles, $shipmentData)
    {
        $vehicleTypePriority = [
            'Motorbike' => 1,
            '2.5-ton Truck' => 2,
            '3.5-ton Truck' => 3,
            '5-ton Truck' => 4,
        ];

        foreach ($availableVehicles as &$item) {
            $v = $item['vehicle'];
            $item['type_priority'] = $vehicleTypePriority[$v->vehicle_type] ?? 999;

            // Calculate waste
            $item['waste_weight'] = $item['remaining_weight'] - $shipmentData['total_weight_kg'];
            $item['waste_volume'] = $item['remaining_volume'] - $shipmentData['total_volume_m3'];

            // Normalized waste ratios
            $item['waste_weight_ratio'] = $item['waste_weight'] / (float) $v->max_load_kg;
            $item['waste_volume_ratio'] = $item['waste_volume'] / (float) $v->max_volume_m3;

            // Cost score (lower is better)
            $item['cost_score'] = 1000 * $item['type_priority']
                + 10 * $item['waste_weight_ratio']
                + 10 * $item['waste_volume_ratio']
                + 1 * $item['current_order_count'];
        }

        // Sort by cost_score ascending
        usort($availableVehicles, function ($a, $b) {
            return $a['cost_score'] <=> $b['cost_score'];
        });

        return $availableVehicles;
    }

    /**
     * Route Scope Compatible
     */
    private function routeScopeCompatible($requiredScope, $vehicleScope)
    {
        // Vehicle can handle same or broader scope
        $scopeHierarchy = [
            'INTRA_PROVINCE' => 1,
            'INTRA_REGION' => 2,
            'INTER_REGION_NEAR' => 3,
            'INTER_REGION_FAR' => 4,
        ];

        $requiredLevel = $scopeHierarchy[$requiredScope] ?? 999;
        $vehicleLevel = $scopeHierarchy[$vehicleScope] ?? 999;

        return $vehicleLevel >= $requiredLevel;
    }

    /**
     * Goods Type Supported
     */
    private function goodsTypeSupported($requiredGoodsType, $supportedGoodsTypes)
    {
        return in_array($requiredGoodsType, $supportedGoodsTypes);
    }

    /**
     * Dimensions Fit
     */
    private function dimensionsFit($parcelDimensions, $vehicleMaxDimensions)
    {
        return $parcelDimensions['length_cm'] <= $vehicleMaxDimensions['length_cm']
            && $parcelDimensions['width_cm'] <= $vehicleMaxDimensions['width_cm']
            && $parcelDimensions['height_cm'] <= $vehicleMaxDimensions['height_cm'];
    }

    /**
     * Service Compatible
     */
    private function serviceCompatible($serviceType, $vehicleType)
    {
        // Express service: only Motorbike
        if ($serviceType === 'Express') {
            return $vehicleType === 'Motorbike';
        }

        // Standard service: all trucks
        if ($serviceType === 'Standard') {
            return $vehicleType !== 'Motorbike';
        }

        return false;
    }

    /**
     * Normalize Goods Type (for vehicle assignment)
     */
    private function normalizeGoodsTypeForVehicle($goodsType)
    {
        $mapping = [
            'Tài liệu' => 'DOCUMENT',
            'Document' => 'DOCUMENT',
            'Documents' => 'DOCUMENT',
            'Thực phẩm và đồ uống' => 'FOOD',
            'Food' => 'FOOD',
            'FOOD' => 'FOOD',
            'Điện tử' => 'ELECTRONICS',
            'Electronics' => 'ELECTRONICS',
            'ELECTRONICS' => 'ELECTRONICS',
            'Quần áo' => 'LIGHT_GOODS',
            'Clothing' => 'LIGHT_GOODS',
            'LIGHT_GOODS' => 'LIGHT_GOODS',
            'Văn phòng' => 'OFFICE_EQUIPMENT',
            'Office Equipment' => 'OFFICE_EQUIPMENT',
            'OFFICE_EQUIPMENT' => 'OFFICE_EQUIPMENT',
            'Nội thất' => 'FURNITURE',
            'Furniture' => 'FURNITURE',
            'FURNITURE' => 'FURNITURE',
            'Xe cộ' => 'VEHICLE',
            'Vehicle' => 'VEHICLE',
            'VEHICLE' => 'VEHICLE',
            'Vật liệu xây dựng' => 'CONSTRUCTION_MATERIAL',
            'Construction Material' => 'CONSTRUCTION_MATERIAL',
            'CONSTRUCTION_MATERIAL' => 'CONSTRUCTION_MATERIAL',
        ];

        $goodsTypeUpper = strtoupper(trim($goodsType));
        foreach ($mapping as $key => $value) {
            if (strtoupper($key) === $goodsTypeUpper) {
                return $value;
            }
        }

        return $goodsTypeUpper; // Return as-is if not found
    }

    /**
     * Extract Goods Type From Items
     */
    private function extractGoodsTypeFromItems($items)
    {
        if (empty($items) || !is_array($items)) {
            return 'LIGHT_GOODS'; // Default
        }

        // Get the first item's category
        $firstItem = $items[0] ?? null;
        if ($firstItem && isset($firstItem['category'])) {
            return $firstItem['category'];
        }

        return 'LIGHT_GOODS'; // Default
    }

    /**
     * Calculate Distance Between Two Geo Points (Haversine formula)
     */
    private function geoDistanceKm($point1, $point2)
    {
        $earthRadius = 6371; // km

        $lat1 = deg2rad($point1['lat']);
        $lat2 = deg2rad($point2['lat']);
        $deltaLat = deg2rad($point2['lat'] - $point1['lat']);
        $deltaLng = deg2rad($point2['lng'] - $point1['lng']);

        $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
            cos($lat1) * cos($lat2) *
            sin($deltaLng / 2) * sin($deltaLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }



    /**
     * Estimate SLA (Service Level Agreement)
     */
    private function estimateSLA($routeType, $serviceType)
    {
        $slaDays = [
            'intra_province' => [
                'Standard' => 2,
                'Express' => 1,
            ],
            'intra_region' => [
                'Standard' => 3,
                'Express' => 2,
            ],
            'adjacent_region' => [
                'Standard' => 5,
                'Express' => 3,
            ],
            'cross_region' => [
                'Standard' => 7,
                'Express' => 4,
            ],
        ];

        $days = $slaDays[$routeType][$serviceType] ?? 5;
        return $days . ' ngày';
    }

    /**
     * Calculate base charge (legacy method for backward compatibility)
     */
    private function calculateBaseCharge($weight, $type, $serviceType)
    {
        $basePrice = 50000; // Base price in VND

        // Weight multiplier
        $weightMultiplier = max(1, $weight);

        // Type multiplier
        $typeMultipliers = [
            'Document' => 1.0,
            'Parcel' => 1.2,
            'Fragile' => 1.5,
            'Liquid' => 1.8,
        ];
        $typeMultiplier = $typeMultipliers[$type] ?? 1.0;

        // Service type multiplier
        $serviceMultiplier = $serviceType === 'Express' ? 1.5 : 1.0;

        return $basePrice * $weightMultiplier * $typeMultiplier * $serviceMultiplier;
    }

    /**
     * Send notifications when order is confirmed
     */
    private function sendOrderConfirmedNotifications(Courier $courier)
    {
        // Notification for customer
        Notification::create([
            'user_id' => $courier->user_id,
            'type' => 'order',
            'title' => 'Đơn hàng đã được xác nhận',
            'message' => "Đơn hàng #{$courier->order_id} với mã vận đơn {$courier->tracking_id} đã được xác nhận thành công.",
            'related_type' => 'Courier',
            'related_id' => $courier->id,
        ]);

        // Notification for admin
        $admins = User::where('role', 'ADMIN')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'order',
                'title' => 'Đơn hàng mới đã được xác nhận',
                'message' => "Đơn hàng #{$courier->order_id} từ khách hàng {$courier->sender_name} đã được xác nhận. Mã vận đơn: {$courier->tracking_id}",
                'related_type' => 'Courier',
                'related_id' => $courier->id,
            ]);
        }

        // Notification for agent (if branch assigned)
        if ($courier->branch_id) {
            $branch = $courier->branch;
            if ($branch) {
                $agents = $branch->agents;
                foreach ($agents as $agent) {
                    if ($agent->user_id) {
                        Notification::create([
                            'user_id' => $agent->user_id,
                            'type' => 'order',
                            'title' => 'Đơn hàng mới được gán cho chi nhánh',
                            'message' => "Đơn hàng #{$courier->order_id} đã được gán cho chi nhánh {$branch->name}. Mã vận đơn: {$courier->tracking_id}",
                            'related_type' => 'Courier',
                            'related_id' => $courier->id,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Find suitable branch and vehicles for order (Step 3: Tìm Chi nhánh)
     * This endpoint finds the nearest branch and suitable vehicles based on order information
     */
    public function findSuitableBranch(Request $request, $orderId)
    {
        try {
            $user = Auth::user();
            $courier = Courier::where('order_id', $orderId)->orWhere('id', $orderId)->firstOrFail();

            // Check authorization - all roles can use this
            if ($courier->status !== 'PRICE_ESTIMATED' && $courier->status !== 'CONFIRMED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order must be in PRICE_ESTIMATED or CONFIRMED status to find branch'
                ], 400);
            }

            // Get order information
            $senderAddress = $courier->sender_address . ', ' . $courier->sender_province;
            $receiverAddress = $courier->receiver_address . ', ' . $courier->receiver_province;
            $serviceType = $courier->service_type === 'Express' ? 'Express' : 'Standard';

            // Calculate weight and volume
            $items = $courier->items ?? [];
            $totalWeight = 0;
            $totalVolume = 0;

            foreach ($items as $item) {
                $weightKg = ($item['weight_g'] ?? 0) / 1000;
                $totalWeight += $weightKg;

                if ($serviceType === 'Standard') {
                    $volume = ($item['length_cm'] ?? 0) * ($item['width_cm'] ?? 0) * ($item['height_cm'] ?? 0);
                    $totalVolume += $volume;
                } else {
                    $expressSizes = [
                        'S' => 20 * 20 * 10,
                        'M' => 30 * 30 * 15,
                        'L' => 40 * 40 * 20,
                        'XL' => 50 * 50 * 25,
                    ];
                    $totalVolume += $expressSizes[$item['express_size'] ?? 'M'] ?? 0;
                }
            }

            $totalVolumeM3 = $totalVolume / 1000000; // Convert to m³

            // Determine vehicle type and find branch
            $vehicleResult = $this->determineVehicleTypeForCourier(
                $senderAddress,
                $receiverAddress,
                $serviceType,
                $totalWeight,
                $totalVolume,
                $items,
                $courier->branch_id
            );

            $branchId = $vehicleResult['branch_id'];
            $vehicleType = $vehicleResult['vehicle_type'];

            if (!$branchId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Courier hiện không có chi nhánh hoạt động tại khu vực này.',
                    'code' => 'NO_BRANCH_FOUND'
                ], 404);
            }

            $branch = Branch::find($branchId);
            if (!$branch || $branch->status !== 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Courier hiện không có chi nhánh hoạt động tại khu vực này.',
                    'code' => 'NO_BRANCH_FOUND'
                ], 404);
            }

            // Find suitable vehicles from this branch
            $suitableVehicles = $this->getSuitableVehiclesForBranch(
                $branchId,
                $vehicleType,
                $totalWeight,
                $totalVolumeM3,
                $items
            );

            // Update courier with branch and vehicle info
            $courier->update([
                'branch_id' => $branchId,
                'vehicle_type' => $vehicleType,
            ]);

            // If only one suitable vehicle, auto-assign it
            if (count($suitableVehicles) === 1 && $user->role !== 'CUSTOMER') {
                $courier->update([
                    'assigned_vehicle_id' => $suitableVehicles[0]['vehicle_id'],
                    'status' => 'CONFIRMED',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Tìm thấy chi nhánh phù hợp',
                'data' => [
                    'branch' => [
                        'id' => $branch->id,
                        'branch_code' => $branch->branch_code,
                        'name' => $branch->name,
                        'address' => $branch->address_text ?? $branch->address,
                        'city' => $branch->city,
                    ],
                    'vehicle_type' => $vehicleType,
                    'suitable_vehicles' => $suitableVehicles,
                    'auto_assigned' => count($suitableVehicles) === 1 && $user->role !== 'CUSTOMER',
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error finding suitable branch: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tìm chi nhánh: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get suitable vehicles for a branch
     */
    private function getSuitableVehiclesForBranch($branchId, $vehicleType, $weightKg, $volumeM3, $items = [])
    {
        try {
            // Get vehicles assigned to this branch
            $vehicles = Vehicle::whereHas('branches', function ($query) use ($branchId) {
                $query->where('branch_vehicles.branch_id', $branchId);
            })
                ->where('vehicle_type', $vehicleType)
                ->where('status', 'ACTIVE')
                ->get();

            $suitableVehicles = [];

            foreach ($vehicles as $vehicle) {
                // Check if vehicle can handle the weight and volume
                $maxWeight = $vehicle->max_weight_kg ?? 0;
                $maxVolume = $vehicle->max_volume_m3 ?? 0;

                if ($weightKg <= $maxWeight && $volumeM3 <= $maxVolume) {
                    // Check goods type compatibility
                    $goodsType = $this->extractGoodsTypeFromItems($items);
                    $normalizedGoodsType = $this->normalizeGoodsTypeForVehicle($goodsType);

                    $isCompatible = VehicleSupportedGoods::where('vehicle_id', $vehicle->vehicle_id)
                        ->where('goods_type', $normalizedGoodsType)
                        ->exists();

                    if ($isCompatible) {
                        $suitableVehicles[] = [
                            'vehicle_id' => $vehicle->vehicle_id,
                            'vehicle_code' => $vehicle->vehicle_code,
                            'vehicle_type' => $vehicle->vehicle_type,
                            'license_plate' => $vehicle->license_plate,
                            'max_weight_kg' => $maxWeight,
                            'max_volume_m3' => $maxVolume,
                            'current_load_weight_kg' => $vehicle->current_load_weight_kg ?? 0,
                            'current_load_volume_m3' => $vehicle->current_load_volume_m3 ?? 0,
                            'available_capacity_weight' => $maxWeight - ($vehicle->current_load_weight_kg ?? 0),
                            'available_capacity_volume' => $maxVolume - ($vehicle->current_load_volume_m3 ?? 0),
                        ];
                    }
                }
            }

            return $suitableVehicles;
        } catch (\Exception $e) {
            Log::error('Error getting suitable vehicles: ' . $e->getMessage());
            return [];
        }
    }
}
