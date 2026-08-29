<script setup lang="ts">
import { dashboardService } from './dashboard.service';
import type { UpcomingAppointment } from './dashboard.model';
import { t } from '../../i18n';

const { kpis, upcomingAppointments } = dashboardService;

function statusStateClass(status: UpcomingAppointment['status']) {
  switch (status) {
    case 'Confirmed': return 'badge--positive';
    case 'Pending': return 'badge--warning';
    case 'Cancelled': return 'badge--negative';
  }
}

function statusLabel(status: UpcomingAppointment['status']) {
  switch (status) {
    case 'Confirmed': return t('dashboard.status.confirmed');
    case 'Pending': return t('dashboard.status.pending');
    case 'Cancelled': return t('dashboard.status.cancelled');
  }
}

function kpiIconSvg(icon: string) {
  switch (icon) {
    case 'appointment-2':
      return '📅';
    case 'employee':
      return '👨‍⚕️';
    case 'sales-order':
      return '💵';
    default:
      return '📊';
  }
}
</script>

<template>
  <div class="dashboard">
    <h2 class="dashboard__title">{{ t('dashboard.overview') }}</h2>
    <p class="dashboard__date">{{ t('dashboard.date') }}</p>

    <div class="dashboard__kpis">
      <div v-for="kpi in kpis" :key="kpi.key" class="card kpi-card">
        <div class="card__header">
          <span class="kpi-icon">{{ kpiIconSvg(kpi.icon) }}</span>
          <div>
            <h3 class="card__title">{{ kpi.title }}</h3>
            <span class="card__subtitle">{{ kpi.subtitle }}</span>
          </div>
        </div>
        <div class="kpi-value">
          <span class="kpi-number">{{ kpi.value }}</span>
        </div>
      </div>
    </div>

    <div class="card dashboard__appointments">
      <div class="card__header">
        <div>
          <h3 class="card__title">{{ t('dashboard.upcomingAppointments') }}</h3>
          <span class="card__subtitle">{{ t('dashboard.todaysSchedule') }}</span>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('dashboard.columns.patient') }}</th>
              <th>{{ t('dashboard.columns.time') }}</th>
              <th>{{ t('dashboard.columns.doctor') }}</th>
              <th>{{ t('dashboard.columns.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appt in upcomingAppointments" :key="appt.id">
              <td>{{ appt.patient }}</td>
              <td>{{ appt.time }}</td>
              <td>{{ appt.doctor }}</td>
              <td>
                <span class="badge" :class="statusStateClass(appt.status)">
                  {{ statusLabel(appt.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

.dashboard__date {
  margin: 0.25rem 0 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.kpi-card {
  padding: 1.25rem;
}

.kpi-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.kpi-value {
  margin-top: 1rem;
}

.kpi-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.dashboard__appointments {
  width: 100%;
}
</style>
