import { router } from "@inertiajs/react";
import { useState } from "react";
import ProfileEditor from "@/Components/ProfileEditor";

export default function ThresholdProfilesIndex({ devices, profiles }) {
	const [assignments, setAssignments] = useState(
		Object.fromEntries(devices.map((d) => [d.id, d.threshold_profile_id])),
	);
	const [saving, setSaving] = useState(null);

	const assignProfile = (device, profileId) => {
		setAssignments((prev) => ({ ...prev, [device.id]: Number(profileId) }));
		setSaving(device.id);
		router.put(
			`/devices/${device.id}/threshold-profile`,
			{ threshold_profile_id: profileId },
			{ onFinish: () => setSaving(null) },
		);
	};

	return (
		<div className="min-h-screen bg-base-200 text-base-content p-8">
			<div className="max-w-5xl mx-auto space-y-10">
				{/* Header */}
				<div className="border-b border-base-content pb-4">
					<p className="text-xs uppercase tracking-widest text-base-content mb-1">
						Configuration
					</p>
					<h1 className="text-2xl font-bold text-base-content">
						Threshold Profiles
					</h1>
				</div>

				{/* Profile Editors */}
				<section>
					<h2 className="text-xs uppercase tracking-widest text-base-content mb-4">
						Profile Values
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{profiles.map((profile) => (
							<ProfileEditor key={profile.id} profile={profile} />
						))}
					</div>
				</section>

				{/* Device Assignments */}
				<section>
					<h2 className="text-xs uppercase tracking-widest text-base-content mb-4">
						Device Assignments
					</h2>
					<div className="rounded-lg border border-base-content overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-base-200 text-base-content text-xs uppercase tracking-wider">
									<th className="text-left px-4 py-3 font-medium">Device</th>
									<th className="text-left px-4 py-3 font-medium">Profile</th>
									<th className="text-left px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-base-content">
								{devices.map((device) => {
									const currentProfile = profiles.find(
										(p) => p.id === assignments[device.id],
									);
									const isSaving = saving === device.id;

									return (
										<tr
											key={device.id}
											className="bg-base-200/50 hover:bg-base-200/50 transition-colors"
										>
											<td className="px-4 py-3">
												<span className="font-mono text-base-content">
													{device.location}
												</span>
											</td>
											<td className="px-4 py-3">
												<select
													value={assignments[device.id]}
													onChange={(e) =>
														assignProfile(device, e.target.value)
													}
													disabled={isSaving}
													className="bg-base-200 border border-base-content text-base-content text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
												>
													{profiles.map((p) => (
														<option key={p.id} value={p.id}>
															{p.name}
														</option>
													))}
												</select>
											</td>
											<td className="px-4 py-3">
												{isSaving ? (
													<span className="text-xs text-yellow-400">
														Saving…
													</span>
												) : (
													<span className="text-xs text-base-content">
														{currentProfile?.name}
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	);
}
