<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransitManifestEvent extends Model
{
    protected $table = 'transit_manifest_event';
    protected $primaryKey = 'event_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'manifest_id',
        'event_type',
        'event_at',
        'actor_type',
        'actor_id',
        'old_status',
        'new_status',
        'message',
    ];
    
    protected $casts = [
        'event_at' => 'datetime',
    ];
    
    public function manifest(): BelongsTo
    {
        return $this->belongsTo(TransitManifest::class, 'manifest_id', 'manifest_id');
    }
}
