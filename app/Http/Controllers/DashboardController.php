<?php

namespace App\Http\Controllers;

use App\Constants\RunningHours;
use App\Repositories\CheckItemsResultRepository;
use App\Services\AssetsService;
use App\Services\ChecklistsService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use App\Models\ChecklistInstance;
use App\Models\Checklist;
use App\Models\CheckItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function getOverallChecklistState()
    {
        $sub = (new AssetsService())->getDueAssetsQuery();

        $assetsCollapsed = DB::table(DB::raw("({$sub->toSql()}) as sub"))
            ->mergeBindings($sub->getQuery())
            ->select([
                'sub.id',
                'sub.code',
                'sub.location_name',
                'sub.checklist_id',
                DB::raw('SUM(sub.due_items) as due_items'),
                DB::raw('SUM(sub.done_items) as done_items'),
                DB::raw('SUM(sub.overdue_items) as overdue_items'),
            ])
            ->groupBy('sub.id', 'sub.code', 'sub.location_name', 'sub.checklist_id');

        $assetDetails = $assetsCollapsed->get();

        // resolve category per checklist_id in one query, no N+1
        $checklistIds = $assetDetails->pluck('checklist_id')->unique();

        $checklistNames = DB::table('checklists')
            ->whereIn('id', $assetDetails->pluck('checklist_id')->unique())
            ->pluck('name', 'id');

        $categoryByChecklist = DB::table('checklist_items')
            ->join('entity_checklist_item_schedules as ecs', 'ecs.checklist_item_id', '=', 'checklist_items.id')
            ->join('schedules as s', 's.id', '=', 'ecs.schedule_id')
            ->whereIn('checklist_items.checklist_id', $checklistIds)
            ->select('checklist_items.checklist_id', 's.category')
            ->groupBy('checklist_items.checklist_id', 's.category')
            ->pluck('category', 'checklist_id'); // [checklist_id => category]

        // attach category to each asset
        $assetDetails = $assetDetails->map(function ($asset) use ($categoryByChecklist) {
            $asset->schedule_category = $categoryByChecklist[$asset->checklist_id] ?? 'other';
            return $asset;
        });

        $summary = $assetDetails
            ->groupBy('schedule_category')
            ->map(function ($assets, $scheduleName) use ($checklistNames) {
                $byChecklist = $assets->groupBy('checklist_id')->map(function ($checklistAssets, $checklistId) use ($checklistNames) {
                    return [
                        'checklist_id'        => $checklistId,
                        'checklist_name' => $checklistNames[$checklistId] ?? 'Unknown',
                        'total_assets'        => $checklistAssets->count(),
                        'assets_complete'     => $checklistAssets->filter(fn($a) => $a->due_items == 0 && $a->done_items > 0)->values(),
                        'assets_partial'      => $checklistAssets->filter(fn($a) => $a->due_items > 0 && $a->done_items > 0)->values(),
                        'assets_not_started'  => $checklistAssets->filter(fn($a) => $a->due_items > 0 && $a->done_items == 0)->values(),
                        'assets_idle'         => $checklistAssets->filter(fn($a) => $a->due_items == 0 && $a->done_items == 0)->values(),
                        'assets_overdue'      => $checklistAssets->filter(fn($a) => $a->overdue_items > 0)->values(),
                    ];
                })->values();

                return [
                    'schedule_category' => $scheduleName,
                    'total_assets'      => $assets->count(),
                    'checklists'        => $byChecklist,
                ];
            })
            ->values();

        return $summary;
    }

    private function computeRunningHours(array $item): array
    {
        $first = $item['first']->item_status;
        $latest = $item['latest']->item_status;
        $isValid = is_numeric($first) && is_numeric($latest);

        return array_merge($item, [
            'running_hours' => $isValid ? (float)$latest - (float)$first : null,
            'running_hours_invalid' => !$isValid,
        ]);
    }

    public function enrichWithRunningHours(Collection $results, string $slug = 'running_hours'): Collection
    {
        return $results->map(function ($assetItems) use ($slug) {
            return $assetItems->map(function ($item) use ($slug) {
                if ($item['first']->item_slug !== $slug) {
                    return $item;
                }

                return $this->computeRunningHours($item);
            });
        });
    }

    public function index(Request $request)
    {
        $vacuumChecklistId = Checklist::where('slug', 'vacuum_pump')->value('id');
        $airCompressorChecklistId = Checklist::where('slug', 'revised_air_compressor_unit')->value('id');
        $gensetTestRunChecklistId = Checklist::where('slug', 'generator_test_run_monitoring_checklist')->value('id');

        $gensetRunningHoursSlug = 'running_hours_(w/_load)';

        $vaccumRunningHoursName = Checklist::find($vacuumChecklistId)
            ->items()
            ->where('slug', 'running_hours')
            ->value('name');

        $airCompressorRunningHoursName = Checklist::find($airCompressorChecklistId)
            ->items()
            ->where('slug', 'running_hours')
            ->value('name');

        $gensetRunningHoursName = Checklist::find($gensetTestRunChecklistId)
            ->items()
            ->where('slug', $gensetRunningHoursSlug)
            ->value('name');

        $checkItemsResultsRepo = new CheckItemsResultRepository();
        $checklistService = new ChecklistsService();

        $vacuumLatestResults = $checkItemsResultsRepo->getLastAndFirstSinceLastPmByChecklist($vacuumChecklistId);
        $vacuumLatestResults = $this->enrichWithRunningHours($vacuumLatestResults);

        $airCompressorLatestResults = $checkItemsResultsRepo->getLastAndFirstSinceLastPmByChecklist($airCompressorChecklistId);
        $airCompressorLatestResults = $this->enrichWithRunningHours($airCompressorLatestResults);

        $gensetLatestResults = $checkItemsResultsRepo->getLastAndFirstSinceLastPmByChecklist($gensetTestRunChecklistId);
        $gensetLatestResults = $this->enrichWithRunningHours($gensetLatestResults, $gensetRunningHoursSlug);

        $allLatestStatusResults = $checkItemsResultsRepo->getAllStatusResults();
        $assetsOverview = self::getOverallChecklistState();
        $checklistsOverview = (new ChecklistsService())->getAllChecklistsWithDueAssets();

        $unverifiedToday = ChecklistInstance::whereNull('verified_at')->whereDate('created_at', Carbon::today())->count();
        $unverifiedTotal = ChecklistInstance::whereNull('verified_at')->count();

        return Inertia::render('Dashboard', [
            'vacuum_latest_results' => $vacuumLatestResults,
            'air_compressor_latest_result' => $airCompressorLatestResults,
            'genset_latest_result' => $gensetLatestResults,
            'genset_running_hours_name' => $gensetRunningHoursName,
            'vaccum_running_hours_name' => $vaccumRunningHoursName,
            'air_compressor_running_hours_name' => $airCompressorRunningHoursName,
            'vacuum_running_hours_ok' => RunningHours::VACUUM_RUNNING_HOURS_OK,
            'vacuum_running_hours_warning' => RunningHours::VACUUM_RUNNING_HOURS_WARNING,
            'vacuum_running_hours_danger' => RunningHours::VACUUM_RUNNING_HOURS_DANGER,
            'air_compressor_running_hours_ok' => RunningHours::AIR_COMPRESSOR_RUNNING_HOURS_OK,
            'air_compressor_running_hours_warning' => RunningHours::AIR_COMPRESSOR_RUNNING_HOURS_WARNING,
            'air_compressor_running_hours_danger' => RunningHours::AIR_COMPRESSOR_RUNNING_HOURS_DANGER,

            'assets_due' => $assetsOverview,
            'checklists_overview' => $checklistsOverview,
            'unverified_today' => $unverifiedToday,
            'unverified_total' => $unverifiedTotal,

            'all_latest_status_results' => $allLatestStatusResults
        ]);
    }
}
