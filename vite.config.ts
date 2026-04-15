import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

function resolveManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("react") || id.includes("react-router-dom") || id.includes("zustand")) {
    return "vendor-core";
  }

  if (id.includes("pdf-lib") || id.includes("pdfjs-dist") || id.includes("@pdfsmaller/pdf-encrypt-lite")) {
    return "vendor-pdf";
  }

  if (id.includes("@ffmpeg/ffmpeg") || id.includes("@ffmpeg/util")) {
    return "vendor-media";
  }

  if (id.includes("tesseract.js")) {
    return "vendor-ocr";
  }

  if (id.includes("@imgly/background-removal")) {
    return "vendor-bgremoval";
  }

  if (id.includes("docx") || id.includes("mammoth")) {
    return "vendor-doc";
  }

  if (id.includes("heic2any")) {
    return "vendor-heic";
  }

  if (id.includes("jszip")) {
    return "vendor-zip";
  }

  if (id.includes("qrcode")) {
    return "vendor-qrcode";
  }

  return "vendor-misc";
}

// https://vite.dev/config/
export default defineConfig(() => {
  const shouldAnalyze = process.env.ANALYZE === "true";

  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
  ];

  if (shouldAnalyze) {
    plugins.push(
      visualizer({
        filename: "dist/bundle-analysis.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  };
});
