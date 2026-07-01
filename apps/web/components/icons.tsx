// Inline SVG icons ported from the prototype. Stroke icons inherit currentColor.

type P = { className?: string };
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Plus = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const Puzzle = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M19.44 7.85c-.05.32.06.65.29.88l1.56 1.57c.47.47.71 1.08.71 1.7s-.24 1.23-.71 1.7l-1.61 1.61a.98.98 0 0 1-.84.28c-.47-.07-.8-.48-.96-.93a2.5 2.5 0 1 0-3.22 3.22c.45.16.86.5.93.96a.98.98 0 0 1-.28.84l-1.61 1.61c-.47.47-1.08.7-1.7.7s-1.23-.23-1.7-.7l-1.57-1.57a1.03 1.03 0 0 0-.88-.29c-.49.08-.84.5-1.02.97a2.5 2.5 0 1 1-3.24-3.24c.46-.18.9-.53.97-1.02a1.03 1.03 0 0 0-.29-.88l-1.57-1.57A2.4 2.4 0 0 1 2 12c0-.62.24-1.23.71-1.7L4.23 8.77c.24-.24.58-.35.92-.3.51.08.88.53 1.07 1.01a2.5 2.5 0 1 0 3.26-3.26c-.48-.2-.93-.56-1.01-1.07-.05-.34.06-.68.3-.92l1.52-1.52C10.77 2.24 11.38 2 12 2s1.23.24 1.7.71l1.57 1.57c.23.23.56.34.88.29.49-.08.84-.5 1.02-.97a2.5 2.5 0 1 1 3.24 3.24c-.47.18-.89.53-.97 1.02Z" /></svg>
);
export const Search = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const Mic = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const Upload = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 16V4M8 8l4-4 4 4M5 20h14" /></svg>
);
export const Link = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>
);
export const Doc = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8} {...p}><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2zM8 9h8M8 13h5" /></svg>
);
export const Chevron = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const Mag = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const ExportIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 3v12M8 11l4 4 4-4M5 21h14" /></svg>
);
export const SendIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const Flag = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} {...p}><path d="M6 3v18l6-5 6 5V3z" /></svg>
);
export const PlayTri = (p: P) => (
  <svg viewBox="0 0 12 14" fill="currentColor" {...p}><path d="M0 0l12 7L0 14z" /></svg>
);
export const PauseIcon = (p: P) => (
  <svg viewBox="0 0 12 14" fill="currentColor" {...p}><rect x="1" y="0" width="3.5" height="14" /><rect x="7.5" y="0" width="3.5" height="14" /></svg>
);
export const UserIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const ShieldIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
);
export const CardIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M3 7h18v12H3zM3 11h18M7 15h4" /></svg>
);
export const CalIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
);
export const ClockCircleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></svg>
);
export const SquareIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M5 5h14v14H5zM9 9h6v6H9z" /></svg>
);
