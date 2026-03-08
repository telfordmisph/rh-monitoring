<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePmHistoryRequest;
use App\Services\PmHistoryService;
use App\Services\GlobalPmHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Inertia\Inertia;

class PmHistoryController extends Controller
{
    public function __construct(
        private readonly PmHistoryService $assetPmService,
        private readonly GlobalPmHistoryService $globalPmService,
    ) {}

    // /**
    //  * GET /api/assets/{assetId}/pm-history
    //  */
    // public function index(int $assetId)
    // {
    //     $data = $this->service->getHistory($assetId);
    //     return Inertia::render('AssetPmHistoryPage', [
    //         'assetId'      => $data['asset_id'],
    //         'nextDueDate'  => $data['next_due_date'],
    //         'history'      => $data['history'],
    //     ]);
    // }

    /**
     * GET /api/assets/pm-schedule
     */
    public function getAllSchedule()
    {
        $assetSchedules = $this->assetPmService->getAll();
        $globalSchedules = $this->globalPmService->getAll();

        $assetSchedules = $assetSchedules->map(function ($schedule) {
            return [
                ...$schedule,
                "id" => $schedule['asset_id'],
                "type" => "asset",
            ];
        });

        $globalSchedules = $globalSchedules->map(function ($schedule) {
            return [
                ...$schedule,
                "id" => $schedule['global_pm_id'],
                "type" => "global",
            ];
        });

        return Inertia::render('PMScheduleCalendar', [
            'assetSchedules'      => $assetSchedules,
            'globalSchedules'      => $globalSchedules,
        ]);
    }

    public function recordAssetPmDoneDate(StorePmHistoryRequest $request, int $assetId): JsonResponse
    {
        $user = session('emp_data');
        $performedBy = $user['emp_id'] ?? null;

        try {
            $result = $this->assetPmService->recordDoneDate(
                assetId: $assetId,
                doneDate: $request->validated('done_date'),
                performedBy: $performedBy,
                notes: $request->validated('notes'),
            );

            return response()->json($result, 201);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function recordGlobalPmDoneDate(StorePmHistoryRequest $request, int $globalPmId): JsonResponse
    {
        $user = session('emp_data');
        $performedBy = $user['emp_id'] ?? null;

        try {
            $result = $this->globalPmService->recordDoneDate(
                globalPmId: $globalPmId,
                doneDate: $request->validated('done_date'),
                performedBy: $performedBy,
                notes: $request->validated('notes'),
            );

            return response()->json($result, 201);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
