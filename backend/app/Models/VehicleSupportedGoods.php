<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleSupportedGoods extends Model
{
    protected $table = 'vehicle_supported_goods';
    
    public $incrementing = false;
    protected $primaryKey = ['vehicle_id', 'goods_type'];

    protected $fillable = [
        'vehicle_id',
        'goods_type',
    ];

    /**
     * Get the vehicle that supports this goods type.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }
}
