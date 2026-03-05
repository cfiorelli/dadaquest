import { isTestMode } from './testMode.js';

function hasUrlFlag(flag) {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(flag) === '1';
}

export function isDebugMode() {
  if (typeof window === 'undefined') return false;
  return import.meta.env.DEV || hasUrlFlag('debug');
}

export function isShotMode() {
  return hasUrlFlag('shot');
}

export { isTestMode };
