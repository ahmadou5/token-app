"use client";

import { useEffect, useRef } from "react";
import { useAlertCenter } from "@/context/AlertCenterContext";
import { useRebalanceSettings } from "@/context/RebalanceSettingsContext";

export function AlertCenterModal() {
  const { alerts, isOpen, close, markAllRead, clearAll } = useAlertCenter();
  const { settings, update, reset } = useRebalanceSettings();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    markAllRead();
  }, [isOpen, markAllRead]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  function handleAlertAction(kind: "run_rebalance_now" | "open_portfolio") {
    if (kind === "run_rebalance_now") {
      window.dispatchEvent(new CustomEvent("rebalance-run-now"));
      return;
    }
    if (kind === "open_portfolio") {
      window.dispatchEvent(new CustomEvent("open-portfolio-drawer"));
      close();
    }
  }

  return (
    <div
      className="sw-modal-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) close();
      }}
    >
      <div className="sw-modal alert-modal" role="dialog" aria-modal="true" aria-label="Alert Center">
        <div className="sw-modal__header">
          <div className="alert-modal__title-wrap">
            <span className="sw-input-lbl">Alert Center</span>
            <span className="alert-modal__subtitle">Risk, execution, and rebalance events</span>
          </div>
          <button className="sw-modal__close" onClick={close} aria-label="Close alert center">
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="alert-modal__actions">
          <button className="alert-modal__action" onClick={markAllRead}>Mark all read</button>
          <button className="alert-modal__action" onClick={clearAll}>Clear all</button>
        </div>

        <div className="alert-reb">
          <div className="alert-reb__head">
            <span className="sw-input-lbl">Rebalance Controls</span>
            <button className="alert-modal__action" onClick={reset}>Reset</button>
          </div>

          <label className="alert-reb__toggle">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span>Enable automatic rebalance checks</span>
          </label>

          <div className="alert-reb__grid">
            <label>
              <span>Drift Threshold (%)</span>
              <input
                type="number"
                min={1}
                max={40}
                value={settings.driftThresholdPct}
                onChange={(e) =>
                  update({ driftThresholdPct: Number(e.target.value) || 1 })
                }
              />
            </label>
            <label>
              <span>Max Allocation (%)</span>
              <input
                type="number"
                min={5}
                max={100}
                value={settings.maxAllocationPctPerAsset}
                onChange={(e) =>
                  update({ maxAllocationPctPerAsset: Number(e.target.value) || 5 })
                }
              />
            </label>
            <label>
              <span>Check Interval (hours)</span>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.checkIntervalHours}
                onChange={(e) =>
                  update({ checkIntervalHours: Number(e.target.value) || 1 })
                }
              />
            </label>
          </div>
        </div>

        <div className="alert-modal__list">
          {alerts.length === 0 && <p className="alert-modal__empty">No alerts yet.</p>}
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-item alert-item--${alert.level} ${alert.read ? "" : "alert-item--unread"}`}>
              <div className="alert-item__row">
                <strong>{alert.title}</strong>
                <span>{new Date(alert.createdAt).toLocaleString()}</span>
              </div>
              <p>{alert.message}</p>
              {alert.txSignature && (
                <a
                  href={`https://solscan.io/tx/${alert.txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alert-item__link"
                >
                  View tx
                </a>
              )}
              {alert.actions && alert.actions.length > 0 && (
                <div className="alert-item__actions">
                  {alert.actions.map((action) => (
                    <button
                      key={`${alert.id}-${action.kind}`}
                      className="alert-item__action-btn"
                      onClick={() => handleAlertAction(action.kind)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
