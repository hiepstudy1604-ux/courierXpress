<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DriverAssignment extends Model
{
    protected $primaryKey = 'assignment_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'driver_assignment';

    protected $fillable = [
        'shipment_id',
        'assignment_type',
        'branch_id',
        'driver_id',
        'status',
        'assigned_by_type',
        'assigned_by',
        'assigned_at',
        'accepted_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'eta_at',
        'distance_km',
        'note',
        'is_active',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'eta_at' => 'datetime',
        'distance_km' => 'decimal:2',
        'is_active' => 'boolean',
        'assigned_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the shipment that this assignment belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the driver assigned to this assignment
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    /**
     * Get the branch that handles this assignment
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the history records for this assignment
     */
    public function history(): HasMany
    {
        return $this->hasMany(DriverAssignmentHistory::class, 'assignment_id', 'assignment_id');
    }
}
