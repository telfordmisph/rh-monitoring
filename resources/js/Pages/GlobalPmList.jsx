import BulkErrors from "@/Components/BulkErrors";
import ChangeReviewModal from "@/Components/ChangeReviewModal";
import Pagination from "@/Components/Pagination";
import ReadOnlyColumns from "@/Components/tanStackTable/ReadOnlyColumn";
import TanstackTable from "@/Components/tanStackTable/TanstackTable";
import { useEditableTable } from "@/Hooks/useEditableTable";
import { useMutation } from "@/Hooks/useMutation";
import { router, usePage } from "@inertiajs/react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaSave } from "react-icons/fa";
import SearchInput from "./SearchInput";

const saveChangeIDModal = "save_change_global_pm_modal_id";

const GlobalPmList = () => {
	const {
		globalPms: serverGlobalPms,
		search: serverSearch,
		perPage: serverPerPage,
		totalEntries,
	} = usePage().props;

	const [maxItem, setMaxItem] = useState(serverPerPage || 30);
	const [searchInput, setSearchInput] = useState(serverSearch || "");

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

	const columns = React.useMemo(
		() => [
			ReadOnlyColumns({
				accessorKey: "id",
				header: "ID",
				options: { size: 60, enableHiding: false },
			}),
			{
				accessorKey: "maintenance_name",
				header: () => "Maintenance Name",
				size: 250,
			},
			{
				accessorKey: "maintenance_description",
				header: () => "Description",
				size: 250,
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
		[],
	);

	const {
		table,
		editedRows,
		handleAddNewRow,
		handleResetChanges,
		getChanges,
		changes,
	} = useEditableTable(serverGlobalPms.data || [], columns, {
		isMultipleSelection: false,
	});

	const refresh = () => {
		router.reload();
	};

	const saveChanges = async () => {
		try {
			await mutate(route("api.global-pm.bulkUpdate"), {
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

	const handleSaveClick = () => {
		const computtedChanges = getChanges();
		if (computtedChanges.length === 0) {
			alert("No changes to save.");
			return;
		}
		console.log("🚀 ~ handleSaveClick ~ changes:", changes);
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
		page;
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
						Add New Global PM
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

					<SearchInput
						placeholder="search by name"
						initialSearchInput={searchInput}
						onSearchChange={setSearchInput}
					/>
				</div>

				<div className="px-2 w-full">
					{<BulkErrors errors={mutateErrorData?.data || []} />}
				</div>

				<Pagination
					links={serverGlobalPms?.links}
					currentPage={serverGlobalPms?.current_page}
					goToPage={goToPage}
					filteredTotal={serverGlobalPms?.total}
					overallTotal={totalEntries}
					start={serverGlobalPms?.from}
					end={serverGlobalPms?.to}
				/>

				<TanstackTable table={table} />

				<ChangeReviewModal
					modalID={saveChangeIDModal}
					changes={changes}
					onClose={() => document.getElementById(saveChangeIDModal).close()}
					onSave={saveChanges}
					isLoading={isMutateLoading}
				/>
			</div>
		</div>
	);
};

export default GlobalPmList;
