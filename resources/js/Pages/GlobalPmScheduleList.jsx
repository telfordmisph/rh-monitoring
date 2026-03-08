import BulkErrors from "@/Components/BulkErrors";
import ChangeReviewModal from "@/Components/ChangeReviewModal";
import DeleteModal from "@/Components/DeleteModal";
import MultiSelectSearchableDropdown from "@/Components/MultiSelectSearchableDropdown";
import Pagination from "@/Components/Pagination";
import { createClickableCell } from "@/Components/tanStackTable/ClickableCell";
import ReadOnlyColumns from "@/Components/tanStackTable/ReadOnlyColumn";
import TanstackTable from "@/Components/tanStackTable/TanstackTable";
import { useEditableTable } from "@/Hooks/useEditableTable";
import { useFetch } from "@/Hooks/useFetch";
import { useMutation } from "@/Hooks/useMutation";
import { router, usePage } from "@inertiajs/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaSave } from "react-icons/fa";
import { MdOutlineDelete } from "react-icons/md";
import SearchInput from "./SearchInput";

const saveChangeIDModal = "save_change_checklist_item_modal_id";
const scheduleModalID = "schedule-global-pm-schedule-modal";
const globalModalID = "global-pm-schedule-modal";

const GlobalPmScheduleList = () => {
	const {
		globalPmSchedules: serverGlobalPmSchedules,
		search: serverSearch,
		perPage: serverPerPage,
		totalEntries,
	} = usePage().props;

	console.log(
		"🚀 ~ GlobalPmScheduleList ~ serverGlobalPmSchedules:",
		serverGlobalPmSchedules,
	);

	const [maxItem, setMaxItem] = useState(serverPerPage || 30);
	const [searchInput, setSearchInput] = useState(serverSearch || "");
	const [selectedEditItem, setSelectedEditItem] = useState([[]]);
	const [selectedCell, setSelectedCell] = useState(null);
	const [globalPmsSearchInput, setGlobalPmsSearchInput] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => {
			router.reload({
				data: {
					search: searchInput,
					perPage: maxItem,
					page: 1,
				},
				preserveState: true,
				preserveScroll: true,
			});
		}, 700);

		return () => clearTimeout(timer);
	}, [searchInput]);

	const {
		mutate,
		isLoading: isMutateLoading,
		errorMessage: mutateErrorMessage,
		errorData: mutateErrorData,
		cancel: mutateCancel,
	} = useMutation();

	const {
		data: schedules,
		isLoading: isLoadingSchedules,
		errorMessage: errorMessageSchedules,
		errorData: errorDataSchedules,
		cancel: cancelSchedules,
		fetch: fetchSchedules,
	} = useFetch(route("api.schedules.index"), {
		// auto: false,
	});

	const {
		data: globalPm,
		isLoading: isLoadingGlobalPm,
		errorMessage: errorMessageGlobalPm,
		errorData: errorDataGlobalPm,
		cancel: cancelGlobalPm,
		fetch: fetchGlobalPm,
	} = useFetch(route("api.global-pm.index"), {
		// auto: false,
	});

	console.log("🚀 ~ GlobalPmScheduleList ~ globalPm:", globalPm);

	const handleEditedItemClick = React.useCallback((row, value, column) => {
		const rootKey = column?.columnDef?.accessorKey?.split(".")[0];
		setSelectedCell({ rootKey, row, value, column });
		setSelectedEditItem([value]);
	}, []);

	const globalPmCell = React.useMemo(
		() =>
			createClickableCell({
				modalID: globalModalID,
				handleCellClick: handleEditedItemClick,
				formatDisplayValue: ({ row }) =>
					row.original.global_pm?.maintenance_name ?? "",
			}),
		[handleEditedItemClick],
	);

	const scheduleNameCell = React.useMemo(
		() =>
			createClickableCell({
				modalID: scheduleModalID,
				deletable: false,
				handleCellClick: handleEditedItemClick,
				formatDisplayValue: ({ row }) =>
					row.original.schedule?.schedule_name ?? "",
			}),
		[handleEditedItemClick],
	);

	const columns = React.useMemo(
		() => [
			ReadOnlyColumns({
				accessorKey: "id",
				header: "ID",
				options: { size: 60, enableHiding: false },
			}),
			{
				accessorKey: "global_pm_id",
				header: "Global PM Name",
				cell: globalPmCell,
			},
			{
				accessorKey: "schedule_id",
				header: () => "Schedule",
				size: 500,
				cell: scheduleNameCell,
			},
			{
				header: "Audit Info",
				columns: [
					ReadOnlyColumns({
						accessorKey: "modified_by",
						header: "Modified By",
					}),
					ReadOnlyColumns({
						accessorKey: "modified_at",
						header: "Modified At",
						options: { size: 160 },
					}),
				],
			},
		],
		[globalPmCell, scheduleNameCell],
	);

	const {
		table,
		editedRows,
		handleAddNewRow,
		handleResetChanges,
		getChanges,
		changes,
		updateData,
	} = useEditableTable(serverGlobalPmSchedules.data || [], columns, {
		isMultipleSelection: true,
	});

	const handleEditSchedule = (selected) => {
		if (selectedCell === null) return;
		updateData(selectedCell?.row?.index, "schedule_id", selected[0].id);
		updateData(selectedCell?.row?.index, "schedule", selected[0]);

		document.getElementById(scheduleModalID).close();
	};

	const handleEditGlobalPm = (selected) => {
		if (selectedCell === null) return;
		updateData(selectedCell?.row?.index, "global_pm_id", selected[0].id);
		updateData(selectedCell?.row?.index, "global_pm", selected[0]);

		document.getElementById(globalModalID).close();
	};

	const goToPageGlobalPms = (page) => {
		fetchGlobalPm({
			search: globalPmsSearchInput,
			page: page,
			perPage: maxItem,
		});
	};

	const refresh = () => {
		router.reload();
	};

	const handleDelete = async () => {
		try {
			await mutate(route("api.global-pm.schedules.massGenocide"), {
				body: {
					ids: Object.keys(table.getState().rowSelection),
				},
				method: "DELETE",
			});

			refresh();
			deleteModalRef.current.close();
			toast.success("Locations deleted successfully!");
		} catch (error) {
			toast.error(error?.message);
			console.error(error);
		}
	};

	const deleteModalRef = useRef(null);

	const saveChanges = async () => {
		console.log("🚀 ~ saveChanges ~ editedRows:", editedRows);
		try {
			await mutate(route("api.global-pm.schedules.bulkUpdate"), {
				method: "PATCH",
				body: editedRows,
			});
			document.getElementById(saveChangeIDModal).close();

			toast.success("Changes updated successfully!");
			console.log("zzzzzzzz");

			refresh();
		} catch (error) {
			toast.error(error.message);
			console.error(error);
		}
	};

	const handleGlobalPmSearchChange = useCallback((searchValue) => {
		fetchGlobalPm({
			search: searchValue,
			page: 1,
			perPage: maxItem,
		});
		setGlobalPmsSearchInput(searchValue);
	}, []);

	const handleSaveClick = () => {
		const computedChanges = getChanges();
		if (computedChanges.length === 0) {
			alert("No changes to save.");
			return;
		}
		document.getElementById(saveChangeIDModal).showModal();
	};

	const goToPage = (page) => {
		router.reload({
			data: {
				search: searchInput,
				perPage: maxItem,
				page,
			},
			preserveState: true,
			preserveScroll: true,
		});
	};

	const commonEditModalConfig = {
		defaultSelectedOptions: [selectedEditItem],
		controlledSelectedOptions: selectedEditItem,
		returnKey: "original",
		singleSelect: true,
		disableTooltip: true,
		disableClearSelection: true,
		useModal: true,
		disableSelectedContainer: true,
		paginated: true,
	};

	return (
		<div>
			<div className="w-full">
				<div className="flex gap-2 sticky right-0 mb-4">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => handleAddNewRow()}
					>
						<FaPlus className="mr-2" />
						Add New Global PM Schedule
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleSaveClick}
						disabled={Object.keys(editedRows).length === 0}
					>
						<FaSave className="mr-2" />
						Save Changes
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={handleResetChanges}
					>
						Reset
					</button>
					<button
						type="button"
						className="btn btn-error btn-ghost btn-square"
						disabled={Object.keys(table.getState().rowSelection).length === 0}
						onClick={() => deleteModalRef.current.open()}
					>
						<MdOutlineDelete className="w-full h-full" />
					</button>

					<SearchInput
						placeholder="search by global PM name"
						initialSearchInput={searchInput}
						onSearchChange={setSearchInput}
					/>
				</div>

				<div className="px-2 w-full">
					{<BulkErrors errors={mutateErrorData?.data || []} />}
				</div>

				<Pagination
					links={serverGlobalPmSchedules?.links}
					currentPage={serverGlobalPmSchedules?.current_page}
					goToPage={goToPage}
					filteredTotal={serverGlobalPmSchedules?.total}
					overallTotal={totalEntries}
					start={serverGlobalPmSchedules?.from}
					end={serverGlobalPmSchedules?.to}
				/>

				<TanstackTable table={table} />

				<ChangeReviewModal
					modalID={saveChangeIDModal}
					changes={changes}
					onClose={() => document.getElementById(saveChangeIDModal).close()}
					onSave={saveChanges}
					isLoading={isMutateLoading}
				/>

				<DeleteModal
					ref={deleteModalRef}
					id="locationDeleteModal"
					message="Are you sure you want to delete these locations?"
					errorMessage={mutateErrorMessage}
					isLoading={isMutateLoading}
					onDelete={handleDelete}
					onClose={() => deleteModalRef.current?.close()}
				/>
				<MultiSelectSearchableDropdown
					modalId={globalModalID}
					options={
						globalPm?.globalPms?.data?.map((item) => ({
							value: String(item.maintenance_name),
							label: item?.location?.location_name,
							original: item,
						})) || []
					}
					onChange={handleEditGlobalPm}
					onSearchChange={handleGlobalPmSearchChange}
					links={globalPm?.globalPms?.links || null}
					currentPage={globalPm?.globalPms?.current_page || 1}
					goToPage={() => goToPageGlobalPms()}
					itemName="Global PM List"
					isLoading={isLoadingGlobalPm}
					prompt="Select Global PM"
					contentClassName={"h-100"}
					paginated={true}
					{...commonEditModalConfig}
				/>
				<MultiSelectSearchableDropdown
					modalId={scheduleModalID}
					options={
						schedules?.schedules?.map((item) => ({
							value: String(item.schedule_name),
							label: null,
							original: item,
						})) || []
					}
					onChange={handleEditSchedule}
					itemName="Schedule List"
					isLoading={isLoadingSchedules}
					prompt="Select Schedule"
					contentClassName={"h-150"}
					defaultSelectedOptions={[selectedEditItem]}
					controlledSelectedOptions={selectedEditItem}
					{...commonEditModalConfig}
				/>
			</div>
		</div>
	);
};

export default GlobalPmScheduleList;
