// Thick inline icons that read at a glance on a small screen. 24×24 grid.

import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const stroke = (props: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

const solid = (props: P) => ({ viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true, ...props });

export const BoltIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M13.8 1.5 3.6 13.6h6.9l-1.6 8.9 10.5-12.6h-7l1.4-8.4Z" />
  </svg>
);

export const TrophyIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const BackIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PencilIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M4 20l1-5L16.5 3.5a2.1 2.1 0 013 3L8 18l-4 2z" />
  </svg>
);

export const MinusIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 3.2, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ShareIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...stroke(p)}>
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
  </svg>
);

export const QrIcon = (p: P) => (
  <svg {...stroke(p)}>
    <rect x="4" y="4" width="6" height="6" rx="1.2" />
    <rect x="14" y="4" width="6" height="6" rx="1.2" />
    <rect x="4" y="14" width="6" height="6" rx="1.2" />
    <path d="M14 14h2.5v2.5H14zM19 14v.01M14 19.5v.01M17.5 19h2.5v-2.5" />
  </svg>
);

export const UsersIcon = (p: P) => (
  <svg {...stroke(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.2 14.8c1.9.7 3 2.4 3.3 5.2" />
  </svg>
);

/** A cog with teeth (the old one, a circle with rays, read as a brightness or sun icon). */
export const GearIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 2.3, ...p })}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

/** A stop square, for ending the round (the flag means "hole done"). */
export const StopIcon = (p: P) => (
  <svg {...stroke(p)}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

export const ListIcon = (p: P) => (
  <svg {...stroke(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17" />
  </svg>
);

export const HelpIcon = (p: P) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.8" />
    <circle cx="12" cy="17.3" r=".6" fill="currentColor" />
  </svg>
);

export const HomeIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5V11Z" />
  </svg>
);

export const ExitIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10" />
  </svg>
);

export const ChevronIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3.2 2" />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  </svg>
);

export const SoundIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const PaletteIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.7 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10" cy="7" r="1" />
    <circle cx="15" cy="7.5" r="1" />
  </svg>
);

export const MoonIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </svg>
);

export const GlassIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 3.5S5.5 10.2 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.2 12 3.5 12 3.5z" />
    <path d="M9 14.5a3 3 0 0 0 2.2 2.9" />
  </svg>
);

export const SpadeIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 2.4, ...p })}>
    <path d="M12 2.8C10.2 5.6 4.5 9 4.5 13.3c0 2.4 1.8 4.1 4 4.1 1.4 0 2.6-.7 3.5-1.7.9 1 2.1 1.7 3.5 1.7 2.2 0 4-1.7 4-4.1C19.5 9 13.8 5.6 12 2.8Z" />
    <path d="M12 15.8c0 2.2-.7 3.9-2 5.2h4c-1.3-1.3-2-3-2-5.2" />
  </svg>
);

export const PersonIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);
