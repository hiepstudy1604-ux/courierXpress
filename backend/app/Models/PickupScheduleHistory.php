<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupScheduleHistory extends Model
{
    protected $primaryKey = 'history_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'pickup_schedule_history';

    protected $fillable = [
        'pickup_schedule_id',
        'shipment_id',
        'old_start_at',
        'old_end_at',
        'new_start_at',
        'new_end_at',
        'change_reason',
        'changed_by',
        'changed_at',
        'note',
    ];

    protected $casts = [
        'old_start_at' => 'datetime',
        'old_end_at' => 'datetime',
        'new_start_at' => 'datetime',
        'new_end_at' => 'datetime',
        'changed_at' => 'datetime',
        'changed_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the pickup schedule that this history belongs to
     */
    public function pickupSchedule(): BelongsTo
    {
        return $this->belongsTo(PickupSchedule::class, 'pickup_schedule_id', 'pickup_schedule_id');
    }

    /**
     * Get the shipment that this history belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
}
