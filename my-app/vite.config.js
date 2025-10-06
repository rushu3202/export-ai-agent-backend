import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow 0.0.0.0
    port: 5173,
    allowedHosts: [
       "0d33b273-78dc-4d46-81b1-a5d306c354e4-00-2wyc61srg18ak.janeway.replit.dev" 
    ],
  },
});
