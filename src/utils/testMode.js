// Test mode: activated by ?test=1 in the URL.
// Zero effect on normal gameplay when the query param is absent.
export const isTestMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('test') === '1';

// Global debug hook — updated by each scene on start.
if (typeof window !== 'undefined') {
  window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {
    sceneKey: '',
    isTestMode,
  };
  window.__DADA_DEBUG__.isTestMode = isTestMode;
}
