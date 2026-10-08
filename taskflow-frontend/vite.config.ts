import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analysis: writes dist/bundle-stats.html on every build (open:
    // false). Open it in a browser to see the treemap + gzip/brotli sizes.
    visualizer({ filename: 'dist/bundle-stats.html', open: false, gzipSize: true, brotliSize: true }),
  ],
  server: {
    port: 5173,
    // Dev-only same-origin API: /api/* is forwarded to the Laravel app as
    // served by XAMPP Apache (parallel handling, always on with XAMPP).
    // Same origin means no CORS preflight (OPTIONS) round-trip before
    // every authenticated request — roughly halves API latency in dev.
    // (Absolute VITE_API_URL values bypass this proxy.)
    proxy: {
      "/api": {
        target: "http://localhost",
        rewrite: (path) =>
          path.replace(/^\/api/, "/project/taskflow/taskflow-api/public/api"),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into their own cacheable chunks so a
        // small app-code change doesn't force users to re-download React,
        // framer-motion, recharts, etc. Function form: object form matches
        // exact module IDs and silently matched nothing.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return
          const n = id.replace(/\\/g, "/")
          const inPkg = (name: string) => n.includes(`node_modules/${name}/`)
          if (inPkg("react") || inPkg("react-dom") || inPkg("react-router") || inPkg("react-router-dom") || inPkg("@remix-run/router")) return "vendor-react"
          if (inPkg("framer-motion") || inPkg("motion-dom") || inPkg("motion-utils")) return "vendor-motion"
          if (inPkg("recharts") || inPkg("victory-vendor") || n.includes("node_modules/d3-") || inPkg("lodash-es") || inPkg("react-smooth") || inPkg("internmap") || inPkg("delaunator") || inPkg("robust-predicates")) return "vendor-charts"
          if (inPkg("lucide-react")) return "vendor-icons"
        },
      },
    },
  },
})
