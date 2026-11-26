import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'LayoutLens',
  version: '0.3.0',
  description:
    'Visual website inspection toolkit: inspect box models, Flexbox/Grid layouts, spacing, typography, colors, and export design tokens.',
  icons: {
    '16': 'icons/icon-16.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  action: {
    default_title: 'Toggle LayoutLens Inspector',
    default_icon: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/sidepanel/index.html', 'theme-init.js', 'icons/*', 'assets/*'],
      matches: ['http://*/*', 'https://*/*'],
    },
  ],
  permissions: ['tabs', 'scripting', 'storage'],
  host_permissions: ['http://*/*', 'https://*/*'],
  commands: {
    'toggle-inspector': {
      suggested_key: {
        default: 'Alt+Shift+L',
        mac: 'Alt+Shift+L',
      },
      description: 'Toggle LayoutLens slide-in inspector on the active tab',
    },
  },
});
