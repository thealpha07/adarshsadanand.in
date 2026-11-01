import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  build: {
    // Keep fonts as real files. Vite would otherwise inline the small ones as data: URLs,
    // which the Content-Security-Policy (font-src 'self') blocks. See ADR 0009.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
});
