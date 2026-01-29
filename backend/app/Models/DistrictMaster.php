<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistrictMaster extends Model
{
    protected $table = 'district_master';
    protected $primaryKey = 'district_id';
    public $incrementing = true;

    protected $fillable = [
        'district_code',
        'province_code',
        'district_name',
        'district_name_raw',
        'district_type',
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
     * Get the province that owns the district
     */
    public function province()
    {
        return $this->belongsTo(ProvinceMaster::class, 'province_code', 'province_code');
    }

    /**
     * Get the wards for the district
     */
    public function wards()
    {
        return $this->hasMany(WardMaster::class, 'district_code', 'district_code');
    }

    /**
     * Get the aliases for the district
     */
    public function aliases()
    {
        return $this->hasMany(DistrictAlias::class, 'district_code', 'district_code');
    }
}
