import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@features': path.resolve(__dirname, './src/features'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@lib': path.resolve(__dirname, './src/lib'),
            '@stores': path.resolve(__dirname, './src/stores'),
        },
    },
    server: {
        port: 5173,
        // Faster HMR (Hot Module Replacement)
        hmr: {
            overlay: true,
        },
        // Watch options for better performance
        watch: {
            // Ignore node_modules except for specific packages
            ignored: ['**/node_modules/**', '**/.git/**'],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        // Optimize build performance
        target: 'esnext',
        minify: 'esbuild', // Faster than terser
        cssMinify: 'esbuild',
        // Reduce chunking complexity for faster builds
        rollupOptions: {
            output: {
                // Simplified chunking - fewer chunks = faster build
                manualChunks: function (id) {
                    // Group large libraries separately
                    if (id.includes('node_modules')) {
                        if (id.includes('mermaid')) {
                            return 'mermaid';
                        }
                        if (id.includes('react-pdf')) {
                            return 'react-pdf';
                        }
                        if (id.includes('@mui') || id.includes('@emotion')) {
                            return 'mui';
                        }
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'react-vendor';
                        }
                        // Group other node_modules together
                        return 'vendor';
                    }
                },
                // Optimize chunk file names
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: function (assetInfo) {
                    if (!assetInfo.name) {
                        return "assets/[name]-[hash][extname]";
                    }
                    var info = assetInfo.name.split('.');
                    var ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return "assets/images/[name]-[hash][extname]";
                    }
                    if (/woff2?|eot|ttf|otf/i.test(ext)) {
                        return "assets/fonts/[name]-[hash][extname]";
                    }
                    return "assets/[ext]/[name]-[hash][extname]";
                },
            },
            // Increase build performance
            maxParallelFileOps: 5,
        },
        // Increase chunk size warning limit (Mermaid and MUI are large)
        chunkSizeWarningLimit: 1000,
        // Optimize source maps for production
        sourcemap: false, // Disable source maps in production for faster builds
        // Enable CSS code splitting
        cssCodeSplit: true,
        // Optimize asset handling
        assetsInlineLimit: 4096, // Inline small assets as base64
        // Report compressed size (faster than reporting uncompressed)
        reportCompressedSize: false,
    },
    // Optimize dependencies pre-bundling for faster dev server startup
    optimizeDeps: {
        // Only pre-bundle the most essential, small dependencies
        // Large libraries like MUI will load on-demand (faster startup)
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'react-router',
            'axios',
            'zustand',
        ],
        // Exclude large libraries - let them load on-demand for faster startup
        exclude: [
            'mermaid',
            'react-pdf',
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
            '@tanstack/react-query',
            'framer-motion',
            'i18next',
            'react-i18next',
        ],
        // Force esbuild to use faster options
        esbuildOptions: {
            target: 'esnext',
            legalComments: 'none',
            treeShaking: true,
        },
        // Don't force re-optimization unless dependencies change
        force: false,
    },
    // Increase build concurrency
    esbuild: {
        target: 'esnext',
        // Faster parsing
        legalComments: 'none',
    },
    // Development-specific optimizations
    logLevel: 'warn', // Reduce log verbosity even more for faster startup
    clearScreen: false, // Don't clear screen on startup (faster)
    // Skip type checking during dev for faster startup (TypeScript errors will show in browser)
    // Uncomment if you want even faster startup (but lose type checking in terminal)
    // esbuild: {
    //   logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // },
});
