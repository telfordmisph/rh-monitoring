<?php

namespace App\Services;

use Carbon\Carbon;

class PmScheduleCalculatorService
{
  /**
   * Compute next due date from a base date using schedule fields.
   * Returns null for hour-based schedules.
   */
  public static function computeNextDueDate(Carbon $from, object $schedule): ?Carbon
  {
    $unit  = strtolower($schedule->interval_unit ?? '');
    $value = (int) ($schedule->interval_value ?? 1);

    // Hour-based: not trackable as a date — return null
    if ($unit === 'hour') {
      return null;
    }

    $base = $from->copy()->addDay(); // start searching from the day after done

    // "Every Nth of the month" — days_of_month can have multiple values e.g. [10, 20]
    if ($unit === 'month' && !empty($schedule->days_of_month)) {
      $days = is_array($schedule->days_of_month)
        ? $schedule->days_of_month
        : json_decode($schedule->days_of_month, true);

      sort($days); // ascending so we find the earliest next occurrence first

      // Check if any target day still falls later in the current month
      foreach ($days as $targetDay) {
        $candidate = $base->copy()->day((int) $targetDay);
        if ($candidate->gte($base) && $candidate->month === $base->month) {
          return $candidate;
        }
      }

      // No hit this month — move forward by interval and use the first day in the list
      return $base->copy()->addMonths($value)->startOfMonth()->day((int) $days[0]);
    }

    // "First Monday of every month" — nth_weekday + weekday_of_month
    if ($unit === 'month' && !is_null($schedule->nth_weekday) && !is_null($schedule->weekday_of_month)) {
      $nth     = (int) $schedule->nth_weekday;
      $weekday = (int) $schedule->weekday_of_month; // ISO: 1=Mon...7=Sun

      $candidate = self::nthWeekdayOfMonth($base->copy()->startOfMonth(), $nth, $weekday);

      if ($candidate->lte($from)) {
        $candidate = self::nthWeekdayOfMonth($base->copy()->addMonths($value)->startOfMonth(), $nth, $weekday);
      }

      return $candidate;
    }

    // "Every Saturday" — days_of_week e.g. [6]
    if ($unit === 'week' && !empty($schedule->days_of_week)) {
      $days          = is_array($schedule->days_of_week)
        ? $schedule->days_of_week
        : json_decode($schedule->days_of_week, true);
      $targetWeekday = (int) $days[0]; // 0=Sun...6=Sat (JS convention assumed)

      return $base->copy()->next($targetWeekday);
    }

    // Simple intervals: day, week, month, year
    return match ($unit) {
      'day'   => $from->copy()->addDays($value),
      'week'  => $from->copy()->addWeeks($value),
      'month' => $from->copy()->addMonths($value),
      'year'  => $from->copy()->addYears($value),
      default => throw new \RuntimeException("Unsupported interval_unit: '{$unit}'."),
    };
  }

  /**
   * Find the Nth occurrence of a weekday in a given month.
   * e.g. 1st Monday, 2nd Friday
   */
  public static function nthWeekdayOfMonth(Carbon $monthStart, int $nth, int $isoDayOfWeek): Carbon
  {
    $candidate = $monthStart->copy()->startOfMonth();

    while ($candidate->dayOfWeekIso !== $isoDayOfWeek) {
      $candidate->addDay();
    }

    return $candidate->addWeeks($nth - 1);
  }
}
