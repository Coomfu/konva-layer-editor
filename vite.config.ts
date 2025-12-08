import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import checker from 'vite-plugin-checker';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({ svgrOptions: { icon: true }, include: '**/*.svg' }),
    process.env.NODE_ENV === 'development'
      ? checker({
          eslint: {
            lintCommand: 'eslint "./src/**/*.{ts,tsx,js,jsx}"',
          },
          typescript: true,
        })
      : null,
  ],
});
