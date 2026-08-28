import { createApp } from 'vue';
import App from './App.vue';

// Import UI5 base assets (themes, fonts, etc.)
import "@ui5/webcomponents/dist/Assets.js";

// Import specific UI5 Web Components you plan to use
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Button.js"; 

// Import icons used via the `icon` prop (each icon must be registered explicitly)
import "@ui5/webcomponents-icons/dist/delete.js";

createApp(App).mount('#app');
