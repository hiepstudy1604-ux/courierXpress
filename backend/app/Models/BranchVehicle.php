<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchVehicle extends Model
{
    protected $table = 'branch_vehicles';
    
    public $incrementing = false;
    protected $primaryKey = ['branch_id', 'vehicle_id'];

    protected $fillable = [
        'branch_id',
        'vehicle_id',
        'quantity',
    ];

    /**
     * Get the branch that owns this vehicle assignment.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the vehicle assigned to this branch.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }
}
