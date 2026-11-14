export function devLog(...args) {
  if (typeof window !== 'undefined' && window.host?.isDev) console.log(...args);
}
