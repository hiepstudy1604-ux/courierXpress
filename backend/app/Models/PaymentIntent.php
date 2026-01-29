<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentIntent extends Model
{
    protected $primaryKey = 'payment_intent_id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false; // Table only has created_at, not updated_at

    protected $table = 'payment_intent';

    protected $fillable = [
        'shipment_id',
        'pricing_adjustment_id',
        'currency',
        'method',
        'provider',
        'status',
        'amount',
        'amount_paid',
        'payer_role',
        'reference_code',
        'provider_txn_id',
        'expires_at',
        'confirmed_at',
        'failed_at',
        'fallback_payment_intent_id',
        'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    /**
     * Get the shipment that this payment intent belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the fallback payment intent (if this is an online payment that timed out)
     */
    public function fallbackPaymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'fallback_payment_intent_id', 'payment_intent_id');
    }

    /**
     * Get the payment event logs for this intent
     */
    public function eventLogs(): HasMany
    {
        return $this->hasMany(PaymentEventLog::class, 'payment_intent_id', 'payment_intent_id');
    }
}
