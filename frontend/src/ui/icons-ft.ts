const PATHS: Record<string, string> = {
  mark: '<rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 11.5l5 4.5-5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 21h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
};

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

const UI: Record<string, string> = {
  sidebar: `<rect x="3" y="4" width="14" height="12" rx="2.5" ${S}/><path d="M8 4v12" ${S}/>`,
  panelRight: `<rect x="3" y="4" width="14" height="12" rx="2.5" ${S}/><path d="M12 4v12" ${S}/>`,
  search: `<circle cx="9" cy="9" r="5" ${S}/><path d="M13 13l3.5 3.5" ${S}/>`,
  plus: `<path d="M10 4v12M4 10h12" ${S}/>`,
  chat: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3h0A2.5 2.5 0 0 1 4 10.5z" ${S}/>`,
  terminal: `<rect x="3" y="4" width="14" height="12" rx="2.5" ${S}/><path d="M6.5 8l2.5 2-2.5 2M10.5 12.5h3" ${S}/>`,
  projects: `<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3l1.5 1.5h6.5A1.5 1.5 0 0 1 17 8v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" ${S}/>`,
  artifacts: `<circle cx="7" cy="7" r="3" ${S}/><rect x="11" y="4" width="5.5" height="5.5" rx="1" ${S}/><path d="M7 11.5l3.5 5h-7z" ${S}/><path d="M11.5 12h5M11.5 15h5" ${S}/>`,
  clock: `<circle cx="10" cy="10" r="6.5" ${S}/><path d="M10 6.5V10l2.5 1.5" ${S}/>`,
  customize: `<path d="M4 6h7M14 6h2M4 14h2M9 14h7" ${S}/><circle cx="12.5" cy="6" r="1.5" ${S}/><circle cx="7.5" cy="14" r="1.5" ${S}/>`,
  chevronRight: `<path d="M8 5l5 5-5 5" ${S}/>`,
  chevronLeft: `<path d="M12 5l-5 5 5 5" ${S}/>`,
  compress: `<path d="M6 3.5L10 7.5l4-4M6 16.5l4-4 4 4M4 10h12" ${S}/>`,
  chevronDown: `<path d="M5.5 8l4.5 4.5L14.5 8" ${S}/>`,
  more: `<circle cx="5" cy="10" r="1" fill="currentColor"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>`,
  settings: `<circle cx="10" cy="10" r="2.5" ${S}/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.4 1.4M13.6 13.6L15 15M5 15l1.4-1.4M13.6 6.4L15 5" ${S}/>`,
  mic: `<rect x="7.5" y="3" width="5" height="9" rx="2.5" ${S}/><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17" ${S}/>`,
  send: `<path d="M10 15.5V5M5.5 9.5L10 5l4.5 4.5" ${S}/>`,
  stop: `<rect x="6" y="6" width="8" height="8" rx="1.5" fill="currentColor"/>`,
  paperclip: `<path d="M15.5 9.5l-5.8 5.8a3.5 3.5 0 0 1-5-5l6.3-6.3a2.3 2.3 0 0 1 3.3 3.3l-6.2 6.2a1.2 1.2 0 0 1-1.7-1.7l5.6-5.6" ${S}/>`,
  skills: `<path d="M10 3l1.8 4.2L16 9l-4.2 1.8L10 15l-1.8-4.2L4 9l4.2-1.8z" ${S}/>`,
  plug: `<path d="M7.5 3v3.5M12.5 3v3.5M5.5 6.5h9v2.5a4.5 4.5 0 0 1-9 0zM10 13.5V17" ${S}/>`,
  research: `<circle cx="8.5" cy="8.5" r="4.5" ${S}/><path d="M12 12l4 4M6.5 8.5h4M8.5 6.5v4" ${S}/>`,
  check: `<path d="M5 10.5l3.2 3.2L15 7" ${S}/>`,
  close: `<path d="M5.5 5.5l9 9M14.5 5.5l-9 9" ${S}/>`,
  pin: `<path d="M8 3.5h4l-.5 4 2.5 2.5H6l2.5-2.5zM10 10v6.5" ${S}/>`,
  arrowDown: `<path d="M10 4.5V15M5.5 10.5L10 15l4.5-4.5" ${S}/>`,
  shield: `<path d="M10 3l6 2.5v4c0 3.8-2.6 6.4-6 7.5-3.4-1.1-6-3.7-6-7.5v-4z" ${S}/>`,
  file: `<path d="M6 3h5.5L15 6.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" ${S}/><path d="M11 3v4h4" ${S}/>`,
  globe: `<circle cx="10" cy="10" r="6.5" ${S}/><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13" ${S}/>`,
  filter: `<path d="M4 6h12M6.5 10h7M9 14h2" ${S}/>`,
  pencil: `<path d="M12.5 4.5l3 3L8 15H5v-3z" ${S}/>`,
  trash: `<path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" ${S}/>`,
  copy: `<rect x="7" y="7" width="9" height="9" rx="1.5" ${S}/><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" ${S}/>`,
  retry: `<path d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9M15.5 4v3.5H12" ${S}/>`,
  key: `<circle cx="7" cy="12" r="3" ${S}/><path d="M9.2 9.8L16 3M13.5 5.5l2 2M12 7l1.5 1.5" ${S}/>`,
  user: `<circle cx="10" cy="7" r="3" ${S}/><path d="M4.5 16.5a5.5 5.5 0 0 1 11 0" ${S}/>`,
  hide: `<path d="M5 8l5 5 5-5" ${S}/><path d="M4.5 16h11" ${S}/>`,
  palette: `<path d="M10 3a7 7 0 1 0 0 14c1 0 1.5-.7 1.5-1.4 0-1.2-1-1.6-1-2.6 0-.8.7-1.5 1.5-1.5H14a3 3 0 0 0 3-3C17 5.5 14 3 10 3z" ${S}/><circle cx="6.5" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="12.5" cy="6.5" r="1" fill="currentColor"/>`,
  outputs: `<path d="M6 3h5.5L15 6.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" ${S}/><path d="M8 10h4M8 13h4" ${S}/>`,
};

export type UiIcon = keyof typeof UI;

export function ui(name: UiIcon, size = 18): string {
  return `<svg class="ft-ico" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${UI[name] ?? ''}</svg>`;
}

export function icon(name: keyof typeof PATHS, size = 16, viewBox = 32): string {
  const body = PATHS[name] ?? '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}
