<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    protected $table = 'driver';
    protected $primaryKey = 'driver_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'driver_code',
        'full_name',
        'phone_number',
        'email',
        'branch_id',
        'vehicle_id',
        'home_province_code',
        'working_region',
        'vehicle_type',
        'license_number',
        'driver_status',
        'current_lat',
        'current_lng',
        'last_location_at',
        'max_active_orders',
        'is_active',
        'joined_at',
    ];

    protected $casts = [
        'current_lat' => 'decimal:6',
        'current_lng' => 'decimal:6',
        'last_location_at' => 'datetime',
        'max_active_orders' => 'integer',
        'is_active' => 'boolean',
        'joined_at' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the branch that the driver belongs to
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the home province of the driver
     */
    public function homeProvince(): BelongsTo
    {
        return $this->belongsTo(ProvinceMaster::class, 'home_province_code', 'province_code');
    }

    /**
     * Get the vehicle assigned to this driver
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    /**
     * Get the vehicle assignment history for this driver
     */
    public function vehicleAssignmentHistory(): HasMany
    {
        return $this->hasMany(DriverVehicleAssignmentHistory::class, 'driver_id', 'driver_id')
            ->orderBy('assigned_at', 'desc');
    }

    /**
     * Get active driver assignments
     */
    public function activeAssignments(): HasMany
    {
        return $this->hasMany(DriverAssignment::class, 'driver_id', 'driver_id')
            ->where('is_active', true)
            ->whereIn('status', ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS']);
    }

    /**
     * Get current active orders count
     */
    public function getCurrentActiveOrdersCountAttribute(): int
    {
        return $this->activeAssignments()->count();
    }
}
