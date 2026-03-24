import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main:       './index.html',
        portal:     './portal.html',
        member:     './member-portal.html',
        staff:      './portal-staff.html',
        management: './portal-management.html',
      },
    },
  },
});
