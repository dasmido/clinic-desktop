<script setup lang="ts">
import { dashboardService } from './dashboard.service';
import type { UpcomingAppointment } from './dashboard.model';
import { t } from '../../i18n';

const { kpis, upcomingAppointments } = dashboardService;

function statusState(status: UpcomingAppointment['status']) {
  switch (status) {
    case 'Confirmed': return 'Positive';
    case 'Pending': return 'Critical';
    case 'Cancelled': return 'Negative';
  }
}

function statusLabel(status: UpcomingAppointment['status']) {
  switch (status) {
    case 'Confirmed': return t('dashboard.status.confirmed');
    case 'Pending': return t('dashboard.status.pending');
    case 'Cancelled': return t('dashboard.status.cancelled');
  }
}
</script>

<template>
  <div class="dashboard">
    <ui5-title level="H2">{{ t('dashboard.overview') }}</ui5-title>
    <ui5-label class="dashboard__date">{{ t('dashboard.date') }}</ui5-label>

    <div class="dashboard__kpis">
      <ui5-card v-for="kpi in kpis" :key="kpi.key" class="dashboard__kpi-card">
        <ui5-card-header :title-text="kpi.title" :subtitle-text="kpi.subtitle">
          <ui5-icon slot="avatar" :name="kpi.icon"></ui5-icon>
        </ui5-card-header>
        <div class="dashboard__kpi-value">
          <ui5-title level="H1">{{ kpi.value }}</ui5-title>
          <ui5-tag :design="kpi.state">{{ kpi.subtitle }}</ui5-tag>
        </div>
      </ui5-card>
    </div>

    <ui5-card class="dashboard__appointments">
      <ui5-card-header :title-text="t('dashboard.upcomingAppointments')" :subtitle-text="t('dashboard.todaysSchedule')"></ui5-card-header>
      <ui5-table>
        <ui5-table-header-row slot="headerRow">
          <ui5-table-header-cell>{{ t('dashboard.columns.patient') }}</ui5-table-header-cell>
          <ui5-table-header-cell>{{ t('dashboard.columns.time') }}</ui5-table-header-cell>
          <ui5-table-header-cell>{{ t('dashboard.columns.doctor') }}</ui5-table-header-cell>
          <ui5-table-header-cell>{{ t('dashboard.columns.status') }}</ui5-table-header-cell>
        </ui5-table-header-row>
        <ui5-table-row v-for="appt in upcomingAppointments" :key="appt.id">
          <ui5-table-cell>{{ appt.patient }}</ui5-table-cell>
          <ui5-table-cell>{{ appt.time }}</ui5-table-cell>
          <ui5-table-cell>{{ appt.doctor }}</ui5-table-cell>
          <ui5-table-cell>
            <ui5-tag :design="statusState(appt.status)">{{ statusLabel(appt.status) }}</ui5-tag>
          </ui5-table-cell>
        </ui5-table-row>
      </ui5-table>
    </ui5-card>
  </div>
</template>

<style scoped>
.dashboard__date {
  display: block;
  color: var(--sapContent_LabelColor);
  margin-bottom: 1.5rem;
}

.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.dashboard__kpi-value {
  padding: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.dashboard__appointments {
  width: 100%;
}
</style>
