<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProvinceMaster extends Model
{
    protected $table = 'province_master';
    protected $primaryKey = 'province_code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'province_code',
        'province_name',
        'province_type',
        'region_code',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'latitude' => 'decimal:6',
        'longitude' => 'decimal:6',
    ];

    /**
     * Get the districts for the province
     */
    public function districts()
    {
        return $this->hasMany(DistrictMaster::class, 'province_code', 'province_code');
    }
}