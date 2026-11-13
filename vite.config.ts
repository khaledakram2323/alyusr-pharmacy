import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so every asset URL
 * needs the "/<repo>/" prefix. The repo name is read from the `origin` remote, so it can never
 * drift from where `npm run deploy` actually pushes. (A "<user>.github.io" repo is served from "/".)
 */
function githubPagesBase(): string {
  let remote: string;
  try {
    remote = execSync('git remote get-url origin', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    throw new Error('No "origin" git remote found. Add it first:  git remote add origin https://github.com/<user>/<repo>.git');
  }
  const repo = remote.match(/[/:]([^/:]+?)(?:\.git)?\/?$/)?.[1];
  if (!repo) throw new Error(`Could not read the repository name from the origin remote: ${remote}`);
  return /\.github\.io$/i.test(repo) ? '/' : `/${repo}/`;
}

/**
 * GitHub Pages has no SPA fallback: opening or refreshing /admin directly would be a 404.
 * Serving a copy of index.html as 404.html makes Pages hand every unknown path to the app.
 */
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

// `vite build --mode ghpages` (used by `npm run deploy`) builds for GitHub Pages;
// every other command keeps serving from "/" exactly as before.
export default defineConfig(({ mode }) => ({
  base: mode === 'ghpages' ? githubPagesBase() : '/',
  plugins: [react(), tailwindcss(), ...(mode === 'ghpages' ? [spaFallback()] : [])],
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
}));
