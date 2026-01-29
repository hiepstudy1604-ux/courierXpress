<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransitManifest extends Model
{
    protected $table = 'transit_manifest';
    protected $primaryKey = 'manifest_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'manifest_code',
        'vehicle_id',
        'driver_id',
        'origin_branch_id',
        'origin_warehouse_role',
        'dest_branch_id',
        'dest_warehouse_role',
        'route_scope',
        'service_type',
        'status',
        'created_by_type',
        'created_by',
        'created_at',
        'loaded_at',
        'departed_at',
        'arrived_at',
        'closed_at',
        'note',
    ];
    
    protected $casts = [
        'created_at' => 'datetime',
        'loaded_at' => 'datetime',
        'departed_at' => 'datetime',
        'arrived_at' => 'datetime',
        'closed_at' => 'datetime',
    ];
    
    public function originBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'origin_branch_id', 'id');
    }
    
    public function destBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'dest_branch_id', 'id');
    }
    
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }
    
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }
    
    public function items(): HasMany
    {
        return $this->hasMany(TransitManifestItem::class, 'manifest_id', 'manifest_id');
    }
    
    public function events(): HasMany
    {
        return $this->hasMany(TransitManifestEvent::class, 'manifest_id', 'manifest_id');
    }
}
