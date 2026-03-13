<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\ThresholdProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ThresholdProfileController extends Controller
{
  public function index()
  {
    return Inertia::render('ThresholdProfiles/Index', [
      'devices'  => Device::with('thresholdProfile')->orderBy('location')->get(),
      'profiles' => ThresholdProfile::all(),
    ]);
  }

  public function assignToDevice(Request $request, Device $device)
  {
    $request->validate([
      'threshold_profile_id' => 'required|exists:threshold_profiles,id',
    ]);

    $device->update(['threshold_profile_id' => $request->threshold_profile_id]);
    Log::info("Device {$device->id} assigned profile {$request->threshold_profile_id}");

    return back();
  }

  public function update(Request $request, ThresholdProfile $profile)
  {
    $request->validate([
      'temp_min' => 'required|numeric',
      'temp_max' => 'required|numeric|gt:temp_min',
      'rh_min'   => 'required|numeric',
      'rh_max'   => 'required|numeric|gt:rh_min',
    ]);

    $profile->update($request->only('temp_min', 'temp_max', 'rh_min', 'rh_max'));

    return back();
  }

  public function store(Request $request)
  {
    $request->validate([
      'name'     => 'required|string|unique:threshold_profiles,name',
      'temp_min' => 'required|numeric',
      'temp_max' => 'required|numeric|gt:temp_min',
      'rh_min'   => 'required|numeric',
      'rh_max'   => 'required|numeric|gt:rh_min',
    ]);

    ThresholdProfile::create($request->only('name', 'temp_min', 'temp_max', 'rh_min', 'rh_max'));

    return back();
  }
}
