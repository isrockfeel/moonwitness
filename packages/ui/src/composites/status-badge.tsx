import { ZineBadge } from "../primitives/zine-badge";

export interface StatusBadgeProps {
  /** Status teks yang akan ditampilkan di badge */
  status: string;
  /** Warna teks (CSS custom property name) */
  tone?: string;
  /** Apakah menggunakan background gelap (dark) */
  dark?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#a855f7",
  READY: "#2ea8ff",
  "IN REVIEW": "#ffd21f",
  APPROVED: "#3ddc84",
  PUBLISHED: "#ff2d78",
};

const STATUS_DARK: Record<string, boolean> = {
  DRAFT: false,
  READY: false,
  "IN REVIEW": true,
  APPROVED: true,
  PUBLISHED: false,
};

export function StatusBadge({ status, tone, dark }: StatusBadgeProps) {
  const color = tone ?? STATUS_COLOR[status] ?? "#9ca3af";
  const isDark = dark ?? STATUS_DARK[status] ?? false;
  return (
    <ZineBadge color={color} dark={isDark}>
      {status}
    </ZineBadge>
  );
}
