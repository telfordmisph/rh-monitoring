<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CheckItem extends Model
{
  protected $table = 'check_items';
  public $timestamps = false;

  protected $fillable = [
    'name',
    'description',
  ];

  protected static function booted()
  {
    static::creating(function ($item) {
      $item->slug ??= Str::slug($item->name, '_');
    });
  }
}
