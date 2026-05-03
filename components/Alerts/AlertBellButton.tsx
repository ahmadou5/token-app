"use client";

import { useAlertCenter } from "@/context/AlertCenterContext";

export function AlertBellButton() {
  const { toggle, unreadCount } = useAlertCenter();

  return (
    <button className="alert-bell" onClick={toggle} aria-label="Open alert center">
      <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
        <path
          d="M10 3a4 4 0 00-4 4v2.3c0 .7-.2 1.4-.6 2L4.5 13c-.3.5 0 1 .6 1h9.8c.6 0 .9-.5.6-1l-.9-1.7c-.4-.6-.6-1.3-.6-2V7a4 4 0 00-4-4z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {unreadCount > 0 && <span className="alert-bell__badge">{Math.min(99, unreadCount)}</span>}
    </button>
  );
}
