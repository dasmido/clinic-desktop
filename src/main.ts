import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { initTheme } from './modules/settings';

// Initialize theme from saved preference or system mode
initTheme();

createApp(App).mount('#app');
