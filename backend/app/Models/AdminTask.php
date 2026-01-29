<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminTask extends Model
{
    protected $table = 'admin_task';
    protected $primaryKey = 'task_id';
    
    public $timestamps = true;
    const UPDATED_AT = 'updated_at';
    const CREATED_AT = 'created_at';
    
    protected $fillable = [
        'task_code',
        'task_type',
        'priority',
        'status',
        'shipment_id',
        'branch_id',
        'driver_id',
        'manifest_id',
        'return_order_id',
        'related_table',
        'related_id',
        'title',
        'description',
        'due_at',
        'created_at',
        'updated_at',
        'assigned_to',
        'assigned_at',
        'resolved_at',
        'resolution_code',
        'resolution_note',
    ];
    
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'due_at' => 'datetime',
        'assigned_at' => 'datetime',
        'resolved_at' => 'datetime',
        'priority' => 'integer',
    ];
    
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
    
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }
    
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }
    
    public function manifest(): BelongsTo
    {
        return $this->belongsTo(TransitManifest::class, 'manifest_id', 'manifest_id');
    }
    
    public function returnOrder(): BelongsTo
    {
        return $this->belongsTo(ReturnOrder::class, 'return_order_id', 'return_order_id');
    }
    
    public function events(): HasMany
    {
        return $this->hasMany(AdminTaskEvent::class, 'task_id', 'task_id');
    }
}
