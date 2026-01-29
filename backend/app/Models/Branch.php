<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_code',
        'name',
        'location',
        'city',
        'district',
        'address',
        'address_text',
        'province_code',
        'latitude',
        'longitude',
        'branch_image',
        'branch_manager_name',
        'branch_manager_phone',
        'agent_code',
        'status',
        'is_active',
        'motorbike',
        'truck_500kg',
        'truck_1t',
        'truck_2t',
        'truck_2_5t',
        'truck_3_5t',
        'truck_5t',
        'total_shipments',
        'active_shipments',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'latitude' => 'decimal:6',
        'longitude' => 'decimal:6',
        'motorbike' => 'integer',
        'truck_500kg' => 'integer',
        'truck_1t' => 'integer',
        'truck_2t' => 'integer',
        'truck_2_5t' => 'integer',
        'truck_3_5t' => 'integer',
        'truck_5t' => 'integer',
        'total_shipments' => 'integer',
        'active_shipments' => 'integer',
    ];

    /**
     * Get the users for the branch.
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the agents for the branch.
     */
    public function agents()
    {
        return $this->hasMany(Agent::class);
    }

    /**
     * Get the couriers for the branch.
     */
    public function couriers()
    {
        return $this->hasMany(Courier::class);
    }

    /**
     * Get the province that the branch belongs to.
     */
    public function province()
    {
        return $this->belongsTo(ProvinceMaster::class, 'province_code', 'province_code');
    }

    /**
     * Get the vehicles assigned to this branch.
     */
    public function vehicles()
    {
        return $this->belongsToMany(Vehicle::class, 'branch_vehicles', 'branch_id', 'vehicle_id', 'id', 'vehicle_id')
            ->withPivot(['quantity']);
    }
}
