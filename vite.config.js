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

    /* WICHTIG — nicht erhoehen.
       Der CSS-Minifier fasst Deklarationen zu modernen Kurzformen
       zusammen, wenn das Ziel sie unterstuetzt. Aus
       top/right/bottom/left wird dann wieder 'inset', und genau das
       kennt die CEF-Version im GMod-Client nicht: die Deklaration
       wird verworfen, Hintergrundebenen werden 0x0 gross und das
       Layout faellt zusammen.

       'inset' gibt es ab Chrome 87 — mit chrome69 als Ziel laesst der
       Minifier die Langschreibweise in Ruhe. Ohne diese Zeile ist der
       Fix in der style.css wirkungslos, weil er erst beim Build
       rueckgaengig gemacht wird. */
    cssTarget: "chrome69",

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
