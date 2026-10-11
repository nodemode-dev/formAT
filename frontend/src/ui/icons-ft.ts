const PATHS: Record<string, string> = {
  mark: '<rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 11.5l5 4.5-5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 21h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
};

export function icon(name: keyof typeof PATHS, size = 16, viewBox = 32): string {
  const body = PATHS[name] ?? '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}
