import { useForm } from "@inertiajs/react";

const Field = ({ label, field, data, setData, errors, type = "number" }) => (
	<div>
		<label className="block text-xs text-base-content mb-1">{label}</label>
		<input
			type={type}
			step="0.01"
			value={data[field]}
			onChange={(e) => setData(field, e.target.value)}
			className="w-full bg-base-100 border border-gray-700 text-base-content text-sm font-mono rounded px-3 py-2 focus:outline-none focus:border-blue-500"
		/>
		{errors[field] && (
			<p className="text-xs text-red-400 mt-1">{errors[field]}</p>
		)}
	</div>
);

export default function ProfileEditor({ profile = null }) {
	const { data, setData, put, post, processing, isDirty, errors } = useForm({
		name: profile?.name ?? "",
		temp_min: profile?.temp_min ?? "",
		temp_max: profile?.temp_max ?? "",
		rh_min: profile?.rh_min ?? "",
		rh_max: profile?.rh_max ?? "",
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (profile) {
			put(`/threshold-profiles/${profile.id}`);
		} else {
			post(`/threshold-profiles`);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-base-100 border border-base-content rounded-lg p-5 space-y-4"
		>
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-base-content">
					{profile ? profile.name : "New Profile"}
				</h3>
				{isDirty && (
					<span className="text-xs text-yellow-400 font-mono">
						unsaved changes
					</span>
				)}
			</div>

			<div className="grid grid-cols-2 gap-3">
				{!profile && (
					<Field
						label="Profile Name"
						field="name"
						type="text"
						data={data}
						setData={setData}
						errors={errors}
					/>
				)}
				<Field
					label="Temp Min (°C)"
					field="temp_min"
					data={data}
					setData={setData}
					errors={errors}
				/>
				<Field
					label="Temp Max (°C)"
					field="temp_max"
					data={data}
					setData={setData}
					errors={errors}
				/>
				<Field
					label="RH Min (%)"
					field="rh_min"
					data={data}
					setData={setData}
					errors={errors}
				/>
				<Field
					label="RH Max (%)"
					field="rh_max"
					data={data}
					setData={setData}
					errors={errors}
				/>
			</div>

			<button
				type="submit"
				disabled={processing || !isDirty}
				className="w-full py-2 text-sm font-medium rounded btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
			>
				{processing ? "Saving…" : "Save Changes"}
			</button>
		</form>
	);
}
