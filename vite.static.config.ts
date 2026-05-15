import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/rideshare/",
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "dist/static",
    rollupOptions: {
      input: "index.html",
    },
  },
});
