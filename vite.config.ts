import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./", // relative asset paths so the build works on GitHub Pages
  plugins: [react()],
  server: { port: 3002 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});