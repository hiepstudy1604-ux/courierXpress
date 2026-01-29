<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Agent extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_code',
        'name',
        'phone',
        'email',
        'branch_id',
        'user_id',
        'status',
        'raw_password',
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

    /**
     * Get the branch that the agent belongs to.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the user that the agent belongs to.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the couriers for the agent.
     */
    public function couriers()
    {
        return $this->hasMany(Courier::class);
    }

    /**
     * Get vehicles as array
     */
    public function getVehiclesAttribute()
    {
        return [
            'motorbike' => $this->motorbike,
            'truck_500kg' => $this->truck_500kg,
            'truck_1t' => $this->truck_1t,
            'truck_2t' => $this->truck_2t,
            'truck_2_5t' => $this->truck_2_5t,
            'truck_3_5t' => $this->truck_3_5t,
            'truck_5t' => $this->truck_5t,
        ];
    }
}
