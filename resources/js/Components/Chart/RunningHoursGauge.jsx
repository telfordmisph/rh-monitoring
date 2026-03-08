import clsx from "clsx";
import { useMemo } from "react";

function PowerStatusBadge({ status }) {
	const normalized = status?.toLowerCase();
	const isRunning = normalized === "running";
	const isUnknown = normalized === "unknown";
	const isStandby = normalized === "stand by" || normalized === "standby";

	return (
		<div className="flex items-center gap-1">
			<div className="relative flex items-center justify-center">
				{isRunning && (
					<span className="absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75 animate-ping" />
				)}
				<span
					className={clsx("relative inline-flex h-2 w-2 rounded-full", {
						"bg-green-400": isRunning,
						"bg-gray-500": isUnknown,
						"bg-yellow-400": isStandby,
					})}
				/>
			</div>
		</div>
	);
}

function ScheduleBadge({ isNoSchedule, isDue }) {
	if (isNoSchedule) {
		return (
			<span className="inline-flex items-center text-xs bg-base-200 text-base-content/50">
				<span className="text-[10px]">—</span> no schedule
			</span>
		);
	}

	if (isDue) {
		return (
			<span className="inline-flex items-center text-xs text-red-600 animate-pulse">
				<span>⚠</span>
			</span>
		);
	}

	return null;
}

/**
 * RunningHoursGauge
 *
 * @param {number} current       - Current running hours
 * @param {number} okUpTo        - Hours where OK zone ends
 * @param {number} warningUpTo   - Hours where WARNING zone ends (DANGER starts)
 * @param {number} max           - Max hours on the scale
 * @param {string} [label]       - Asset name or label
 */
export default function RunningHoursGauge({
	current,
	okUpTo,
	warningUpTo,
	max,
	label = "Running Hours",
	powerStatus,
	isDue,
	isNoSchedule,
}) {
	const clampedCurrent = Math.min(Math.max(current, 0), max);
	const pct = (v) => `${((v / max) * 100).toFixed(4)}%`;

	const status = useMemo(() => {
		if (current >= warningUpTo) return "danger";
		if (current >= okUpTo) return "warning";
		return "ok";
	}, [current, okUpTo, warningUpTo]);

	const statusConfig = {
		ok: {
			label: "OK",
			color: "#22c55e",
			glow: "rgba(34,197,94,0.45)",
			bg: "rgba(34,197,94,0.08)",
		},
		warning: {
			label: "WARNING",
			color: "#f59e0b",
			glow: "rgba(245,158,11,0.45)",
			bg: "rgba(245,158,11,0.08)",
		},
		danger: {
			label: "DANGER",
			color: "#ef4444",
			glow: "rgba(239,68,68,0.45)",
			bg: "rgba(239,68,68,0.08)",
		},
	};

	const cfg = statusConfig[status];

	return (
		<div
			style={{
				fontFamily: "'DM Mono', monospace",
				// background: cfg.bg,
				// border: `1px solid ${cfg.color}22`,
				// padding: "4px 8px",
				// transition: "border-color 0.4s ease",
			}}
		>
			<div
				className="grid grid-cols-12"
				style={{
					justifyContent: "space-between",
					alignItems: "start",
				}}
			>
				<div className="col-span-9">
					<div
						className="flex justify-between"
						style={{
							fontSize: "11px",
							fontFamily: "'DM Sans', sans-serif",
							color: "var(--color-base-content)",
							opacity: 0.6,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
						}}
					>
						<span className="truncate">{label}</span>
						<span className="flex gap-1">
							<PowerStatusBadge status={powerStatus} />
							<ScheduleBadge isNoSchedule={isNoSchedule} isDue={isDue} />
						</span>
					</div>

					<div className="col-span-6">
						<div
							className="bg-red-500"
							style={{
								position: "relative",
								height: "10px",
								background: "var(--color-base-content, #888)18",
								overflow: "hidden",
							}}
						>
							{/* OK zone */}
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									width: pct(okUpTo),
									height: "100%",
									background: "#22c55e22",
								}}
							/>
							{/* Warning zone */}
							<div
								style={{
									position: "absolute",
									left: pct(okUpTo),
									top: 0,
									width: pct(warningUpTo - okUpTo),
									height: "100%",
									background: "#f59e0b22",
								}}
							/>
							{/* Danger zone */}
							<div
								style={{
									position: "absolute",
									left: pct(warningUpTo),
									top: 0,
									width: pct(max - warningUpTo),
									height: "100%",
									background: "#ef444422",
								}}
							/>

							{/* Filled progress */}
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									width: pct(clampedCurrent),
									height: "100%",
									background: cfg.color,
									boxShadow: `0 0 8px ${cfg.glow}`,
									transition:
										"width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.4s ease",
								}}
							/>

							{/* Zone dividers */}
							{[okUpTo, warningUpTo].map((threshold, i) => (
								<div
									key={i}
									style={{
										position: "absolute",
										left: pct(threshold),
										top: 0,
										width: "2px",
										height: "100%",
										background: "var(--color-base-100, #1a1a1a)",
										opacity: 0.7,
									}}
								/>
							))}
						</div>

						{/* Tick labels */}
						<div
							style={{
								position: "relative",
								height: "12px",
								marginTop: "1px",
								fontSize: "9px",
								color: "var(--color-base-content)",
								opacity: 0.4,
							}}
						>
							{[
								{ val: 0, label: "0" },
								{ val: okUpTo, label: okUpTo.toLocaleString() },
								{ val: warningUpTo, label: warningUpTo.toLocaleString() },
								{ val: max, label: max.toLocaleString() },
							].map(({ val, label: tLabel }) => (
								<span
									key={val}
									style={{
										position: "absolute",
										left: pct(val),
										transform:
											val === 0
												? "none"
												: val === max
													? "translateX(-100%)"
													: "translateX(-50%)",
									}}
								>
									{tLabel}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className="col-span-3 flex flex-col items-end">
					<div
						style={{
							fontSize: "20px",
							fontWeight: 700,
							color: cfg.color,
							lineHeight: 1,
							textShadow: `0 0 12px ${cfg.glow}`,
						}}
					>
						{current.toLocaleString()}
					</div>
					<div
						style={{
							fontSize: "10px",
							opacity: 0.45,
							color: "var(--color-base-content)",
						}}
					>
						{max.toLocaleString()} hrs
					</div>
				</div>
			</div>
		</div>
	);
}
