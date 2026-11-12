import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Uniplan UQ",
    description: "Panel académico personal: agenda, notas, pensum y ruta.",
    // Public key that pins the extension ID (jfcloohnmcklngifcmgomjflibkjkjdb)
    // for every unpacked install, so all students share one Classroom
    // redirect URI. It is a public key, not a secret.
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAviuR3/eRwIAbOP03N2lOpOCQDtJpMM4jt7Fnstk3IUIRyM17ak/q5T3pj/cIf5ONcRGW83f7i50i41kWKhqrnyITrnQ908FaG4SjG8L/sV/2Sj4RzLVBhIOkV2WsBk41K/+f1pilvmag606Yzp4HiogSy1ihnpATGaMMnRmWYVRxawkUahLe4Hv0w9YVbOv1WKWckzRPi3h7tUy+UW3oD+/iz86YznbltvfhIkCQld6XxjAViuuNTLLPEPV7AObE9mroztbOhQWG5BAqm3202x9f8UQwrr82QZI0KD+gUVu4cqlVwNlGfgol4Pq31h2yxUVIDBgEGTN/97vIp2vQNwIDAQAB",
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
      "https://aulasvirtuales.uniquindio.edu.co/*",
    ],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
