import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy the correct manifest file based on build mode
function manifestPlugin(browser: 'chrome' | 'firefox') {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const manifestSrc = resolve(__dirname, `manifest-${browser}.json`);
      const manifestDest = resolve(__dirname, `dist/${browser}/manifest.json`);
      
      try {
        mkdirSync(dirname(manifestDest), { recursive: true });
        copyFileSync(manifestSrc, manifestDest);
        console.log(`✓ Copied ${browser} manifest to dist/${browser}/`);
      } catch (error) {
        console.error(`Failed to copy ${browser} manifest:`, error);
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const browser = (mode === 'firefox' ? 'firefox' : 'chrome') as 'chrome' | 'firefox';
  
  return {
    plugins: [react(), manifestPlugin(browser)],
    
    build: {
      outDir: `dist/${browser}`,
      emptyOutDir: true,
      
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          options: resolve(__dirname, 'options.html'),
          background: resolve(__dirname, 'src/background.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'service-worker.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        }
      },
      
      sourcemap: process.env.NODE_ENV === 'development',
    },
    
    server: {
      port: 3000,
      strictPort: true,
    },
  };
});
