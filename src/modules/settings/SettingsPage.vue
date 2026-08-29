<script setup lang="ts">
import { useTheme } from './theme.service';
import { t } from '../../i18n';

const { isDark, toggleTheme } = useTheme();

function onSwitchChange(event: Event) {
  const target = event.target as HTMLElement & { checked: boolean };
  if (target.checked !== isDark.value) {
    toggleTheme();
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__header">
      <ui5-title level="H2">{{ t('settings.title') }}</ui5-title>
      <ui5-label class="settings-page__subtitle">{{ t('settings.subtitle') }}</ui5-label>
    </div>

    <div class="settings-page__content">
      <!-- Appearance Card -->
      <ui5-card class="settings-card">
        <ui5-card-header
          :title-text="t('settings.appearance.title')"
          :subtitle-text="t('settings.appearance.subtitle')"
        >
          <ui5-icon name="palette" slot="avatar"></ui5-icon>
        </ui5-card-header>

        <div class="settings-card__body">
          <div class="settings-option">
            <div class="settings-option__info">
              <div class="settings-option__title-row">
                <ui5-icon :name="isDark ? 'palette' : 'light-mode'" class="option-icon"></ui5-icon>
                <span class="settings-option__title">{{ t('settings.appearance.darkMode') }}</span>
                <ui5-tag :color-scheme="isDark ? '1' : '8'" class="status-tag">
                  {{ isDark ? t('settings.appearance.dark') : t('settings.appearance.light') }}
                </ui5-tag>
              </div>
              <p class="settings-option__description">
                {{ t('settings.appearance.darkModeDesc') }}
              </p>
            </div>

            <div class="settings-option__control">
              <ui5-switch
                :checked="isDark"
                text-on="مفعل"
                text-off="معطل"
                @change="onSwitchChange"
              ></ui5-switch>
            </div>
          </div>
        </div>
      </ui5-card>

      <!-- System Information Card -->
      <ui5-card class="settings-card">
        <ui5-card-header
          :title-text="t('settings.general.title')"
        >
          <ui5-icon name="action-settings" slot="avatar"></ui5-icon>
        </ui5-card-header>

        <div class="settings-card__body">
          <div class="settings-info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('settings.general.language') }}</span>
              <span class="info-value">{{ t('settings.general.arabic') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('settings.general.version') }}</span>
              <span class="info-value">{{ t('settings.general.versionValue') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('settings.appearance.activeTheme') }}</span>
              <span class="info-value">{{ isDark ? 'SAP Horizon Dark' : 'SAP Horizon Light' }}</span>
            </div>
          </div>
        </div>
      </ui5-card>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-page__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-page__subtitle {
  opacity: 0.8;
}

.settings-page__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-card {
  width: 100%;
}

.settings-card__body {
  padding: 1.25rem;
}

.settings-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings-option__info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.settings-option__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.option-icon {
  font-size: 1.2rem;
}

.settings-option__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--sapContent_LabelColor, #6a6d70);
}

.status-tag {
  margin-inline-start: 0.5rem;
}

.settings-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.375rem;
  background: var(--sapGroup_ContentBackground, rgba(0, 0, 0, 0.03));
}

.info-label {
  font-size: 0.8rem;
  color: var(--sapContent_LabelColor, #6a6d70);
}

.info-value {
  font-weight: 600;
  font-size: 0.95rem;
}
</style>
