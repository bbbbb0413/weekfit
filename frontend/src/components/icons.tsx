// 기능: 선 아이콘 모음

import type { ReactNode, SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type Props = SVGProps<SVGSVGElement>;

export const HangerIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 8.5a2 2 0 1 0-2-2" />
    <path d="M12 8.5v1.6l8.2 5.6c.9.6.5 2-.6 2H4.4c-1.100 0-1.500-1.400-.6-2L12 10.100" />
  </Icon>
);
export const CalendarIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M8 3v4M16 3v4" />
  </Icon>
);
export const TagIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M3.5 12.500V4.500a1 1 0 0 1 1-1h8l8 8a1.400 1.400 0 0 1 0 2l-6.500 6.500a1.400 1.400 0 0 1-2 0z" />
    <circle cx="8" cy="8" r="1.300" />
  </Icon>
);
export const LayersIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="4" width="11" height="11" rx="2" />
    <rect x="9" y="9" width="11" height="11" rx="2" />
  </Icon>
);
export const PlusIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const CloseIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const CheckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M5 12.500l4.500 4.500L19 7.500" />
  </Icon>
);
export const AlertIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 4l9 15.500H3z" />
    <path d="M12 10v4.500M12 17v.100" />
  </Icon>
);
export const MoreIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </Icon>
);
export const CameraIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <circle cx="12" cy="13.500" r="3.500" />
    <path d="M8.500 7l1.500-2.500h4L15.500 7" />
  </Icon>
);
export const DropIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 3.500c3.500 4.200 5.500 7 5.500 9.800a5.500 5.500 0 0 1-11 0c0-2.800 2-5.600 5.500-9.800z" />
  </Icon>
);
export const SwapIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8h14l-3.500-3.500M20 16H6l3.500 3.500" />
  </Icon>
);
