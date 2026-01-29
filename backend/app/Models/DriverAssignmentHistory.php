<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverAssignmentHistory extends Model
{
    protected $primaryKey = 'history_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'driver_assignment_history';

    protected $fillable = [
        'assignment_id',
        'shipment_id',
        'assignment_type',
        'old_driver_id',
        'new_driver_id',
        'old_status',
        'new_status',
        'change_action',
        'changed_by_type',
        'changed_by',
        'changed_at',
        'note',
    ];

    protected $casts = [
        'old_driver_id' => 'integer',
        'new_driver_id' => 'integer',
        'changed_by' => 'integer',
        'changed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the assignment that this history belongs to
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(DriverAssignment::class, 'assignment_id', 'assignment_id');
    }

    /**
     * Get the shipment that this history belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
}
