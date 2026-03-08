<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Validation\Rule;
use App\Models\GlobalPMSchedule;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Services\BulkUpserter;
use App\Traits\MassDeletesByIds;

class GlobalPmSchedulesController extends Controller
{
  use MassDeletesByIds;

  public function index(Request $request)
  {
    $search = $request->input('search', '');
    $perPage = $request->input('perPage', 30);
    $totalEntries = GlobalPMSchedule::count();

    $globalPmSchedules = GlobalPMSchedule::query()
      ->with(['globalPm', 'schedule'])
      ->when($search, function ($query, $search) {
        $query->whereHas('globalPm', fn($q) => $q->where('maintenance_name', 'like', "%{$search}%"));
      })
      ->paginate($perPage)
      ->withQueryString();

    if ($request->wantsJson()) {
      return response()->json([
        'globalPmSchedules' => $globalPmSchedules,
        'search' => $search,
        'perPage' => $perPage,
        'totalEntries' => $totalEntries,
      ]);
    }

    return Inertia::render('GlobalPmScheduleList', [
      'globalPmSchedules' => $globalPmSchedules,
      'search' => $search,
      'perPage' => $perPage,
      'totalEntries' => $totalEntries,
    ]);
  }

  public function bulkUpdate(Request $request)
  {
    $rows = $request->all();
    $user = session('emp_data');

    $columnRules = [
      'global_pm_id' => fn($id, $fields) => [
        'required',
        'int',
        Rule::unique('entity_global_pm_schedules', 'global_pm_id')
          ->ignore(is_numeric($id) ? $id : null),
      ],
      'schedule_id' => fn($id) => [
        'required',
        'int',
        Rule::exists('schedules', 'id'),
      ],
    ];

    $rows = array_map(function ($row) use ($user) {
      $row['modified_by'] = $user['emp_id'] ?? null;
      return $row;
    }, $rows);

    $bulkUpdater = new BulkUpserter(new GlobalPMSchedule(), $columnRules, [], []);

    $result = $bulkUpdater->update($rows ?? null);

    if (!empty($result['errors'])) {
      return response()->json([
        'status' => 'error',
        'message' => 'You have ' . count($result['errors']) . ' error/s',
        'data' => $result['errors']
      ], 422);
    }

    return response()->json([
      'status' => 'ok',
      'message' => 'Updated successfully',
    ]);
  }

  public function massGenocide(Request $request)
  {
    return $this->massDeleteByIds(
      $request,
      GlobalPMSchedule::class
    );
  }

  private function validateEntry(Request $request, $id = null)
  {
    return $request->validate(
      [
        'schedule_id' => 'required|integer|exists:schedules,id',
        'global_pm_id' => [
          'required',
          'integer',
          'exists:global_preventative_maintenances,id',
          Rule::unique((new GlobalPMSchedule())->getTable())->where(function ($query) use ($request) {
            return $query->where('global_pm_id', $request->global_pm_id);
          })->ignore($id),
        ],
      ],
      [
        'schedule_id.exists' =>
        'The selected schedule was not found. Please double-check and try again.',
        'global_pm_id.exists' =>
        'The selected global PM was not found. Please double-check and try again.',
        'global_pm_id.unique' =>
        'This global PM already has schedule assigned. Please choose a different global PM.',
      ],
    );
  }

  public function store(Request $request)
  {
    $validated = $this->validateEntry($request);
    $user_id = session('emp_data')['emp_id'] ?? null;

    $entry = GlobalPMSchedule::create([
      ...$validated,
      'modified_by' => $user_id,
      'modified_at' => Carbon::now(),
    ]);

    return response()->json([
      'message' => 'GlobalPMSchedule created successfully',
      'data'    => $entry,
    ], 201);
  }

  public function upsert($id = null)
  {
    $item = $id ? GlobalPMSchedule::findOrFail($id) : null;

    return Inertia::render('GlobalPmScheduleUpsert', [
      'toBeEdit' => $item,
    ]);
  }

  public function update(Request $request, $id)
  {
    $item = GlobalPMSchedule::findOrFail($id);

    $validated = $this->validateEntry($request, $id);
    $user_id = session('emp_data')['emp_id'] ?? null;

    $item->update([
      ...$validated,
      'modified_by' => $user_id,
      'modified_at' => Carbon::now(),
    ]);

    return response()->json([
      'message' => 'GlobalPMSchedule updated successfully',
      'data'    => $item,
    ]);
  }

  public function destroy($id)
  {
    try {
      $item = GlobalPMSchedule::findOrFail($id);
      $item->delete();

      return response()->json([
        'success' => true,
        'message' => 'GlobalPMSchedule deleted successfully',
      ]);
    } catch (ModelNotFoundException $e) {
      return response()->json([
        'status' => 'error',
        'message' => 'GlobalPMSchedule not found. Please verify the ID.',
      ], 404);
    }
  }
}
