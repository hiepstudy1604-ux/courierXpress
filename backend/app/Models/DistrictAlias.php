<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistrictAlias extends Model
{
    protected $table = 'district_alias';
    protected $primaryKey = 'alias_id';
    public $incrementing = true;

    protected $fillable = [
        'district_code',
        'alias_text',
        'priority',
    ];

    protected $casts = [
        'priority' => 'integer',
    ];

    /**
     * Get the district that owns the alias
     */
    public function district()
    {
        return $this->belongsTo(DistrictMaster::class, 'district_code', 'district_code');
    }
}
