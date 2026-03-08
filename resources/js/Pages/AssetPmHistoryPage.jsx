import { usePage } from "@inertiajs/react";
import React from "react";

const AssetPmHistoryPage = () => {
	const { assetId, nextDueDate, history } = usePage().props;
	console.log("🚀 ~ AssetPmHistoryPage ~ history:", history);
	console.log("🚀 ~ AssetPmHistoryPage ~ nextDueDate:", nextDueDate);
	console.log("🚀 ~ AssetPmHistoryPage ~ assetId:", assetId);

	return <div>AssetPmHistoryPage</div>;
};

export default AssetPmHistoryPage;
