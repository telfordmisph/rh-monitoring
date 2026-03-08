<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityAssetPmSchedule extends Model
{
    public $timestamps = false;

    protected $table = 'entity_asset_pm_schedules';

    protected $fillable = [
        'schedule_id',
        'asset_id',
        'next_due_date',
        'modified_by',
        'modified_at',
    ];

    protected $casts = [
        'next_due_date' => 'date',
        'modified_at'   => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}
