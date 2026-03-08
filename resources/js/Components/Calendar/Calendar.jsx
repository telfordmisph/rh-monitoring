import FullCalendar from "@fullcalendar/react";
import { VIEWS } from "./calendarViews";

export default function Calendar({
	events,
	view,
	onEventClick,
	renderEventContent,
}) {
	const current = VIEWS[view];

	return (
		<div>
			<FullCalendar
				plugins={[current.plugin]}
				initialView={current.name}
				key={view}
				events={events}
				eventContent={renderEventContent}
				eventClick={onEventClick}
			/>
		</div>
	);
}
