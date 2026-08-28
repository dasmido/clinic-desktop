import { createApp } from 'vue';
import App from './App.vue';

// Load Arabic i18n bundles for built-in UI5 component texts (RTL follows the html[dir] attribute)
import { setLanguage } from "@ui5/webcomponents-base/dist/config/Language.js";
setLanguage("ar");

// Import UI5 base assets (themes, fonts, etc.)
import "@ui5/webcomponents/dist/Assets.js";

// Import specific UI5 Web Components you plan to use
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Tag.js";
import "@ui5/webcomponents/dist/Avatar.js";
import "@ui5/webcomponents/dist/Table.js";
import "@ui5/webcomponents/dist/TableHeaderRow.js";
import "@ui5/webcomponents/dist/TableHeaderCell.js";
import "@ui5/webcomponents/dist/TableRow.js";
import "@ui5/webcomponents/dist/TableCell.js";

// Fiori shell components: app header bar and collapsible side navigation
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-fiori/dist/SideNavigation.js";
import "@ui5/webcomponents-fiori/dist/SideNavigationItem.js";

// Import icons used via the `icon` prop (each icon must be registered explicitly)
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/list.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/appointment-2.js";
import "@ui5/webcomponents-icons/dist/sales-order.js";
import "@ui5/webcomponents-icons/dist/cancel.js";

createApp(App).mount('#app');
