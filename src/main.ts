import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import 'virtual:nuxt-icon-bundle/register';

import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';
import './style.css';

const app = createApp(App);

app.use(ui);
app.use(i18n);
app.use(router);

app.mount('#app');