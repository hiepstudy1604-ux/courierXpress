<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseScan extends Model
{
    protected $table = 'warehouse_scan';
    protected $primaryKey = 'scan_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'shipment_id',
        'branch_id',
        'warehouse_role',
        'scan_type',
        'scanned_by_role',
        'scanned_by',
        'scanned_at',
        'waybill_code',
        'package_count',
        'condition_status',
        'note',
        'created_at',
    ];
    
    protected $casts = [
        'scanned_at' => 'datetime',
        'created_at' => 'datetime',
        'package_count' => 'integer',
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
