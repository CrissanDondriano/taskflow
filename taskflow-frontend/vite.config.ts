import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
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
