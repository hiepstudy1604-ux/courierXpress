<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransitManifestItem extends Model
{
    protected $table = 'transit_manifest_item';
    protected $primaryKey = 'manifest_item_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'manifest_id',
        'shipment_id',
        'item_status',
        'added_at',
        'removed_at',
        'note',
    ];
    
    protected $casts = [
        'added_at' => 'datetime',
        'removed_at' => 'datetime',
    ];
    
    public function manifest(): BelongsTo
    {
        return $this->belongsTo(TransitManifest::class, 'manifest_id', 'manifest_id');
    }
    
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }
}
