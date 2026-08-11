import { defineConfig } from "vite";

export default defineConfig({
  /* WICHTIG: relative Basis.
     Der Loading Screen liegt auf dem Webserver fast nie im Wurzelverzeichnis,
     sondern in einem Unterordner wie /loading/. Mit dem Vite-Standard "/"
     wuerden alle Asset-Pfade ins Leere zeigen. */
  base: "./",

  build: {
    outDir: "dist",
    emptyOutDir: true,

    /* Nicht "assets" nennen — public/assets/ wird nach dist/assets/ kopiert,
       das wuerde mit den gebundelten Dateien kollidieren. */
    assetsDir: "bundle",

    /* Konservatives Ziel, damit auch aeltere CEF-Versionen im GMod-Client
       den Code sicher ausfuehren. */
    target: "es2018",

    /* Alles in je eine JS- und CSS-Datei — weniger Requests beim Laden. */
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "bundle/app-[hash].js",
        assetFileNames: "bundle/[name]-[hash][extname]"
      }
    }
  },

  server: {
    port: 5173,
    open: true
  }
});
