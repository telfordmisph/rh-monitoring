<?php

use App\Models\EntityAssetPmSchedule;
use App\Models\PmHistory;
use App\Services\PmScheduleCalculatorService;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Unit tests for PmScheduleCalculatorService::computeNextDueDate()
 *
 * Accesses the private method via Reflection so no DB or Laravel
 * bootstrap is needed — pure logic tests.
 *
 * Run with: php artisan test --filter PmScheduleCalculatorServiceTest
 */
class PmScheduleCalculatorServiceTest extends TestCase
{
    private PmScheduleCalculatorService $service;
    private ReflectionMethod $method;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PmScheduleCalculatorService();
        $this->method  = new ReflectionMethod(PmScheduleCalculatorService::class, 'computeNextDueDate');
        $this->method->setAccessible(true);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function compute(string $from, array $scheduleFields): ?Carbon
    {
        $schedule = (object) array_merge([
            'interval_unit'    => null,
            'interval_value'   => null,
            'days_of_week'     => null,
            'days_of_month'    => null,
            'nth_weekday'      => null,
            'weekday_of_month' => null,
        ], $scheduleFields);

        return $this->method->invoke($this->service, Carbon::parse($from)->startOfDay(), $schedule);
    }

    // =========================================================================
    // HOUR — always null
    // =========================================================================

    public function test_hour_schedule_returns_null(): void
    {
        $result = $this->compute('2024-01-15', ['interval_unit' => 'hour', 'interval_value' => 4000]);
        $this->assertNull($result);
    }

    public function test_hour_schedule_8000_returns_null(): void
    {
        $result = $this->compute('2024-06-01', ['interval_unit' => 'hour', 'interval_value' => 8000]);
        $this->assertNull($result);
    }

    // =========================================================================
    // SIMPLE DAY
    // =========================================================================

    public function test_daily_adds_one_day(): void
    {
        $result = $this->compute('2024-03-10', ['interval_unit' => 'day', 'interval_value' => 1]);
        $this->assertEquals('2024-03-11', $result->toDateString());
    }

    public function test_every_7_days(): void
    {
        $result = $this->compute('2024-03-01', ['interval_unit' => 'day', 'interval_value' => 7]);
        $this->assertEquals('2024-03-08', $result->toDateString());
    }

    public function test_daily_across_month_boundary(): void
    {
        $result = $this->compute('2024-01-31', ['interval_unit' => 'day', 'interval_value' => 1]);
        $this->assertEquals('2024-02-01', $result->toDateString());
    }

    public function test_daily_across_year_boundary(): void
    {
        $result = $this->compute('2024-12-31', ['interval_unit' => 'day', 'interval_value' => 1]);
        $this->assertEquals('2025-01-01', $result->toDateString());
    }

    // =========================================================================
    // SIMPLE WEEK
    // =========================================================================

    public function test_weekly_adds_one_week(): void
    {
        $result = $this->compute('2024-03-01', ['interval_unit' => 'week', 'interval_value' => 1]);
        $this->assertEquals('2024-03-08', $result->toDateString());
    }

    public function test_weekly_across_month_boundary(): void
    {
        $result = $this->compute('2024-03-29', ['interval_unit' => 'week', 'interval_value' => 1]);
        $this->assertEquals('2024-04-05', $result->toDateString());
    }

    // =========================================================================
    // SIMPLE MONTH
    // =========================================================================

    public function test_monthly_adds_one_month(): void
    {
        $result = $this->compute('2024-01-15', ['interval_unit' => 'month', 'interval_value' => 1]);
        $this->assertEquals('2024-02-15', $result->toDateString());
    }

    public function test_quarterly_adds_3_months(): void
    {
        $result = $this->compute('2024-01-01', ['interval_unit' => 'month', 'interval_value' => 3]);
        $this->assertEquals('2024-04-01', $result->toDateString());
    }

    public function test_semi_annually_adds_6_months(): void
    {
        $result = $this->compute('2024-01-10', ['interval_unit' => 'month', 'interval_value' => 6]);
        $this->assertEquals('2024-07-10', $result->toDateString());
    }

    public function test_monthly_across_year_boundary(): void
    {
        $result = $this->compute('2024-12-15', ['interval_unit' => 'month', 'interval_value' => 1]);
        $this->assertEquals('2025-01-15', $result->toDateString());
    }

    // =========================================================================
    // SIMPLE YEAR
    // =========================================================================

    public function test_annually_adds_one_year(): void
    {
        $result = $this->compute('2024-06-15', ['interval_unit' => 'year', 'interval_value' => 1]);
        $this->assertEquals('2025-06-15', $result->toDateString());
    }

    public function test_every_3_years(): void
    {
        $result = $this->compute('2024-01-01', ['interval_unit' => 'year', 'interval_value' => 3]);
        $this->assertEquals('2027-01-01', $result->toDateString());
    }

    public function test_every_5_years(): void
    {
        $result = $this->compute('2020-03-15', ['interval_unit' => 'year', 'interval_value' => 5]);
        $this->assertEquals('2025-03-15', $result->toDateString());
    }

    // =========================================================================
    // DAYS OF MONTH — single day
    // =========================================================================

    public function test_every_14th_done_before_14th_returns_14th_same_month(): void
    {
        // Done on March 5, next should be March 14
        $result = $this->compute('2024-03-05', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [14],
        ]);
        $this->assertEquals('2024-03-14', $result->toDateString());
    }

    public function test_every_14th_done_on_14th_returns_14th_next_month(): void
    {
        // Done ON the 14th — next is next month's 14th
        $result = $this->compute('2024-03-14', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [14],
        ]);
        $this->assertEquals('2024-04-14', $result->toDateString());
    }

    public function test_every_14th_done_after_14th_returns_14th_next_month(): void
    {
        // Done on March 20, next should be April 14
        $result = $this->compute('2024-03-20', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [14],
        ]);
        $this->assertEquals('2024-04-14', $result->toDateString());
    }

    public function test_every_29th_returns_29th_next_month(): void
    {
        $result = $this->compute('2024-03-29', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [29],
        ]);
        $this->assertEquals('2024-04-29', $result->toDateString());
    }

    // =========================================================================
    // DAYS OF MONTH — multiple days
    // =========================================================================

    public function test_10th_and_20th_done_before_10th_returns_10th(): void
    {
        // Done March 5 → next is March 10
        $result = $this->compute('2024-03-05', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [10, 20],
        ]);
        $this->assertEquals('2024-03-10', $result->toDateString());
    }

    public function test_10th_and_20th_done_on_10th_returns_20th(): void
    {
        // Done ON March 10 → next is March 20
        $result = $this->compute('2024-03-10', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [10, 20],
        ]);
        $this->assertEquals('2024-03-20', $result->toDateString());
    }

    public function test_10th_and_20th_done_between_returns_20th(): void
    {
        // Done March 15 → next is March 20
        $result = $this->compute('2024-03-15', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [10, 20],
        ]);
        $this->assertEquals('2024-03-20', $result->toDateString());
    }

    public function test_10th_and_20th_done_after_20th_returns_10th_next_month(): void
    {
        // Done March 25 → no more days this month → April 10
        $result = $this->compute('2024-03-25', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [10, 20],
        ]);
        $this->assertEquals('2024-04-10', $result->toDateString());
    }

    public function test_multiple_days_unsorted_input_still_works(): void
    {
        // Array given in wrong order — should still find March 10 first
        $result = $this->compute('2024-03-05', [
            'interval_unit'  => 'month',
            'interval_value' => 1,
            'days_of_month'  => [20, 10], // unsorted
        ]);
        $this->assertEquals('2024-03-10', $result->toDateString());
    }

    public function test_days_of_month_with_interval_value_2_jumps_2_months(): void
    {
        // Done March 25, interval=2 → skip April entirely → May 10
        $result = $this->compute('2024-03-25', [
            'interval_unit'  => 'month',
            'interval_value' => 2,
            'days_of_month'  => [10],
        ]);
        $this->assertEquals('2024-05-10', $result->toDateString());
    }

    // =========================================================================
    // DAYS OF WEEK — e.g. every Saturday [6]
    // =========================================================================

    public function test_weekly_saturday_returns_next_saturday(): void
    {
        // March 5 2024 is a Tuesday → next Saturday is March 9
        $result = $this->compute('2024-03-05', [
            'interval_unit'  => 'week',
            'interval_value' => 1,
            'days_of_week'   => [6], // Saturday (JS: 0=Sun...6=Sat)
        ]);
        $this->assertEquals('2024-03-09', $result->toDateString());
    }

    public function test_weekly_saturday_done_on_saturday_returns_next_saturday(): void
    {
        // March 9 2024 is a Saturday → next Saturday is March 16
        $result = $this->compute('2024-03-09', [
            'interval_unit'  => 'week',
            'interval_value' => 1,
            'days_of_week'   => [6],
        ]);
        $this->assertEquals('2024-03-16', $result->toDateString());
    }

    public function test_weekly_monday_returns_next_monday(): void
    {
        // March 5 2024 is a Tuesday → next Monday is March 11
        $result = $this->compute('2024-03-05', [
            'interval_unit'  => 'week',
            'interval_value' => 1,
            'days_of_week'   => [1], // Monday (JS: 1=Mon)
        ]);
        $this->assertEquals('2024-03-11', $result->toDateString());
    }

    // =========================================================================
    // NTH WEEKDAY OF MONTH — e.g. first Monday [ID 12]
    // =========================================================================

    public function test_first_monday_of_month_done_before_first_monday(): void
    {
        // March 2024: first Monday is March 4. Done on March 1 → next is March 4
        $result = $this->compute('2024-03-01', [
            'interval_unit'    => 'month',
            'interval_value'   => 1,
            'nth_weekday'      => 1,
            'weekday_of_month' => 1, // ISO Monday
        ]);
        $this->assertEquals('2024-03-04', $result->toDateString());
    }

    public function test_first_monday_of_month_done_on_first_monday_returns_next_month(): void
    {
        // Done on March 4 (first Monday) → next is April's first Monday = April 1
        $result = $this->compute('2024-03-04', [
            'interval_unit'    => 'month',
            'interval_value'   => 1,
            'nth_weekday'      => 1,
            'weekday_of_month' => 1,
        ]);
        $this->assertEquals('2024-04-01', $result->toDateString());
    }

    public function test_first_monday_of_month_done_after_first_monday_returns_next_month(): void
    {
        // Done March 20 → April's first Monday = April 1
        $result = $this->compute('2024-03-20', [
            'interval_unit'    => 'month',
            'interval_value'   => 1,
            'nth_weekday'      => 1,
            'weekday_of_month' => 1,
        ]);
        $this->assertEquals('2024-04-01', $result->toDateString());
    }

    public function test_second_friday_of_month(): void
    {
        // March 2024: first Friday = March 1, second Friday = March 8
        // Done on Feb 28 → next is March 8
        $result = $this->compute('2024-02-28', [
            'interval_unit'    => 'month',
            'interval_value'   => 1,
            'nth_weekday'      => 2,
            'weekday_of_month' => 5, // ISO Friday
        ]);
        $this->assertEquals('2024-03-08', $result->toDateString());
    }

    public function test_third_wednesday_of_month(): void
    {
        // March 2024: first Wed = March 6, second = March 13, third = March 20
        // Done on March 1 → next is March 20
        $result = $this->compute('2024-03-01', [
            'interval_unit'    => 'month',
            'interval_value'   => 1,
            'nth_weekday'      => 3,
            'weekday_of_month' => 3, // ISO Wednesday
        ]);
        $this->assertEquals('2024-03-20', $result->toDateString());
    }

    // =========================================================================
    // UNSUPPORTED UNIT — should throw
    // =========================================================================

    public function test_unsupported_unit_throws_runtime_exception(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/Unsupported interval_unit/');

        $this->compute('2024-01-01', ['interval_unit' => 'fortnight', 'interval_value' => 1]);
    }
}
