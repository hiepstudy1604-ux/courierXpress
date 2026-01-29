<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentEventLog extends Model
{
    protected $primaryKey = 'payment_event_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'payment_event_log';

    protected $fillable = [
        'payment_intent_id',
        'shipment_id',
        'event_type',
        'event_at',
        'actor_type',
        'actor_id',
        'old_status',
        'new_status',
        'message',
        'raw_payload',
    ];

    protected $casts = [
        'event_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * Get the payment intent that this event log belongs to
     */
    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id', 'payment_intent_id');
    }

    /**
     * Get the shipment that this event log belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
}
