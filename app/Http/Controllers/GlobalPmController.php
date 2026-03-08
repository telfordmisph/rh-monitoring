<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use App\Models\GlobalPm;
use App\Services\BulkUpserter;

class GlobalPmController extends Controller
{
  public function index(Request $request)
  {
    $search = $request->input('search', '');
    $perPage = $request->input('perPage', 100);
    $totalEntries = GlobalPm::count();

    $globalPms = GlobalPm::query()
      ->when($search, function ($query, $search) {
        $query->Where('maintenance_name', 'like', "%{$search}%");
      })
      ->orderBy('maintenance_name')
      ->paginate($perPage)
      ->withQueryString();

    if ($request->wantsJson()) {
      return response()->json([
        'globalPms' => $globalPms,
        'search' => $search,
        'perPage' => $perPage,
        'totalEntries' => $totalEntries,
      ]);
    }

    return Inertia::render('GlobalPmList', [
      'globalPms' => $globalPms,
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
      'maintenance_name' => fn($id) => [
        'required',
        'string',
        Rule::unique('global_pm', 'maintenance_name')
          ->ignore(is_numeric($id) ? $id : null),
      ],
      'maintenance_description' => fn() => [
        'nullable',
        'string',
      ],
      'properties' => 'nullable|array',
    ];

    $rows = array_map(function ($row) use ($user) {
      $row['modified_by'] = $user['emp_id'] ?? null;
      return $row;
    }, $rows);

    $bulkUpdater = new BulkUpserter(new GlobalPm(), $columnRules, [], []);

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
}
