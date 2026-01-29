<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnPolicyHold extends Model
{
    protected $table = 'return_policy_hold';
    protected $primaryKey = 'hold_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'return_order_id',
        'original_shipment_id',
        'hold_start_at',
        'hold_until_at',
        'pickup_by_customer_at',
        'disposed_at',
        'final_action',
        'decided_by_type',
        'decided_by',
        'note',
    ];
    
    protected $casts = [
        'hold_start_at' => 'datetime',
        'hold_until_at' => 'datetime',
        'pickup_by_customer_at' => 'datetime',
        'disposed_at' => 'datetime',
    ];
    
    public function returnOrder(): BelongsTo
    {
        return $this->belongsTo(ReturnOrder::class, 'return_order_id', 'return_order_id');
    }
    
    public function originalShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'original_shipment_id', 'shipment_id');
    }
}
