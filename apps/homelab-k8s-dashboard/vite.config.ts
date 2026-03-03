import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    root: 'src/client',
    plugins: [vue()],
    build: {
      outDir: '../../dist/client',
    },
  });
};
