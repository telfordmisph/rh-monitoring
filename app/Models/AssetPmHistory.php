<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetPmHistory extends Model
{
    public $timestamps = false;

    protected $table = 'asset_pm_history';

    protected $fillable = [
        'asset_id',
        'done_date',
        'performed_by',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'done_date'  => 'date',
        'created_at' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}
