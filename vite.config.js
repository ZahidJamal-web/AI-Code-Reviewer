import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022' 
  },
  esbuild: {
    supported: {
      'top-level-await': true 
    }
  },
  server: {
    port: 5173,
    host: "localhost"
  }
});

