<script setup lang="ts">
import { useTheme } from './theme.service';
import { t } from '../../i18n';

const { isDark, toggleTheme } = useTheme();

function onToggleChange() {
  toggleTheme();
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__header">
      <h2 class="settings-page__title">{{ t('settings.title') }}</h2>
      <p class="settings-page__subtitle">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="settings-page__content">
      <!-- Appearance Card -->
      <div class="card settings-card">
        <div class="card__header">
          <span class="card__icon">🎨</span>
          <div>
            <h3 class="card__title">{{ t('settings.appearance.title') }}</h3>
            <span class="card__subtitle">{{ t('settings.appearance.subtitle') }}</span>
          </div>
        </div>

        <div class="settings-card__body">
          <div class="settings-option">
            <div class="settings-option__info">
              <div class="settings-option__title-row">
                <span class="option-icon">{{ isDark ? '🌙' : '☀️' }}</span>
                <span class="settings-option__title">{{ t('settings.appearance.darkMode') }}</span>
                <span class="badge" :class="isDark ? 'badge--info' : 'badge--neutral'">
                  {{ isDark ? t('settings.appearance.dark') : t('settings.appearance.light') }}
                </span>
              </div>
              <p class="settings-option__description">
                {{ t('settings.appearance.darkModeDesc') }}
              </p>
            </div>

            <div class="settings-option__control">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="isDark"
                  @change="onToggleChange"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- System Information Card -->
      <div class="card settings-card">
        <div class="card__header">
          <span class="card__icon">⚙️</span>
          <div>
            <h3 class="card__title">{{ t('settings.general.title') }}</h3>
          </div>
        </div>

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
              <span class="info-value">{{ isDark ? 'الوضع الداكن (Dark)' : 'الوضع الفاتح (Light)' }}</span>
            </div>
          </div>
        </div>
      </div>
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

.settings-page__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

.settings-page__subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.settings-page__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-card {
  width: 100%;
}

.card__icon {
  font-size: 1.5rem;
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
  color: var(--text-muted);
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
  background: var(--bg-subtle, rgba(0, 0, 0, 0.03));
}

.info-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.info-value {
  font-weight: 600;
  font-size: 0.95rem;
}

/* Custom Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color, #ccc);
  transition: 0.25s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color, #0070f3);
}

input:checked + .toggle-slider:before {
  transform: translateX(22px);
}
</style>
