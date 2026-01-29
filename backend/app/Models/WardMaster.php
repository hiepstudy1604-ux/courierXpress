<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WardMaster extends Model
{
    protected $table = 'ward_master';
    protected $primaryKey = 'ward_id';
    public $incrementing = true;

    protected $fillable = [
        'ward_code',
        'district_code',
        'province_code',
        'ward_name',
        'ward_name_raw',
        'ward_type',
        'is_active',
        'effective_from',
        'effective_to',
        'source_name',
        'source_ref',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Get the province that owns the ward
     */
    public function province()
    {
        return $this->belongsTo(ProvinceMaster::class, 'province_code', 'province_code');
    }

    /**
     * Get the aliases for the ward
     */
    public function aliases()
    {
        return $this->hasMany(WardAlias::class, 'ward_code', 'ward_code');
    }
}
