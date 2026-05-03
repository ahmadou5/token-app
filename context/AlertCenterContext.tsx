"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AlertLevel = "info" | "success" | "warning" | "error";
export type AlertActionKind = "run_rebalance_now" | "open_portfolio";

export interface AlertAction {
  kind: AlertActionKind;
  label: string;
}

export interface AppAlert {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  createdAt: string;
  txSignature?: string;
  actions?: AlertAction[];
  read: boolean;
}

interface AlertCenterContextValue {
  alerts: AppAlert[];
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addAlert: (payload: Omit<AppAlert, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "alert_center_v1";
const AlertCenterContext = createContext<AlertCenterContextValue | null>(null);

export function AlertCenterProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AppAlert[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)));
    } catch {
      // ignore storage failures
    }
  }, [alerts]);

  const addAlert = useCallback((payload: Omit<AppAlert, "id" | "createdAt" | "read">) => {
    const next: AppAlert = {
      id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...payload,
    };
    setAlerts((prev) => [next, ...prev]);
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const clearAll = useCallback(() => setAlerts([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const value = useMemo(
    () => ({
      alerts,
      isOpen,
      unreadCount,
      open,
      close,
      toggle,
      addAlert,
      markAllRead,
      clearAll,
    }),
    [alerts, isOpen, unreadCount, open, close, toggle, addAlert, markAllRead, clearAll],
  );

  return <AlertCenterContext.Provider value={value}>{children}</AlertCenterContext.Provider>;
}

export function useAlertCenter() {
  const ctx = useContext(AlertCenterContext);
  if (!ctx) throw new Error("useAlertCenter must be used within AlertCenterProvider");
  return ctx;
}
