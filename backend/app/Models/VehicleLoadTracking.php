<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleLoadTracking extends Model
{
    protected $table = 'vehicle_load_tracking';
    protected $primaryKey = 'vehicle_id';
    public $incrementing = false;

    protected $fillable = [
        'vehicle_id',
        'current_load_kg',
        'current_volume_m3',
        'current_order_count',
    ];

    protected $casts = [
        'current_load_kg' => 'decimal:2',
        'current_volume_m3' => 'decimal:3',
        'current_order_count' => 'integer',
    ];

    /**
     * Get the vehicle that this tracking belongs to.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }
}
