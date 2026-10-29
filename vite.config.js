import { defineConfig } from 'vite';

// Inside the Base44 sandbox the dev server is reached through a proxy whose
// Host header is `<port>-<sandbox id>.<sandbox domain>`. Vite already appends
// `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`; the wildcard below is the fallback
// for the rotating sandbox domain. Outside the sandbox nothing is allowed
// beyond Vite's own defaults.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN;

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: previewMode && sandboxDomain ? [`.${sandboxDomain}`] : undefined,
    // Bind mounts on Linux VMs often miss file events; polling keeps the
    // preview in sync with edits.
    watch: { usePolling: previewMode },
  },
});
