// Synchronous external script (MV3 CSP-safe) to prevent color-scheme FOUC
try {
  const saved = localStorage.getItem('framewise-color-scheme');
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta && (saved === 'light' || saved === 'dark')) {
    meta.setAttribute('content', saved);
  }
} catch {
  // Storage may be unavailable in restricted contexts; fall back to system preference.
}
