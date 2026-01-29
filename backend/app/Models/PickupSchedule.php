<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PickupSchedule extends Model
{
    protected $table = 'pickup_schedule';
    protected $primaryKey = 'pickup_schedule_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'shipment_id',
        'branch_id',
        'scheduled_start_at',
        'scheduled_end_at',
        'confirmed_at',
        'confirmed_by',
        'confirm_method',
        'timezone',
        'status',
        'customer_note',
        'internal_note',
    ];

    protected $casts = [
        'scheduled_start_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'confirmed_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the shipment that this pickup schedule belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the branch that handles this pickup
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the history records for this pickup schedule
     */
    public function history(): HasMany
    {
        return $this->hasMany(PickupScheduleHistory::class, 'pickup_schedule_id', 'pickup_schedule_id');
    }
}
