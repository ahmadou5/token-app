"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AlertLevel = "info" | "success" | "warning" | "error";
export type AlertActionKind = "run_rebalance_now" | "open_portfolio" | "resume_strategy_now";

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

export interface AlertDeliverySettings {
  inApp: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  telegramEnabled: boolean;
  telegramChatId: string;
}

interface AlertCenterContextValue {
  alerts: AppAlert[];
  delivery: AlertDeliverySettings;
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addAlert: (payload: Omit<AppAlert, "id" | "createdAt" | "read">) => void;
  updateDelivery: (next: Partial<AlertDeliverySettings>) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "alert_center_v1";
const DELIVERY_STORAGE_KEY = "alert_delivery_settings_v1";
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
  const [delivery, setDelivery] = useState<AlertDeliverySettings>(() => {
    if (typeof window === "undefined") {
      return {
        inApp: true,
        webhookEnabled: false,
        webhookUrl: "",
        telegramEnabled: false,
        telegramChatId: "",
      };
    }
    try {
      const raw = window.localStorage.getItem(DELIVERY_STORAGE_KEY);
      if (!raw) {
        return {
          inApp: true,
          webhookEnabled: false,
          webhookUrl: "",
          telegramEnabled: false,
          telegramChatId: "",
        };
      }
      const parsed = JSON.parse(raw) as AlertDeliverySettings;
      return {
        inApp: parsed.inApp ?? true,
        webhookEnabled: parsed.webhookEnabled ?? false,
        webhookUrl: parsed.webhookUrl ?? "",
        telegramEnabled: parsed.telegramEnabled ?? false,
        telegramChatId: parsed.telegramChatId ?? "",
      };
    } catch {
      return {
        inApp: true,
        webhookEnabled: false,
        webhookUrl: "",
        telegramEnabled: false,
        telegramChatId: "",
      };
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)));
    } catch {
      // ignore storage failures
    }
  }, [alerts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(delivery));
    } catch {
      // ignore storage failures
    }
  }, [delivery]);

  const addAlert = useCallback((payload: Omit<AppAlert, "id" | "createdAt" | "read">) => {
    const next: AppAlert = {
      id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...payload,
    };
    if (delivery.inApp) {
      setAlerts((prev) => [next, ...prev]);
    }
    void fetch("/api/alerts/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert: next, delivery }),
    }).catch(() => {
      // non-blocking best-effort delivery
    });
  }, [delivery]);

  const updateDelivery = useCallback((next: Partial<AlertDeliverySettings>) => {
    setDelivery((prev) => ({ ...prev, ...next }));
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
      delivery,
      isOpen,
      unreadCount,
      open,
      close,
      toggle,
      addAlert,
      updateDelivery,
      markAllRead,
      clearAll,
    }),
    [alerts, delivery, isOpen, unreadCount, open, close, toggle, addAlert, updateDelivery, markAllRead, clearAll],
  );

  return <AlertCenterContext.Provider value={value}>{children}</AlertCenterContext.Provider>;
}

export function useAlertCenter() {
  const ctx = useContext(AlertCenterContext);
  if (!ctx) throw new Error("useAlertCenter must be used within AlertCenterProvider");
  return ctx;
}
