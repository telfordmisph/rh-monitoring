// calendarViews.js
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";

export const VIEWS = {
	month: { plugin: dayGridPlugin, name: "dayGridMonth" },
	year: { plugin: multiMonthPlugin, name: "multiMonthYear" },
	list: { plugin: listPlugin, name: "listYear" },
};
