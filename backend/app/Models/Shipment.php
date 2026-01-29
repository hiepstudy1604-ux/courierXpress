<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    protected $primaryKey = 'shipment_id';
    public $incrementing = true;

    protected $fillable = [
        'tracking_id',
        'user_id',
        'sender_address_text',
        'sender_name',
        'sender_phone',
        'sender_province_code',
        'receiver_address_text',
        'receiver_name',
        'receiver_phone',
        'receiver_province_code',
        'service_type',
        'goods_type',
        'declared_value',
        'total_weight_kg',
        'total_volume_m3',
        'parcel_length_cm',
        'parcel_width_cm',
        'parcel_height_cm',
        'route_scope',
        'assigned_branch_id',
        'assigned_vehicle_id',
        'shipment_status',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'declared_value' => 'decimal:2',
        'total_weight_kg' => 'decimal:2',
        'total_volume_m3' => 'decimal:3',
        'parcel_length_cm' => 'decimal:2',
        'parcel_width_cm' => 'decimal:2',
        'parcel_height_cm' => 'decimal:2',
        'assigned_at' => 'datetime',
    ];

    /**
     * Get the sender province.
     */
    public function senderProvince(): BelongsTo
    {
        return $this->belongsTo(ProvinceMaster::class, 'sender_province_code', 'province_code');
    }

    /**
     * Get the receiver province.
     */
    public function receiverProvince(): BelongsTo
    {
        return $this->belongsTo(ProvinceMaster::class, 'receiver_province_code', 'province_code');
    }

    /**
     * Get the user (customer) who created this shipment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Get the assigned branch.
     */
    public function assignedBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'assigned_branch_id', 'id');
    }

    /**
     * Get the assigned vehicle.
     */
    public function assignedVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'assigned_vehicle_id', 'vehicle_id');
    }

    /**
     * Get the user who assigned this shipment.
     */
    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by', 'id');
    }

    /**
     * Get the bill for this shipment.
     */
    public function bill(): HasOne
    {
        return $this->hasOne(Bill::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the assignment logs for this shipment.
     */
    public function assignmentLogs()
    {
        return $this->hasMany(ShipmentVehicleAssignmentLog::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the pickup schedule for this shipment.
     */
    public function pickupSchedule(): HasOne
    {
        return $this->hasOne(PickupSchedule::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the payment intent for this shipment (latest one, any status).
     */
    public function paymentIntent(): HasOne
    {
        return $this->hasOne(PaymentIntent::class, 'shipment_id', 'shipment_id')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Get all payment intents for this shipment.
     */
    public function paymentIntents(): HasMany
    {
        return $this->hasMany(PaymentIntent::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the goods inspection for this shipment.
     */
    public function goodsInspection(): HasOne
    {
        return $this->hasOne(GoodsInspection::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the active driver assignment for pickup.
     */
    public function pickupAssignment(): HasOne
    {
        return $this->hasOne(DriverAssignment::class, 'shipment_id', 'shipment_id')
            ->where('assignment_type', 'PICKUP')
            ->where('is_active', true);
    }

    /**
     * Get the active driver assignment for delivery.
     */
    public function deliveryAssignment(): HasOne
    {
        return $this->hasOne(DriverAssignment::class, 'shipment_id', 'shipment_id')
            ->where('assignment_type', 'DELIVERY')
            ->where('is_active', true);
    }

    /**
     * Get all driver assignments for this shipment.
     */
    public function driverAssignments(): HasMany
    {
        return $this->hasMany(DriverAssignment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get all warehouse scans for this shipment.
     */
    public function warehouseScans(): HasMany
    {
        return $this->hasMany(WarehouseScan::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the return order for this shipment.
     */
    public function returnOrder(): HasOne
    {
        return $this->hasOne(ReturnOrder::class, 'original_shipment_id', 'shipment_id');
    }

    /**
     * Get all admin tasks for this shipment.
     */
    public function adminTasks(): HasMany
    {
        return $this->hasMany(AdminTask::class, 'shipment_id', 'shipment_id');
    }
}
