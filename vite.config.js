import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

function resolveBuildSha() {
  try {
    const fromEnv = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
    if (fromEnv) return fromEnv.slice(0, 7);
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const BUILD_SHA = resolveBuildSha();

export default defineConfig({
  base: './',
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
  },
});
