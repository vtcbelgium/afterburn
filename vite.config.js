export default {
  base: '/afterburn/',
  // Native ESM keeps the portable Windows preview independent of binary transforms.
  esbuild: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  build: {
    outDir: 'build',
    emptyOutDir: false,
    minify: false,
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks: id => id.includes('node_modules/three') ? 'three' : undefined,
      },
    },
    chunkSizeWarningLimit: 1500,
  },
};
