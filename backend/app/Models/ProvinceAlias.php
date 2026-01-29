<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProvinceAlias extends Model
{
    protected $table = 'province_alias';
    protected $primaryKey = 'alias_id';
    public $incrementing = true;

    protected $fillable = [
        'province_code',
        'alias_text',
        'priority',
    ];

    protected $casts = [
        'priority' => 'integer',
    ];

    /**
     * Get the province that owns the alias.
     */
    public function province(): BelongsTo
    {
        return $this->belongsTo(ProvinceMaster::class, 'province_code', 'province_code');
    }
}
