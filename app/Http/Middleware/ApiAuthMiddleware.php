<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApiAuthMiddleware
{
  protected $sessionTimeOutMessage = 'You are either not logged in, or your session has expired. Please log in again.';

  /**
   * Handle an incoming request.
   *
   * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
   */
  public function handle(Request $request, Closure $next): Response
  {
    $empData = session('emp_data');
    if (!$empData || !isset($empData['token'])) {
      return response()->json(['error' => 'Unauthenticated', 'message' => $this->sessionTimeOutMessage], 401);
    }

    $token = $empData['token'];

    $cacheKey = 'authify_user_' . $token;

    $currentUser = cache()->remember($cacheKey, now()->addMinutes(10), function () use ($token) {
      return DB::connection('authify')
        ->table('authify.authify_sessions')
        ->where('token', $token)
        ->first();
    });

    if (!$currentUser) {
      return response()->json(['error' => 'Unauthenticated', 'message' => $this->sessionTimeOutMessage], 401);
    }

    $role = strtolower(trim($currentUser?->emp_jobtitle));

    // Convert roles keys and permissions to lowercase for comparison

    $request->attributes->set('emp_id', $currentUser->emp_id);
    $request->attributes->set('role', $role);

    return $next($request);
  }
}
