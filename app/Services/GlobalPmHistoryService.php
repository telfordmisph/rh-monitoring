<?php

namespace App\Services;

use App\Models\GlobalPmSchedule;
use App\Models\GlobalPmHistory;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Services\PmScheduleCalculatorService;

class GlobalPmHistoryService
{
    public function __construct(private PmScheduleCalculatorService $calculator) {}

    /**
     * Log a PM done date for an globalPm and recalculate next due date.
     * Floating schedule: next_due = done_date + interval_value * interval_unit
     */
    public function recordDoneDate(int $globalPmId, string $doneDate, ?string $performedBy = null, ?string $notes = null): array
    {
        $globalSchedule = GlobalPmSchedule::with('schedule')
            ->where('global_pm_id', $globalPmId)
            ->first();

        if (!$globalSchedule) {
            throw new ModelNotFoundException("No PM schedule found for global pm ID {$globalPmId}.");
        }

        $schedule = $globalSchedule->schedule;

        if (!$schedule || !$schedule->interval_unit) {
            throw new \RuntimeException("Schedule ID {$globalSchedule->schedule_id} has no interval_unit defined.");
        }

        $parsedDoneDate = Carbon::parse($doneDate)->startOfDay();
        $nextDueDate    = $this->calculator->computeNextDueDate($parsedDoneDate, $schedule);

        DB::transaction(function () use ($globalPmId, $parsedDoneDate, $nextDueDate, $performedBy, $notes, $globalSchedule) {
            GlobalPmHistory::create([
                'global_pm_id'     => $globalPmId,
                'done_date'    => $parsedDoneDate,
                'performed_by' => $performedBy,
                'notes'        => $notes,
                'created_at'   => now(),
            ]);

            $globalSchedule->update([
                'next_due_date' => $nextDueDate,
                'modified_by'   => $performedBy,
                'modified_at'   => now(),
            ]);
        });

        return [
            'global_pm_id'   => $globalPmId,
            'done_date'      => $parsedDoneDate->toDateString(),
            'next_due_date'  => $nextDueDate?->toDateString(),
            'interval_value' => $schedule->interval_value,
            'interval_unit'  => $schedule->interval_unit,
        ];
    }

    /**
     * Get full PM history for an globalPm, latest first.
     */
    public function getHistory(int $globalPmId): array
    {
        $globalPmSchedule = GlobalPmSchedule::with('schedule')
            ->where('global_pm_id', $globalPmId)
            ->first();

        if (!$globalPmSchedule) {
            throw new ModelNotFoundException("No PM schedule found for global pm ID {$globalPmId}.");
        }

        $history = GlobalPmHistory::where('global_pm_id', $globalPmId)
            ->orderBy('done_date', 'desc')
            ->get(['id', 'done_date', 'performed_by', 'notes', 'created_at']);

        return [
            'global_pm_id'       => $globalPmId,
            'next_due_date'  => $globalPmSchedule->next_due_date?->toDateString(),
            'interval_value' => $globalPmSchedule->schedule?->interval_value,
            'interval_unit'  => $globalPmSchedule->schedule?->interval_unit,
            'history'        => $history,
        ];
    }

    /**
     * Get all globalPm with their current next_due_date.
     */
    public function getAll(): \Illuminate\Support\Collection
    {
        return GlobalPmSchedule::with('schedule', 'globalPm.latestPmHistory')
            ->get()
            ->map(fn($row) => [
                'global_pm_id'      => $row->global_pm_id,
                'global_pm'         => $row->globalPm,
                'next_due_date' => $row->next_due_date?->toDateString(),
                'last_done_date' => $row->globalPm?->latestPmHistory?->done_date?->toDateString(),
                'last_performed_by' => $row->globalPm?->latestPmHistory?->performed_by,
                'is_overdue'    => $row->next_due_date < now(),
                'schedule_name'  => $row->schedule?->schedule_name,
                'never_done'     => is_null($row->next_due_date),
                'interval_value' => $row->schedule?->interval_value,
                'interval_unit'  => $row->schedule?->interval_unit,
            ]);
    }
}
