<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalPm extends Model
{
  protected $table = 'global_pm';
  public $timestamps = false;

  protected $fillable = [
    'maintenance_name',
    'maintenance_description',
    'modified_by',
  ];

  public function latestPmHistory()
  {
    return $this->hasOne(GlobalPmHistory::class)->latestOfMany('done_date');
  }
}
