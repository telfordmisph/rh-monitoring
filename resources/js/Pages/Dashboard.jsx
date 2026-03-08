import Calendar from "@/Components/Calendar/Calendar";
import RunningHoursGauge from "@/Components/Chart/RunningHoursGauge";
import PieChartWithNeedle from "@/Components/Chart/Speedometer";
import STATUS_CONFIG from "@/Constants/checkItemStatusConfig";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import formatPastDateTimeLabel from "@/Utils/formatPastDateTimeLabel";
import { Head, usePage } from "@inertiajs/react";
import { AlertTitle } from "@mui/material";
import clsx from "clsx";
import React, { useState } from "react";
import { FaCheckCircle, FaMinusCircle, FaTimes } from "react-icons/fa";
import { GrAlert } from "react-icons/gr";
import { TbAlertTriangle } from "react-icons/tb";
import { Tooltip } from "react-tooltip";

const ASSETS_CATEGORIES = [
	{
		key: "assets_complete",
		label: "Complete",
		description: "All due items checked",
		color: "text-emerald-600",
		bg: "bg-emerald-500/2",
		border: "border-emerald-200/50",
		indicator: "bg-emerald-500",
		barColor: "bg-emerald-400",
		icon: <FaCheckCircle className="w-5 h-5" />,
	},
	{
		key: "assets_partial",
		label: "Partial",
		description: "Some items still due",
		color: "text-amber-600",
		bg: "bg-amber-500/2",
		border: "border-amber-200/50",
		indicator: "bg-amber-500",
		barColor: "bg-amber-400",
		icon: <TbAlertTriangle className="w-5 h-5" />,
	},
	{
		key: "assets_not_started",
		label: "Not Started",
		description: "No items checked yet",
		color: "text-red-600",
		bg: "bg-red-500/2",
		border: "border-red-200/50",
		indicator: "bg-red-500",
		barColor: "bg-red-400",
		icon: <FaTimes className="w-5 h-5" />,
	},
	{
		key: "assets_overdue",
		label: "Overdue",
		description: "Due date has passed",
		color: "text-slate-500",
		bg: "bg-slate-500/2",
		border: "border-slate-200/50",
		indicator: "bg-slate-400",
		barColor: "bg-slate-300",
		icon: <FaMinusCircle className="w-5 h-5" />,
	},
];

function StatRow({ statusKey, count }) {
	const config = STATUS_CONFIG[statusKey];
	const Icon = config?.icon;
	if (!config) return null;

	return (
		<div
			className="flex items-center justify-between px-2 py-1.5"
			style={{ borderLeft: `3px solid ${config.color}` }}
		>
			<div className="flex items-center gap-2">
				<span style={{ color: config.color }}>
					{Icon && <Icon size={20} />}
				</span>
				<span className="text-xs font-medium capitalize">{config.label}</span>
			</div>
			<span className="text-lg font-semibold opacity-75 font-mono">
				{count}
			</span>
		</div>
	);
}

// ─── Color tokens (should match your CSS variables) ──────────────────────────
const statusColors = {
	ok: "var(--color-ok)",
	warning: "var(--color-warning)",
	danger: "var(--color-danger)",
	unknown: "var(--color-grey-500)",
};

// ─── Validity helpers ─────────────────────────────────────────────────────────
function parseRunningHours(raw) {
	if (raw === null || raw === undefined || raw === "") return null;
	const n = Number(raw);
	if (isNaN(n)) return null; // only non-numeric strings are invalid
	return n;
}

function SpeedometerCard({
	assetName,
	runningHoursItem,
	powerItem,
	speedometerData = [],
	maxValue,
}) {
	console.log(
		"🚀 xxxxxxxxxxxxxxxxxxxxxx~ SpeedometerCard ~ runningHoursItem:",
		runningHoursItem,
	);
	const latest = runningHoursItem?.latest;
	const lastPmDate = runningHoursItem?.latest?.last_pm_date ?? null;
	const first = runningHoursItem?.first;

	const powerStatus = powerItem?.latest?.item_status || "unknown";
	const powerStatusLastUpdated = powerItem?.latest?.checked_at || null;

	const hours = parseRunningHours(runningHoursItem?.running_hours);
	console.log("🚀 ~ SpeedometerCard ~ hours:", hours);
	const isInvalid = runningHoursItem?.running_hours_invalid;
	console.log("🚀 ~ SpeedometerCard ~ isInvalid:", isInvalid);
	const isNoSchedule = !!latest?.is_no_schedule;
	const isDue = !!latest?.is_due;

	const tooltipId = `tooltip-${assetName.replace(/\s+/g, "-")}`;

	const okUpTo = speedometerData[0]?.value ?? maxValue * 0.6;
	const warningUpTo = okUpTo + (speedometerData[1]?.value ?? maxValue * 0.2);

	const formatChecker = (checkedBy) => {
		if (!checkedBy) return "—";
		const name =
			[checkedBy.FIRSTNAME, checkedBy.LASTNAME].filter(Boolean).join(" ") ||
			"—";
		return `${name} (${checkedBy.JOB_TITLE || "—"})`;
	};

	return (
		<div
			className={clsx("relative transition-all", isNoSchedule && "opacity-60")}
			data-tooltip-id={tooltipId}
		>
			<RunningHoursGauge
				current={isInvalid ? 0 : hours || 0}
				okUpTo={okUpTo}
				warningUpTo={warningUpTo}
				max={maxValue}
				label={assetName}
				powerStatus={powerStatus}
				isDue={isDue}
				isNoSchedule={isNoSchedule}
			/>

			{lastPmDate === null && (
				<div className="flex gap-1 text-xs text-error italic mt-1">
					<GrAlert />↑ No PM on record
				</div>
			)}

			{isInvalid && (
				<p className="text-xs italic opacity-50 mt-1">Invalid running hours</p>
			)}

			<Tooltip id={tooltipId} place="top" className="z-50 max-w-sm">
				<div className="text-xs space-y-1">
					{!!isDue && (
						<p className="text-red-400 font-semibold">
							⚠ Running hours are overdue for update
						</p>
					)}
					{!!isNoSchedule && (
						<p className="text-white italic">
							No maintenance schedule configured
						</p>
					)}
					{lastPmDate === null && (
						<div className="flex gap-1 text-xs text-error italic mt-1">
							<GrAlert /> No PM on record
						</div>
					)}

					<p className="text-sm font-semibold text-white truncate w-full">
						<span>{assetName}</span>
						<span className="text-xs opacity-50">
							{" "}
							@ {latest?.asset_location}
						</span>
					</p>

					<div className="flex gap-1">
						{powerStatus}
						<span className="opacity-50">
							last checked{" "}
							{formatFriendlyDate(powerStatusLastUpdated, true) || "—"}
						</span>
					</div>

					<p className="text-white">max running hours: {maxValue}</p>

					<div className="border-t border-white/20 pt-1 mt-1 space-y-1">
						<p className="font-semibold text-white">
							First check after last PM
						</p>
						<p>
							Hours:{" "}
							<span className="font-bold">{first?.item_status ?? "—"}</span>
						</p>
						<p>
							Checked:{" "}
							{first?.checked_at
								? new Date(first.checked_at).toLocaleString()
								: "—"}
						</p>
						<p>By: {formatChecker(runningHoursItem?.first_checked_by)}</p>
					</div>

					<div className="border-t border-white/20 pt-1 mt-1 space-y-1">
						<p className="font-semibold text-white">Latest check</p>
						<p>
							Hours:{" "}
							<span className="font-bold">{latest?.item_status ?? "—"}</span>
						</p>
						<p>
							Checked:{" "}
							{latest?.checked_at
								? new Date(latest.checked_at).toLocaleString()
								: "—"}
						</p>
						<p>By: {formatChecker(runningHoursItem?.latest_checked_by)}</p>
					</div>
				</div>
			</Tooltip>
		</div>
	);
}

function SpeedometerGroup({
	title,
	entries,
	runningHoursName,
	speedometerData,
	maxValue,
}) {
	console.log("🚀 ~ SpeedometerGroup ~ runningHoursName:", runningHoursName);
	return (
		<section>
			<h2 className="text-base-content text-center border-b border-b-base-content/20 mb-2">
				{title}{" "}
				{entries?.length === 0 && (
					<span className="opacity-50">(no entries)</span>
				)}
			</h2>
			<div className="flex flex-col gap-2">
				{Object.entries(entries).map(([assetName, items]) => {
					console.log("🚀 ~ SpeedometerGroup ~ items:", items);

					return (
						<SpeedometerCard
							key={assetName}
							assetName={assetName}
							runningHoursItem={items[runningHoursName] ?? null}
							powerItem={items["Vacuum Pump"] ?? null}
							speedometerData={speedometerData}
							maxValue={maxValue}
						/>
					);
				})}
			</div>
		</section>
	);
}

// ─── Asset row inside expanded list ──────────────────────────────────────────
function AssetRow({ asset, color, barColor }) {
	const due = parseInt(asset.due_items) || 0;
	const done = parseInt(asset.done_items) || 0;
	const overdue = parseInt(asset.overdue_items) || 0;
	const total = due + done;
	const pct = total > 0 ? Math.round((done / total) * 100) : 0;

	return (
		<div className="flex items-center gap-3 py-2 hover:bg-black/5 transition-colors">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1">
					<span className="text-sm font-semibold text-base-content truncate">
						{asset.code}
					</span>
					{overdue > 0 && (
						<span className="text-[10px] font-light text-red-600 shrink-0">
							{overdue} overdue
						</span>
					)}
				</div>
				<p className="text-xs text-base-content/50 truncate">
					{asset.location_name}
				</p>
			</div>

			<div className="flex flex-col items-center gap-1 shrink-0">
				{total > 0 && (
					<div className="flex items-center gap-1.5">
						<div className="w-16 h-1.5 bg-black/10 overflow-hidden">
							<div
								className={clsx("h-full transition-all", barColor)}
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				)}
				<div className="flex items-end min-w-10">
					<div className={clsx("text-[11px] font-medium tabular-nums", color)}>
						{done}/{total}
					</div>
					<div className="text-[11px] text-base-content/50 w-8 text-right">
						{pct}%
					</div>
				</div>
			</div>
		</div>
	);
}

const STATUS_KEYS = [
	{ key: "assets_complete", label: "Complete", color: "bg-green-500/10" },
	{ key: "assets_partial", label: "Partial", color: "bg-blue-500/10" },
	{
		key: "assets_not_started",
		label: "Not Started",
		color: "bg-yellow-500/10",
	},
	{ key: "assets_idle", label: "Idle", color: "bg-base-content/30/10" },
	{ key: "assets_overdue", label: "Overdue", color: "bg-red-500/10" },
];

function StatusCell({ value, color }) {
	return (
		<td
			className={clsx(
				"text-center font-mono font-semibold",
				value === 0 ? "text-base-content/20" : color,
			)}
		>
			{value}
		</td>
	);
}

function ScheduleCategoryTable({ data = [] }) {
	const [expandedCategory, setExpandedCategory] = useState(null);
	const [expandedChecklist, setExpandedChecklist] = useState(null);

	const toggleCategory = (category) =>
		setExpandedCategory((prev) => (prev === category ? null : category));

	const toggleChecklist = (checklistId) =>
		setExpandedChecklist((prev) => (prev === checklistId ? null : checklistId));

	return (
		<div className="overflow-x-auto">
			<table className="table table-sm w-full">
				<thead>
					<tr className="bg-base-200 text-xs text-base-content/60 uppercase">
						<th className="w-40">Schedule</th>
						<th className="text-center">Total</th>
						<th className="text-center bg-green-500/10">Complete</th>
						<th className="text-center bg-blue-500/10">Partial</th>
						<th className="text-center bg-yellow-500/10">Not Started</th>
						<th className="text-center bg-base-content/10">Idle</th>
						<th className="text-center bg-red-500/10">Overdue</th>
					</tr>
				</thead>
				<tbody>
					{data.map((row) => (
						<React.Fragment key={row.schedule_category}>
							{/* Schedule category row */}
							<tr
								className={clsx(
									"cursor-pointer hover:bg-base-200 transition-colors",
									expandedCategory === row.schedule_category && "bg-base-200",
								)}
								onClick={() => toggleCategory(row.schedule_category)}
							>
								<td className="font-semibold capitalize flex items-center gap-2">
									<ChevronIcon
										rotated={expandedCategory === row.schedule_category}
									/>
									{row.schedule_category ?? "Unscheduled"}
								</td>
								<td className="text-center font-bold">{row.total_assets}</td>
								{STATUS_KEYS.map(({ key, color }) => (
									<StatusCell
										key={key}
										value={row.checklists.reduce(
											(sum, c) => sum + c[key].length,
											0,
										)}
										color={color}
									/>
								))}
							</tr>

							{/* Checklist rows (nested under category) */}
							{expandedCategory === row.schedule_category &&
								row.checklists.map((checklist) => (
									<React.Fragment key={checklist.checklist_id}>
										{/* Checklist row */}
										<tr
											className={clsx(
												"cursor-pointer hover:bg-base-300/50 transition-colors bg-base-200/50",
												expandedChecklist === checklist.checklist_id &&
													"bg-base-300/50",
											)}
											onClick={() => toggleChecklist(checklist.checklist_id)}
										>
											<td className="pl-8 text-sm flex items-center gap-2 text-base-content/70">
												<ChevronIcon
													rotated={expandedChecklist === checklist.checklist_id}
												/>
												{checklist.checklist_name}
											</td>
											<td className="text-center">{checklist.total_assets}</td>
											{STATUS_KEYS.map(({ key, color }) => (
												<StatusCell
													key={key}
													value={checklist[key].length}
													color={color}
												/>
											))}
										</tr>

										{/* Asset badges (nested under checklist) */}
										{expandedChecklist === checklist.checklist_id && (
											<tr>
												<td colSpan={7} className="bg-base-300/30 px-12 py-2">
													{STATUS_KEYS.map(({ key, label, color }) =>
														checklist[key].length > 0 ? (
															<div key={key} className="mb-2 last:mb-0">
																<p
																	className={clsx(
																		"text-xs badge font-semibold mb-1",
																		color,
																	)}
																>
																	{label}
																</p>
																<div className="flex flex-wrap gap-1">
																	{checklist[key].map((asset) => (
																		<span
																			key={asset.id}
																			className="badge badge-sm badge-ghost"
																		>
																			{asset.code}
																		</span>
																	))}
																</div>
															</div>
														) : null,
													)}
												</td>
											</tr>
										)}
									</React.Fragment>
								))}
						</React.Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ChevronIcon({ rotated }) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			className={clsx(
				"w-3 h-3 shrink-0 transition-transform text-base-content/30",
				rotated && "rotate-90",
			)}
		>
			<path
				fillRule="evenodd"
				d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
				clipRule="evenodd"
			/>
		</svg>
	);
}
// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
	const {
		vacuum_latest_results,
		air_compressor_latest_result,
		genset_latest_result,
		vacuum_running_hours_ok,
		assets_due,
		genset_running_hours_name,
		vaccum_running_hours_name,
		air_compressor_running_hours_name,
		unverified_today,
		checklists_overview,
		unverified_total,
		vacuum_running_hours_warning,
		vacuum_running_hours_danger,
		air_compressor_running_hours_ok,
		air_compressor_running_hours_warning,
		air_compressor_running_hours_danger,
		all_latest_status_results,
	} = usePage().props;
	console.log(
		"🚀 ~ Dashboard ~ air_compressor_running_hours_name:",
		air_compressor_running_hours_name,
	);
	console.log(
		"🚀 ~ Dashboard ~ vaccum_running_hours_name:",
		vaccum_running_hours_name,
	);
	console.log(
		"🚀 ~ Dashboard ~ genset_running_hours_name:",
		genset_running_hours_name,
	);
	console.log(
		"🚀 ~ Dashboard ~ all_latest_status_results:",
		all_latest_status_results,
	);
	console.log("🚀 ~ Dashboard ~ checklists_overview:", checklists_overview);
	console.log("🚀 ~ Dashboard ~ assets_due:", assets_due);
	console.log(
		"🚀 ~ Dashboard ~ vacuum_latest_running_hours:",
		vacuum_latest_results,
	);
	console.log(
		"🚀 ~ Dashboard ~ air_compressor_latest_running_hours:",
		air_compressor_latest_result,
	);
	console.log("🚀 ~ Dashboard ~ genset_latest_result:", genset_latest_result);

	const vacuumMax =
		vacuum_running_hours_ok +
		vacuum_running_hours_warning +
		vacuum_running_hours_danger;
	const airCompressorMax =
		air_compressor_running_hours_ok +
		air_compressor_running_hours_warning +
		air_compressor_running_hours_danger;

	const vacuumSpeedometer = [
		{ name: "ok", value: vacuum_running_hours_ok, fill: statusColors.ok },
		{
			name: "warning",
			value: vacuum_running_hours_warning,
			fill: statusColors.warning,
		},
		{
			name: "danger",
			value: vacuum_running_hours_danger,
			fill: statusColors.danger,
		},
	];

	const airCompressorSpeedometer = [
		{
			name: "ok",
			value: air_compressor_running_hours_ok,
			fill: statusColors.ok,
		},
		{
			name: "warning",
			value: air_compressor_running_hours_warning,
			fill: statusColors.warning,
		},
		{
			name: "danger",
			value: air_compressor_running_hours_danger,
			fill: statusColors.danger,
		},
	];

	const gensetSpeedometer = [
		{
			name: "ok",
			value: 0,
			fill: statusColors.unknown,
		},
		{
			name: "warning",
			value: 0,
			fill: statusColors.unknown,
		},
		{
			name: "danger",
			value: 0,
			fill: statusColors.unknown,
		},
	];

	const total = ASSETS_CATEGORIES.reduce(
		(sum, cat) => sum + (assets_due[cat.key]?.length ?? 0),
		0,
	);

	return (
		<>
			<Head title="Dashboard" />

			<h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
			<div className="grid grid-cols-6 space-x-2">
				<div className="col-span-4 flex gap-2">
					<div className="flex-1">
						<div className="border border-base-content/10">
							<div className="flex items-center p-2 gap-2">
								<div className="flex flex-col">
									<h2 className="text-base font-semibold text-base-content">
										Checklist Status
									</h2>
									<span className="text-xs text-base-content/40">
										{total} assets total
									</span>
								</div>
								<div className="flex justify-center">
									<div className="font-bold flex gap-1 items-center text-primary">
										<div className="text-[30px]">{unverified_total}</div>
										<div className="">unverified checklist</div>
									</div>
								</div>
							</div>

							<ScheduleCategoryTable data={assets_due} />
						</div>

						<div className="border mt-2 p-2 border-base-content/10">
							<div className="flex justify-between items-end">
								<h1 className="font-semibold">Asset Status</h1>
								<div className="opacity-50 text-xs">
									Unique assets per status
								</div>
							</div>
							<div className="grid grid-cols-3 gap-1">
								{all_latest_status_results?.map((status, i) => (
									<StatRow
										key={i}
										statusKey={(status?.item_status ?? "").toLowerCase()}
										count={status?.asset_count ?? 0}
									/>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="col-span-2 w-full gap-2">
					<div className="col-span-1 border border-base-content/10 p-2">
						<h1 className="font-semibold text-center">Running Hours</h1>
						<SpeedometerGroup
							title="Vacuum"
							entries={vacuum_latest_results}
							speedometerData={vacuumSpeedometer}
							runningHoursName={vaccum_running_hours_name}
							maxValue={vacuumMax}
						/>
						<SpeedometerGroup
							title="Air Compressor"
							entries={air_compressor_latest_result}
							speedometerData={airCompressorSpeedometer}
							runningHoursName={air_compressor_running_hours_name}
							maxValue={airCompressorMax}
							genset_latest_result
						/>
						<SpeedometerGroup
							title="Genset Compressor"
							entries={genset_latest_result}
							speedometerData={gensetSpeedometer}
							runningHoursName={genset_running_hours_name}
							maxValue={0}
						/>
					</div>
				</div>
			</div>
		</>
	);
}
