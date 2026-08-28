// Public API of the dashboard module — other modules must import only from here.
export { default as DashboardPage } from './DashboardPage.vue';
export { dashboardService } from './dashboard.service';
export type { DashboardKpi, UpcomingAppointment } from './dashboard.model';
