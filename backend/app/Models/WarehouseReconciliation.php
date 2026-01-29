<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseReconciliation extends Model
{
    protected $table = 'warehouse_reconciliation';
    protected $primaryKey = 'reconciliation_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'shipment_id',
        'branch_id',
        'warehouse_role',
        'reconciled_by',
        'reconciled_at',
        'goods_check_status',
        'waybill_check_status',
        'cash_check_status',
        'expected_cash_amount',
        'received_cash_amount',
        'discrepancy_note',
        'final_status',
        'created_at',
    ];
    
    protected $casts = [
        'reconciled_at' => 'datetime',
        'created_at' => 'datetime',
        'expected_cash_amount' => 'decimal:2',
        'received_cash_amount' => 'decimal:2',
    ];
    
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
    
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }
}
