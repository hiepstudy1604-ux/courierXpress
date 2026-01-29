<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Courier extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'tracking_id',
        'user_id',
        'branch_id',
        'agent_id',
        'created_by',
        'sender_name',
        'sender_phone',
        'sender_address',
        'sender_ward',
        'sender_district',
        'sender_province',
        'receiver_name',
        'receiver_phone',
        'receiver_address',
        'receiver_ward',
        'receiver_district',
        'receiver_province',
        'package_type',
        'weight',
        'dimensions',
        'items',
        'base_charge',
        'tax',
        'total',
        'estimated_fee',
        'pricing_breakdown',
        'input_snapshot',
        'status',
        'booking_date',
        'pickup_date',
        'pickup_slot',
        'inspection_policy',
        'payment_method',
        'delivery_notes',
        'eta',
        'vehicle_type',
        'service_type',
    ];

    protected $casts = [
        'booking_date' => 'datetime',
        'pickup_date' => 'date',
        'eta' => 'datetime',
        'weight' => 'decimal:2',
        'base_charge' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'estimated_fee' => 'decimal:2',
        'items' => 'array',
        'pricing_breakdown' => 'array',
        'input_snapshot' => 'array',
    ];

    /**
     * Get the user that owns the courier.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user that created the courier.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the branch that the courier belongs to.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the agent that the courier belongs to.
     */
    public function agent()
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * Get the bills for the courier.
     */
    public function bills()
    {
        return $this->hasMany(Bill::class);
    }

    /**
     * Get sender as array
     */
    public function getSenderAttribute()
    {
        return [
            'name' => $this->sender_name,
            'phone' => $this->sender_phone,
            'address' => $this->sender_address,
        ];
    }

    /**
     * Get receiver as array
     */
    public function getReceiverAttribute()
    {
        return [
            'name' => $this->receiver_name,
            'phone' => $this->receiver_phone,
            'address' => $this->receiver_address,
        ];
    }

    /**
     * Get details as array
     */
    public function getDetailsAttribute()
    {
        return [
            'type' => $this->package_type,
            'weight' => (float) $this->weight,
            'dimensions' => $this->dimensions,
        ];
    }

    /**
     * Get pricing as array
     */
    public function getPricingAttribute()
    {
        return [
            'baseCharge' => (float) $this->base_charge,
            'tax' => (float) $this->tax,
            'total' => (float) $this->total,
        ];
    }
}
