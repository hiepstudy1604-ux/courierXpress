<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProhibitedKeyword extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'prohibited_category_id',
        'keyword',
        'match_type',
        'risk_weight',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'risk_weight' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Get the category that owns the keyword.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ProhibitedCategory::class, 'prohibited_category_id');
    }
}
