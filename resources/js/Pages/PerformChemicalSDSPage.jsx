import ChemicalSDSForm from "@/Components/ChemicalSDSMonitoringForm";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import { usePage } from "@inertiajs/react";
import React from "react";

const PerformChemicalSDSPage = () => {
	const { chemicals: serverChemicals, latestSDSMonitoringInstance } =
		usePage().props;

	const onSubmit = (data) => {
		console.log(data);
	};

	return (
		<div className="flex w-full h-[calc(100vh-100px)] flex-col gap-4 relative p-1 shadow-lg">
			<div>
				<h1 className="font-bold">Perform Chemical SDS Today</h1>
				<div>
					last monitored by {latestSDSMonitoringInstance?.creator?.FIRSTNAME} at{" "}
					{formatFriendlyDate(latestSDSMonitoringInstance?.created_at, true)}
				</div>
			</div>
			<ChemicalSDSForm
				chemicals={serverChemicals}
				isLoadingChemicals={false}
				onSubmit={onSubmit}
			/>
		</div>
	);
};

export default PerformChemicalSDSPage;
