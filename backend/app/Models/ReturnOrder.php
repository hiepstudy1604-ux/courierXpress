<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ReturnOrder extends Model
{
    protected $table = 'return_order';
    protected $primaryKey = 'return_order_id';
    
    public $timestamps = true;
    const UPDATED_AT = 'updated_at';
    const CREATED_AT = 'created_at';
    
    protected $fillable = [
        'original_shipment_id',
        'return_shipment_id',
        'reason_code',
        'reason_note',
        'service_type',
        'route_scope',
        'origin_branch_id',
        'dest_branch_id',
        'current_branch_id',
        'status',
        'created_by_type',
        'created_by',
        'created_at',
        'updated_at',
    ];
    
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    public function originalShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'original_shipment_id', 'shipment_id');
    }
    
    public function returnShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'return_shipment_id', 'shipment_id');
    }
    
    public function originBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'origin_branch_id', 'id');
    }
    
    public function destBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'dest_branch_id', 'id');
    }
    
    public function currentBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'current_branch_id', 'id');
    }
    
    public function eventLogs(): HasMany
    {
        return $this->hasMany(ReturnEventLog::class, 'return_order_id', 'return_order_id');
    }
    
    public function policyHold(): HasOne
    {
        return $this->hasOne(ReturnPolicyHold::class, 'return_order_id', 'return_order_id');
    }
}
