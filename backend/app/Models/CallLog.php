<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallLog extends Model
{
    protected $primaryKey = 'call_log_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'call_log';

    protected $fillable = [
        'shipment_id',
        'assignment_id',
        'call_type',
        'target_role',
        'target_phone',
        'driver_id',
        'branch_id',
        'attempt_no',
        'call_started_at',
        'call_ended_at',
        'call_result',
        'duration_seconds',
        'note',
    ];

    protected $casts = [
        'attempt_no' => 'integer',
        'call_started_at' => 'datetime',
        'call_ended_at' => 'datetime',
        'duration_seconds' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * Get the shipment that this call log belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the assignment that this call log belongs to
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(DriverAssignment::class, 'assignment_id', 'assignment_id');
    }

    /**
     * Get the driver who made the call
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    /**
     * Get the branch associated with this call
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }
}
