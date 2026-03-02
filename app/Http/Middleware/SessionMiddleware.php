<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SessionMiddleware
{
  public function handle(Request $request, Closure $next)
  {
    $tokenFromQuery   = $request->query('key');
    $tokenFromSession = session('emp_data.token');
    $tokenFromCookie  = $request->cookie('sso_token');

    $token = $tokenFromQuery ?? $tokenFromSession ?? $tokenFromCookie;

    if (!$token) {
      return $this->redirectToLogin($request);
    }

    $existing = session('emp_data');
    if ($existing && $existing['token'] === $token) {
      if ($tokenFromQuery) {
        $url = $request->url();
        return redirect($url)->withCookie(cookie('sso_token', $token, 60 * 24 * 7));
      }
      return $next($request);
    }

    $currentUser = DB::connection('authify')
      ->table('authify_sessions')
      ->where('token', $token)
      ->first();

    if (!$currentUser) {
      session()->forget('emp_data');
      setcookie('sso_token', '', time() - 3600, '/');
      return $this->redirectToLogin($request);
    }

    Log::info("currentuser" . json_encode($currentUser));

    session(['emp_data' => [
      'token'         => $currentUser->token,
      'emp_id'        => $currentUser->emp_id,
      'emp_name'      => $currentUser->emp_name,
      'emp_firstname' => $currentUser->emp_firstname,
      'emp_jobtitle'  => $currentUser->emp_jobtitle,
      'emp_dept'      => $currentUser->emp_dept,
      'emp_prodline'  => $currentUser->emp_prodline,
      'emp_station'   => $currentUser->emp_station,
      'generated_at'  => $currentUser->generated_at,
    ]]);

    session()->save();

    $cookie = cookie('sso_token', $currentUser->token, 60 * 24 * 7, '/', null, false, true);
    $request->setUserResolver(fn() => (object) session('emp_data'));

    $request->attributes->set('auth_user', $currentUser);
    if ($tokenFromQuery) {
      $url = $request->url();
      $query = $request->query();
      unset($query['key']);
      if (!empty($query)) {
        $url .= '?' . http_build_query($query);
      }
      return redirect($url)->withCookie($cookie);
    }

    return $next($request)->withCookie($cookie);
  }

  private function redirectToLogin(Request $request)
  {
    $redirectUrl = urlencode($request->fullUrl());
    return redirect("http://192.168.1.27:8080/authify/public/login?redirect={$redirectUrl}");
  }
}
