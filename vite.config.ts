import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  // Load both VITE_* and server-style variables. This lets Netlify keep the
  // existing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY names while exposing
  // only the public Supabase values to the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || "";

  return {
    plugins: [
      tanstackStart(),
      ...(command === "build" ? [netlify()] : []),
      viteReact(),
      tailwindcss(),
      tsConfigPaths(),
    ],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        supabasePublishableKey,
      ),
    },
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
  };
});
