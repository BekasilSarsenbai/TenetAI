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
