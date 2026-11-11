import type { ItemStatus } from "@moonwitness/types";
import { ZineBadge } from "../primitives/zine-badge";

const STATUS_COLOR: Record<ItemStatus, string> = {
  DRAFT: "#a855f7",
  READY: "#2ea8ff",
  "IN REVIEW": "#ffd21f",
  APPROVED: "#3ddc84",
  PUBLISHED: "#ff2d78",
};

const STATUS_DARK: Record<ItemStatus, boolean> = {
  DRAFT: false,
  READY: false,
  "IN REVIEW": true,
  APPROVED: true,
  PUBLISHED: false,
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <ZineBadge color={STATUS_COLOR[status]} dark={STATUS_DARK[status]}>
      {status}
    </ZineBadge>
  );
}
