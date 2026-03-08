<?php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Checklist;
use App\Models\ChecklistItemResult;
use App\Constants\DueScheduleQuery;
use App\Constants\CheckItemStatusDashboard;
use App\Models\Employee;

class CheckItemsResultRepository
{
  private static function getLatestVerifiedResults($checklistId, $checkItemNames = [], int $rank = 1)
  {
    $rankedResults = DB::table('checklist_item_results as cir2')
      ->select(
        'cir2.asset_id',
        'cir2.checklist_item_id',
        'cir2.checked_at',
        'cir2.checklist_instance_id',
        DB::raw('ROW_NUMBER() OVER (PARTITION BY cir2.asset_id, cir2.checklist_item_id ORDER BY cir2.checked_at DESC) as rn')
      )
      ->join('checklist_items as ci2', 'ci2.id', '=', 'cir2.checklist_item_id')
      ->join('check_items as ct2', 'ct2.id', '=', 'ci2.item_id')
      ->join('checklist_instances as ci', 'ci.id', '=', 'cir2.checklist_instance_id')
      ->whereNotNull('ci.verified_at')
      ->when(!empty($checklistId), fn($q) => $q->where('ci2.checklist_id', $checklistId))
      ->when(!empty($checkItemNames), fn($q) => $q->whereIn('ct2.name', $checkItemNames));

    // Filter to the desired rank (1=latest, 2=second latest, etc.)
    $targetResults = DB::table(DB::raw("({$rankedResults->toSql()}) as ranked"))
      ->mergeBindings($rankedResults)
      ->where('rn', $rank)
      ->select('asset_id', 'checklist_item_id', 'checked_at');

    return ChecklistItemResult::query()
      ->with('checkedBy:EMPLOYID,FIRSTNAME,LASTNAME,JOB_TITLE')
      ->from('checklist_item_results as cir')
      ->select([
        'cir.checked_at',
        'ct.name as item_name',
        'cir.item_status',
        'a.code as asset_name',
        'l.location_name as asset_location',
        'cir.checked_by',
        DB::raw("s.id IS NULL as is_no_schedule"),
      ])
      ->addSelect(DueScheduleQuery::dueRaw())
      ->join('checklist_items as ci', 'ci.id', '=', 'cir.checklist_item_id')
      ->leftjoin('entity_checklist_item_schedules as ecs', 'ecs.checklist_item_id', '=', 'ci.id')
      ->leftjoin('schedules as s', 's.id', '=', 'ecs.schedule_id')
      ->join('check_items as ct', 'ct.id', '=', 'ci.item_id')
      ->join('assets as a', 'a.id', '=', 'cir.asset_id')
      ->join('locations as l', 'l.id', '=', 'a.location_id')
      ->joinSub($targetResults, 'latest', function ($join) {
        $join->on('latest.asset_id', '=', 'cir.asset_id')
          ->on('latest.checklist_item_id', '=', 'cir.checklist_item_id')
          ->on('latest.checked_at', '=', 'cir.checked_at');
      })
      ->when(!empty($checklistId), fn($q) => $q->where('ci.checklist_id', $checklistId))
      ->when(!empty($checkItemNames), fn($q) => $q->whereIn('ct.name', $checkItemNames));
  }

  public static function getAllStatusResults()
  {
    $results  = self::getLatestVerifiedResults(null, null)
      ->whereRaw(
        'LOWER(cir.item_status) IN (' . implode(',', array_fill(0, count(CheckItemStatusDashboard::CHECK_ITEM_STATUS), '?')) . ')',
        array_map('strtolower', CheckItemStatusDashboard::CHECK_ITEM_STATUS)
      )
      ->groupBy('cir.item_status')
      ->select('cir.item_status', DB::raw('COUNT(DISTINCT a.code) as asset_count'))
      ->get()
      ->keyBy(fn($row) => strtolower($row->item_status));

    return collect(CheckItemStatusDashboard::CHECK_ITEM_STATUS)->map(fn($status) => [
      'item_status' => $status,
      'asset_count' => $results->has(strtolower($status)) ? $results[strtolower($status)]->asset_count : 0,
    ]);
  }

  public static function getLatestCheckItemsStatusByChecklist(int $checklistId, ?string $assetNameSearch = null)
  {
    return self::getLatestVerifiedResults($checklistId, [])
      ->when($assetNameSearch, fn($q) => $q->where('a.code', 'like', '%' . $assetNameSearch . '%'))
      ->get()
      ->groupBy(fn($row) => strtolower($row->asset_name));
  }

  public static function getLastAndFirstSinceLastPmByChecklist(int $checklistId, ?string $assetNameSearch = null)
  {
    $latestPm = DB::table('asset_pm_history')
      ->select('asset_id', 'done_date', DB::raw('ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY done_date DESC) as rn'));

    $rangeRanked = ChecklistItemResult::query()
      ->with('checkedBy:EMPLOYID,FIRSTNAME,LASTNAME,JOB_TITLE')
      ->from('checklist_item_results as cir')
      ->select([
        'cir.checked_at',
        'cli.verified_at',
        'cli.verified_by',
        'ct.name as item_name',
        'ct.slug as item_slug',
        'cir.item_status',
        'a.code as asset_name',
        'pm.done_date as last_pm_date',
        'l.location_name as asset_location',
        'cir.checked_by',
        DB::raw("s.id IS NULL as is_no_schedule"),
        DB::raw('ROW_NUMBER() OVER (PARTITION BY cir.asset_id, cir.checklist_item_id ORDER BY cir.checked_at ASC) as rn_asc'),
        DB::raw('ROW_NUMBER() OVER (PARTITION BY cir.asset_id, cir.checklist_item_id ORDER BY cir.checked_at DESC) as rn_desc'),
      ])
      ->addSelect(DueScheduleQuery::dueRaw())
      ->join('checklist_items as ci', 'ci.id', '=', 'cir.checklist_item_id')
      ->leftjoin('entity_checklist_item_schedules as ecs', 'ecs.checklist_item_id', '=', 'ci.id')
      ->leftjoin('schedules as s', 's.id', '=', 'ecs.schedule_id')
      ->join('check_items as ct', 'ct.id', '=', 'ci.item_id')
      ->join('assets as a', 'a.id', '=', 'cir.asset_id')
      ->join('checklist_instances as cli', 'cli.id', '=', 'cir.checklist_instance_id')
      ->whereNotNull('cli.verified_at')
      ->join('locations as l', 'l.id', '=', 'a.location_id')
      ->leftJoinSub(
        $latestPm,
        'pm',
        fn($j) => $j
          ->on('pm.asset_id', '=', 'cir.asset_id')
          ->where('pm.rn', 1)
      )
      ->where(
        fn($q) => $q
          ->whereNull('pm.done_date')
          ->orWhereColumn('cir.checked_at', '>', 'pm.done_date')
      )
      ->when(!empty($checklistId), fn($q) => $q->where('ci.checklist_id', $checklistId));

    $target = DB::table(DB::raw("({$rangeRanked->toSql()}) as ranked"))
      ->mergeBindings($rangeRanked->toBase())
      ->where(fn($q) => $q->where('rn_asc', 1)->orWhere('rn_desc', 1))
      ->select(
        'item_name',
        'last_pm_date',
        'item_slug',
        'is_due',
        'asset_name',
        'asset_location',
        'checked_at',
        'item_status',
        'checked_by',
        'verified_at',
        'verified_by',
        'is_no_schedule',
        'rn_asc',
        'rn_desc',
      );

    $results = $target->get()->groupBy(['asset_name', 'item_name'])->map(
      fn($assetRows) =>
      $assetRows->map(fn($rows) => [
        'first' => $rows->firstWhere('rn_asc', 1),
        'latest' => $rows->firstWhere('rn_desc', 1),
      ])
    );

    $employeeIds = $results->flatten(1)->flatMap(fn($item) => [
      $item['first']?->checked_by,
      $item['latest']?->checked_by,
    ])->filter()->unique()->values();

    $employees = Employee::whereIn('EMPLOYID', $employeeIds)
      ->select('EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE')
      ->get()
      ->keyBy('EMPLOYID');

    return $results->map(
      fn($assetRows) =>
      $assetRows->map(fn($item) => array_merge($item, [
        'first_checked_by' => $employees->get($item['first']?->checked_by),
        'latest_checked_by' => $employees->get($item['latest']?->checked_by),
      ]))
    );
  }
}
