export function devLog(...args) {
  if (window.host?.isDev) console.log(...args);
}
