<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    protected $primaryKey = 'vehicle_id';
    public $incrementing = true;

    protected $fillable = [
        'vehicle_code',
        'vehicle_type',
        'max_load_kg',
        'max_length_cm',
        'max_width_cm',
        'max_height_cm',
        'max_volume_m3',
        'route_scope',
        'is_active',
    ];

    protected $casts = [
        'max_load_kg' => 'decimal:2',
        'max_length_cm' => 'decimal:2',
        'max_width_cm' => 'decimal:2',
        'max_height_cm' => 'decimal:2',
        'max_volume_m3' => 'decimal:3',
        'is_active' => 'boolean',
    ];

    /**
     * Get the supported goods types for this vehicle.
     */
    public function supportedGoods()
    {
        return $this->hasMany(VehicleSupportedGoods::class, 'vehicle_id', 'vehicle_id');
    }

    /**
     * Get the branches that have this vehicle.
     */
    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_vehicles', 'vehicle_id', 'branch_id', 'vehicle_id', 'id')
            ->withPivot(['quantity']);
    }

    /**
     * Get the load tracking for this vehicle.
     */
    public function loadTracking()
    {
        return $this->hasOne(VehicleLoadTracking::class, 'vehicle_id', 'vehicle_id');
    }

    /**
     * Get the assignment logs for this vehicle.
     */
    public function assignmentLogs()
    {
        return $this->hasMany(ShipmentVehicleAssignmentLog::class, 'vehicle_id', 'vehicle_id');
    }

    /**
     * Get the driver currently using this vehicle
     */
    public function currentDriver()
    {
        return $this->hasOne(Driver::class, 'vehicle_id', 'vehicle_id')
            ->where('is_active', true);
    }

    /**
     * Get the vehicle assignment history
     */
    public function driverAssignmentHistory()
    {
        return $this->hasMany(DriverVehicleAssignmentHistory::class, 'vehicle_id', 'vehicle_id')
            ->orderBy('assigned_at', 'desc');
    }
}
