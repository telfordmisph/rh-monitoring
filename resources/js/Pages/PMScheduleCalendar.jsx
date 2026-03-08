import Calendar from "@/Components/Calendar/Calendar";
import { VIEWS } from "@/Components/Calendar/calendarViews";
import Modal from "@/Components/Modal";
import { useMutation } from "@/Hooks/useMutation";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import { router, usePage } from "@inertiajs/react";
import clsx from "clsx";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { GrResources } from "react-icons/gr";

function renderEventContent(eventInfo) {
	console.log("🚀 ~ renderEventContent ~ eventInfo:", eventInfo);
	const isOverdue = eventInfo.event.extendedProps.is_overdue;
	const type = eventInfo.event.extendedProps.type;
	const today = new Date().toISOString().split("T")[0];
	const isDueToday =
		eventInfo.event.extendedProps.schedule?.next_due_date === today;
	const typeSymbol = type === "asset" ? "A" : "G";
	const typeStyle = type === "asset" ? "text-orange-500" : "text-blue-500";

	return (
		<div
			className={clsx(
				"flex items-center bg-base-100 gap-1 w-full px-1 py-0.5 cursor-pointer hover:brightness-90 transition-all overflow-hidden",
				{
					"ring-2 ring-red-600": isOverdue,
					"ring-2 ring-yellow-400": isDueToday,
				},
			)}
		>
			<div
				className={clsx(
					"w-1.5 h-1.5 shrink-0",
					isDueToday
						? "bg-yellow-500"
						: isOverdue
							? "bg-red-400"
							: "bg-green-500",
				)}
			/>
			<div className={clsx("font-extrabold", typeStyle)}>{typeSymbol}</div>
			<div className={clsx("text-xs font-semibold text-base-content truncate")}>
				{eventInfo.event.title}
			</div>
		</div>
	);
}

const PMScheduleCalendar = () => {
	const { assetSchedules, globalSchedules } = usePage().props;
	console.log("🚀 ~ PMScheduleCalendar ~ globalSchedules:", globalSchedules);
	console.log("🚀 ~ AssetPMScheduleCalendar ~ assetSchedules:", assetSchedules);
	const [view, setView] = useState("year");
	const [tab, setTab] = useState("scheduled");
	const [selectedSchedule, setSelectedSchedule] = useState(null);
	const [notes, setNotes] = useState("");
	const [doneDate, setDoneDate] = useState(
		() => new Date().toISOString().split("T")[0],
	);

	const recordModalRef = useRef(null);

	const { mutate, isLoading } = useMutation();

	const openModal = (schedule) => {
		console.log("🚀 ~ openModal ~ schedule:", schedule);
		console.log("🚀 ~ openModal ~ schedule:", schedule);
		setSelectedSchedule(schedule);
		setNotes("");
		setDoneDate(new Date().toISOString().split("T")[0]);
		recordModalRef.current?.open();
	};

	const handleRecordDoneDate = async () => {
		if (!selectedSchedule) return;

		const isGlobal = selectedSchedule.type === "global";
		const url = isGlobal
			? route("api.global-pm.schedules.recordDoneDate", {
					globalPmId: selectedSchedule.id,
				})
			: route("api.assets.recordDoneDate", {
					assetId: selectedSchedule.asset_id,
				});

		try {
			await mutate(url, {
				body: { done_date: doneDate, notes },
				method: "POST",
			});
			recordModalRef.current?.close();
			toast.success("PM recorded successfully!");
			router.reload();
		} catch (error) {
			toast.error(error?.message ?? "Something went wrong.");
		}
	};

	const assetsWithDueDate = assetSchedules.filter(
		(s) => s.next_due_date !== null,
	);
	const GlobalPmwithDueDate = globalSchedules.filter(
		(s) => s.next_due_date !== null,
	);

	const neverDone = assetSchedules.filter((s) => s.next_due_date === null);
	const globalNeverDone = globalSchedules.filter(
		(s) => s.next_due_date === null,
	);

	const events = [
		...assetsWithDueDate.map((s) => ({
			id: s.id,
			title: s.asset?.code ?? `Unknown Asset (id: ${s.id})`,
			start: s.next_due_date,
			end: s.next_due_date,
			extendedProps: { schedule: s, type: "asset" },
			is_overdue: s.is_overdue,
		})),
		...GlobalPmwithDueDate.map((s) => ({
			id: `global-${s.id}`,
			title:
				s.global_pm?.maintenance_name ?? `Unknown General PM (id: ${s.id})`,
			start: s.next_due_date,
			end: s.next_due_date,
			extendedProps: { schedule: s, type: "global" },
			is_overdue: s.is_overdue,
		})),
	];

	const neverDoneAll = [
		...neverDone.map((s) => ({ ...s, type: "asset" })),
		...globalNeverDone.map((s) => ({ ...s, type: "global" })),
	];

	const grouped = neverDoneAll.reduce((acc, s) => {
		const key = s.schedule_name ?? "No Schedule";
		if (!acc[key]) acc[key] = [];
		acc[key].push(s);
		return acc;
	}, {});

	return (
		<div className="relative">
			{/* Tabs + View toggle */}
			<div className="sticky top-0 z-20 bg-base-200 flex border-b border-b-base-content/20 items-end justify-between mb-4">
				<div role="tablist" className="tabs tabs-border">
					<a
						role="tab"
						className={`tab ${tab === "scheduled" ? "tab-active text-primary font-extrabold border-primary" : ""}`}
						onClick={() => setTab("scheduled")}
					>
						Scheduled ({assetsWithDueDate.length})
					</a>
					<a
						role="tab"
						className={`tab ${tab === "never-done" ? "tab-active text-primary font-extrabold border-primary" : ""}`}
						onClick={() => setTab("never-done")}
					>
						Never Done ({neverDone.length})
					</a>
				</div>

				{tab === "scheduled" && (
					<div className="flex gap-2">
						{Object.keys(VIEWS).map((key) => (
							<button
								key={key}
								type="button"
								className={`btn btn-sm ${view === key ? "btn-primary" : "btn-ghost"}`}
								onClick={() => setView(key)}
							>
								{key}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Tab content */}
			{tab === "scheduled" ? (
				<Calendar
					view={view}
					events={events}
					onEventClick={(info) =>
						openModal({
							...info.event.extendedProps.schedule,
							type: info.event.extendedProps.type,
						})
					}
					renderEventContent={renderEventContent}
				/>
			) : (
				<div className="flex relative flex-col gap-2 mt-4">
					{Object.entries(grouped).map(([scheduleName, items]) => (
						<div key={scheduleName}>
							<div className="text-md sticky top-7 py-5 z-10 shadow bg-base-200 font-bold uppercase mb-1">
								{scheduleName}
							</div>
							<div className="grid grid-cols-3 gap-2">
								{items.map((s) => {
									const type = s?.type;
									const typeSymbol = type === "asset" ? "A" : "G";
									const typeStyle =
										type === "asset" ? "text-orange-500" : "text-blue-500";

									return (
										<div
											key={`${s.type}-${s.id}`}
											className="flex items-center cursor-pointer hover:bg-base-100"
											onClick={() => openModal(s)}
										>
											<span className={clsx("mr-1 font-extrabold", typeStyle)}>
												{typeSymbol}
											</span>
											{s.type === "asset" ? (
												<span>
													{s.asset.code}{" "}
													<span className="opacity-50">
														@{s.asset?.location?.location_name}
													</span>
												</span>
											) : (
												<span className="font-medium">
													{s.global_pm?.maintenance_name ??
														`Unknown General PM (id: ${s.id})`}{" "}
													<span className="opacity-50">General</span>
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Record Done Date Modal */}
			<Modal
				ref={recordModalRef}
				title="Record PM Done Date"
				onClose={() => setSelectedSchedule(null)}
				className="w-full max-w-2xl"
			>
				{selectedSchedule && (
					<div className="flex flex-col gap-4 mt-3">
						{/* Asset info */}
						<div className="text-sm opacity-60">
							<div className="flex justify-between">
								<div className="flex items-center">
									{selectedSchedule.type === "asset" ? (
										<div className="flex gap-1 items-center font-semibold">
											<GrResources />
											<div>{selectedSchedule.asset?.code}</div>
										</div>
									) : (
										<div className="flex gap-1 items-center font-semibold">
											<div className="opacity-50 px-1">GENERAL</div>
											<div>{selectedSchedule.global_pm?.maintenance_name}</div>
										</div>
									)}
									{selectedSchedule.asset?.location?.location_name && (
										<span className="ml-1">
											@ {selectedSchedule.asset.location.location_name}
										</span>
									)}
									{selectedSchedule?.is_overdue && (
										<span className="ml-1 badge badge-error">OVERDUE</span>
									)}
								</div>
								<div>{selectedSchedule?.schedule_name}</div>
							</div>
							<div className="mt-0.5">
								last performed by {selectedSchedule?.last_performed_by || "-"}{" "}
								at {formatFriendlyDate(selectedSchedule.last_done_date) || "-"}
							</div>
						</div>

						{/* Done date */}
						<div className="flex flex-col gap-1">
							<label className="text-sm font-medium">Done Date</label>
							<input
								type="date"
								className="input input-bordered input-sm w-full"
								value={doneDate}
								max={new Date().toISOString().split("T")[0]}
								onChange={(e) => setDoneDate(e.target.value)}
							/>
						</div>

						{/* Notes */}
						<div className="flex flex-col gap-1">
							<label className="text-sm font-medium">Notes</label>
							<textarea
								className="textarea textarea-bordered w-full resize-none"
								rows={3}
								placeholder="Observations, parts replaced, technician remarks..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						{/* Actions */}
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="btn btn-sm btn-ghost"
								onClick={() => recordModalRef.current?.close()}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-sm btn-primary"
								disabled={!doneDate || isLoading}
								onClick={handleRecordDoneDate}
							>
								{isLoading ? (
									<span className="loading loading-spinner loading-xs" />
								) : (
									"Record"
								)}
							</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default PMScheduleCalendar;
