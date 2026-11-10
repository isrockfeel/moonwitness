"use client";

import type { Era, TimelineEvent } from "@moonwitness/types";
import { EventDetail } from "@moonwitness/ui";

interface EventDetailPanelProps {
  variant: "aside" | "drawer";
  event: TimelineEvent;
  era: Era;
  relatedEvents: TimelineEvent[];
  shareUrl: string;
  onRelated: (id: string) => void;
  onClose?: () => void;
}

export function EventDetailPanel({
  variant,
  event,
  era,
  relatedEvents,
  shareUrl,
  onRelated,
  onClose,
}: EventDetailPanelProps) {
  const detail = (
    <EventDetail
      event={event}
      era={era}
      relatedEvents={relatedEvents}
      shareUrl={shareUrl}
      onRelated={onRelated}
      onClose={onClose}
    />
  );

  if (variant === "aside") {
    return (
      <aside className="hidden xl:block" aria-label="Event detail">
        <div className="sticky top-20 h-[calc(100vh-6rem)]">{detail}</div>
      </aside>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Event detail"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md">{detail}</div>
    </div>
  );
}
