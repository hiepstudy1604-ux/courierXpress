<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WardAlias extends Model
{
    protected $table = 'ward_alias';
    protected $primaryKey = 'alias_id';
    public $incrementing = true;

    protected $fillable = [
        'ward_code',
        'alias_text',
        'priority',
    ];

    protected $casts = [
        'priority' => 'integer',
    ];

    /**
     * Get the ward that owns the alias
     */
    public function ward()
    {
        return $this->belongsTo(WardMaster::class, 'ward_code', 'ward_code');
    }
}
