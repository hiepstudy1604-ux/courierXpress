<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnEventLog extends Model
{
    protected $table = 'return_event_log';
    protected $primaryKey = 'return_event_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'return_order_id',
        'original_shipment_id',
        'event_type',
        'old_status',
        'new_status',
        'event_at',
        'actor_type',
        'actor_id',
        'message',
        'raw_payload',
    ];
    
    protected $casts = [
        'event_at' => 'datetime',
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
