import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Uniplan UQ",
    description: "Panel académico personal: agenda, notas, pensum y ruta.",
    action: {},
    permissions: [
      "storage",
      "unlimitedStorage",
      "alarms",
      "notifications",
      "identity",
    ],
    host_permissions: [
      "https://sac.uniquindio.edu.co/*",
      "https://classroom.googleapis.com/*",
    ],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
