<?php

namespace App\Services;

use App\Models\EntityAssetPmSchedule;
use App\Models\AssetPmHistory;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Services\PmScheduleCalculatorService;

class PmHistoryService
{
    public function __construct(private PmScheduleCalculatorService $calculator) {}

    /**
     * Log a PM done date for an asset and recalculate next due date.
     * Floating schedule: next_due = done_date + interval_value * interval_unit
     */
    public function recordDoneDate(int $assetId, string $doneDate, ?string $performedBy = null, ?string $notes = null): array
    {
        $assetSchedule = EntityAssetPmSchedule::with('schedule')
            ->where('asset_id', $assetId)
            ->first();

        if (!$assetSchedule) {
            throw new ModelNotFoundException("No PM schedule found for asset ID {$assetId}.");
        }

        $schedule = $assetSchedule->schedule;

        if (!$schedule || !$schedule->interval_unit) {
            throw new \RuntimeException("Schedule ID {$assetSchedule->schedule_id} has no interval_unit defined.");
        }

        $parsedDoneDate = Carbon::parse($doneDate)->startOfDay();
        $nextDueDate    = $this->calculator->computeNextDueDate($parsedDoneDate, $schedule);

        DB::transaction(function () use ($assetId, $parsedDoneDate, $nextDueDate, $performedBy, $notes, $assetSchedule) {
            AssetPmHistory::create([
                'asset_id'     => $assetId,
                'done_date'    => $parsedDoneDate,
                'performed_by' => $performedBy,
                'notes'        => $notes,
                'created_at'   => now(),
            ]);

            $assetSchedule->update([
                'next_due_date' => $nextDueDate,
                'modified_by'   => $performedBy,
                'modified_at'   => now(),
            ]);
        });

        return [
            'asset_id'       => $assetId,
            'done_date'      => $parsedDoneDate->toDateString(),
            'next_due_date'  => $nextDueDate?->toDateString(),
            'interval_value' => $schedule->interval_value,
            'interval_unit'  => $schedule->interval_unit,
        ];
    }

    /**
     * Get full PM history for an asset, latest first.
     */
    public function getHistory(int $assetId): array
    {
        $assetSchedule = EntityAssetPmSchedule::with('schedule')
            ->where('asset_id', $assetId)
            ->first();

        if (!$assetSchedule) {
            throw new ModelNotFoundException("No PM schedule found for asset ID {$assetId}.");
        }

        $history = AssetPmHistory::where('asset_id', $assetId)
            ->orderBy('done_date', 'desc')
            ->get(['id', 'done_date', 'performed_by', 'notes', 'created_at']);

        return [
            'asset_id'       => $assetId,
            'next_due_date'  => $assetSchedule->next_due_date?->toDateString(),
            'interval_value' => $assetSchedule->schedule?->interval_value,
            'interval_unit'  => $assetSchedule->schedule?->interval_unit,
            'history'        => $history,
        ];
    }

    /**
     * Get all assets with their current next_due_date.
     */
    public function getAll(): \Illuminate\Support\Collection
    {
        return EntityAssetPmSchedule::with('schedule', 'asset.latestPmHistory', 'asset.location')
            ->get()
            ->map(fn($row) => [
                'asset_id'      => $row->asset_id,
                'asset'         => $row->asset,
                'next_due_date' => $row->next_due_date?->toDateString(),
                'last_done_date' => $row->asset?->latestPmHistory?->done_date?->toDateString(),
                'last_performed_by' => $row->asset?->latestPmHistory?->performed_by,
                'is_overdue'    => $row->next_due_date < now(),
                'schedule_name'  => $row->schedule?->schedule_name,
                'never_done'     => is_null($row->next_due_date),
                'interval_value' => $row->schedule?->interval_value,
                'interval_unit'  => $row->schedule?->interval_unit,
            ]);
    }
}
