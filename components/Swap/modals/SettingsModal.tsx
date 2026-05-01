"use client";

import { useEffect, useRef, useState } from "react";
import {
  useSwapSettings,
  PROVIDER_META,
  EXECUTION_META,
  PERP_PROVIDER_META,
  EARN_PROVIDER_META,
  type SwapProvider,
  type ExecutionStrategy,
  type PerpProvider,
  type EarnProvider,
} from "@/context/SwapSettingsContext";

interface SettingsModalProps {
  onClose: () => void;
  /** Which tab is active in SpotSwap — controls which settings panel opens first */
  activeTab?: "spot" | "perp" | "earn";
}

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0];

export function SettingsModal({
  onClose,
  activeTab = "spot",
}: SettingsModalProps) {
  const {
    settings,
    setProvider,
    setExecutionStrategy,
    setSlippage,
    setPerpProvider,
    setEarnProvider,
    resetSettings,
  } = useSwapSettings();

  const [panel, setPanel] = useState<"spot" | "perp" | "earn">(activeTab);
  const [customSlip, setCustomSlip] = useState("");
  const [customActive, setCustomActive] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const supportsExecution = PROVIDER_META[settings.provider].supportsExecution;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="sw-modal-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="sw-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="sw-modal__header">
          {/* Panel toggle */}
          <div className="sw-settings-panel-tabs">
            <button
              className={`sw-settings-panel-tab ${panel === "spot" ? "sw-settings-panel-tab--active" : ""}`}
              onClick={() => setPanel("spot")}
            >
              Spot
            </button>
            <button
              className={`sw-settings-panel-tab ${panel === "perp" ? "sw-settings-panel-tab--active" : ""}`}
              onClick={() => setPanel("perp")}
            >
              Perp
            </button>
            <button
              className={`sw-settings-panel-tab ${panel === "earn" ? "sw-settings-panel-tab--active" : ""}`}
              onClick={() => setPanel("earn")}
            >
              Earn
            </button>
          </div>
          <button
            className="sw-modal__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── SPOT PANEL ── */}
        {panel === "spot" && (
          <div className="sw-modal__body">
            {/* Provider */}
            <div className="sw-modal-section">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M7 4v3.5l2 1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Swap Provider
              </div>
              <div className="sw-modal-providers">
                {(Object.keys(PROVIDER_META) as SwapProvider[]).map((p) => {
                  const meta = PROVIDER_META[p];
                  const active = settings.provider === p;
                  return (
                    <button
                      key={p}
                      className={`sw-modal-provider ${active ? "sw-modal-provider--active" : ""}`}
                      onClick={() => setProvider(p)}
                    >
                      <div className="sw-modal-provider__top">
                        <span className="sw-modal-provider__name">
                          {meta.label}
                        </span>
                        {meta.badge && (
                          <span className="sw-modal-provider__badge">
                            {meta.badge}
                          </span>
                        )}
                        {active && (
                          <span className="sw-modal-provider__check">
                            <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              width="11"
                              height="11"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                      <span className="sw-modal-provider__desc">
                        {meta.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Execution Strategy */}
            {supportsExecution && (
              <div className="sw-modal-section">
                <div className="sw-modal-section__label">
                  <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                    <path
                      d="M3 7h8M8 4l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Execution Strategy
                </div>
                <div className="sw-modal-executions">
                  {(Object.keys(EXECUTION_META) as ExecutionStrategy[]).map(
                    (s) => {
                      const meta = EXECUTION_META[s];
                      const active = settings.executionStrategy === s;
                      return (
                        <button
                          key={s}
                          className={`sw-modal-exec ${active ? "sw-modal-exec--active" : ""}`}
                          onClick={() => setExecutionStrategy(s)}
                        >
                          <span className="sw-modal-exec__icon">
                            {meta.icon}
                          </span>
                          <div className="sw-modal-exec__text">
                            <span className="sw-modal-exec__label">
                              {meta.label}
                            </span>
                            <span className="sw-modal-exec__desc">
                              {meta.description}
                            </span>
                          </div>
                          {active && (
                            <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              width="11"
                              height="11"
                              className="sw-modal-exec__check"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* Slippage */}
            <div className="sw-modal-section">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path
                    d="M2 12L12 2M5 2H2v3M12 9v3h-3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Slippage Tolerance
              </div>
              <div className="sw-modal-slippage">
                {SLIPPAGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    className={`sw-slip-pill ${!customActive && settings.slippage === p ? "sw-slip-pill--active" : ""}`}
                    onClick={() => {
                      setCustomActive(false);
                      setCustomSlip("");
                      setSlippage(p);
                    }}
                  >
                    {p}%
                  </button>
                ))}
                <div
                  className={`sw-slip-custom ${customActive ? "sw-slip-custom--active" : ""}`}
                >
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customSlip}
                    min="0.01"
                    max="50"
                    step="0.1"
                    className="sw-slip-input"
                    onFocus={() => setCustomActive(true)}
                    onChange={(e) => {
                      setCustomSlip(e.target.value);
                      const n = parseFloat(e.target.value);
                      if (!isNaN(n) && n > 0 && n <= 50) setSlippage(n);
                    }}
                  />
                  {customActive && <span className="sw-slip-pct">%</span>}
                </div>
              </div>
              {settings.slippage > 2 && (
                <p className="sw-slip-warn">
                  ⚠️ High slippage — you may receive significantly less than
                  expected.
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="sw-modal-summary">
              <div className="sw-modal-summary__chip">
                <span className="sw-modal-summary__dot" />
                {PROVIDER_META[settings.provider].label}
                {PROVIDER_META[settings.provider].badge && (
                  <span className="sw-modal-summary__badge">
                    {PROVIDER_META[settings.provider].badge}
                  </span>
                )}
              </div>
              <div className="sw-modal-summary__chip">
                <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                  <path
                    d="M2 12L12 2M5 2H2v3M12 9v3h-3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {settings.slippage}% slippage
              </div>
            </div>
          </div>
        )}

        {/* ── PERP PANEL ── */}
        {panel === "perp" && (
          <div className="sw-modal__body">
            {/* Perp Provider */}
            <div className="sw-modal-section">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <circle
                    cx="7"
                    cy="7"
                    r="5.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M7 4v3.5l2 1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Perp Protocol
              </div>
              <div className="sw-modal-providers">
                {(Object.keys(PERP_PROVIDER_META) as PerpProvider[]).map(
                  (p) => {
                    const meta = PERP_PROVIDER_META[p];
                    const active = settings.perpProvider === p;
                    return (
                      <button
                        key={p}
                        className={`sw-modal-provider ${active ? "sw-modal-provider--active" : ""}`}
                        onClick={() => setPerpProvider(p)}
                      >
                        <div className="sw-modal-provider__top">
                          <span className="sw-modal-provider__name">
                            {meta.label}
                          </span>
                          {meta.badge && (
                            <span
                              className={`sw-modal-provider__badge ${meta.badge === "New" ? "sw-modal-provider__badge--new" : ""}`}
                            >
                              {meta.badge}
                            </span>
                          )}
                          {active && (
                            <span className="sw-modal-provider__check">
                              <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                width="11"
                                height="11"
                              >
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          )}
                        </div>
                        <span className="sw-modal-provider__desc">
                          {meta.description}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Execution Strategy — shown but dimmed, note that perp protocols handle execution */}
            <div className="sw-modal-section sw-modal-section--dimmed">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Execution Strategy
                <span className="sw-modal-section__note">
                  Managed by protocol
                </span>
              </div>
              <div className="sw-modal-executions sw-modal-executions--disabled">
                {(Object.keys(EXECUTION_META) as ExecutionStrategy[]).map(
                  (s) => {
                    const meta = EXECUTION_META[s];
                    const active = settings.executionStrategy === s;
                    return (
                      <div
                        key={s}
                        className={`sw-modal-exec sw-modal-exec--readonly ${active ? "sw-modal-exec--active" : ""}`}
                      >
                        <span className="sw-modal-exec__icon">{meta.icon}</span>
                        <div className="sw-modal-exec__text">
                          <span className="sw-modal-exec__label">
                            {meta.label}
                          </span>
                          <span className="sw-modal-exec__desc">
                            {meta.description}
                          </span>
                        </div>
                        {active && (
                          <svg
                            viewBox="0 0 12 12"
                            fill="none"
                            width="11"
                            height="11"
                            className="sw-modal-exec__check"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Slippage — display only, dimmed */}
            <div className="sw-modal-section sw-modal-section--dimmed">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path
                    d="M2 12L12 2M5 2H2v3M12 9v3h-3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Slippage Tolerance
                <span className="sw-modal-section__note">
                  Set by protocol ({settings.slippage}%)
                </span>
              </div>
              <div className="sw-modal-slippage sw-modal-slippage--disabled">
                {SLIPPAGE_PRESETS.map((p) => (
                  <div
                    key={p}
                    className={`sw-slip-pill ${settings.slippage === p ? "sw-slip-pill--active" : ""}`}
                  >
                    {p}%
                  </div>
                ))}
              </div>
              <p className="sw-settings-note">
                Perp protocol slippage is managed by{" "}
                {PERP_PROVIDER_META[settings.perpProvider].label}. Change
                slippage in the Spot tab if needed for spot trades.
              </p>
            </div>

            {/* Summary */}
            <div className="sw-modal-summary">
              <div className="sw-modal-summary__chip">
                <span className="sw-modal-summary__dot" />
                {PERP_PROVIDER_META[settings.perpProvider].label}
                {PERP_PROVIDER_META[settings.perpProvider].badge && (
                  <span className="sw-modal-summary__badge">
                    {PERP_PROVIDER_META[settings.perpProvider].badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EARN PANEL ── */}
        {panel === "earn" && (
          <div className="sw-modal__body">
            {/* Earn Provider */}
            <div className="sw-modal-section">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                Earn Provider
              </div>
              <div className="sw-modal-providers">
                {(Object.keys(EARN_PROVIDER_META) as EarnProvider[]).map((p) => {
                  const meta = EARN_PROVIDER_META[p];
                  const active = settings.earnProvider === p;
                  return (
                    <button
                      key={p}
                      className={`sw-modal-provider ${active ? "sw-modal-provider--active" : ""}`}
                      onClick={() => setEarnProvider(p)}
                    >
                      <div className="sw-modal-provider__top">
                        <span className="sw-modal-provider__name">
                          {meta.label}
                        </span>
                        {meta.badge && (
                          <span className="sw-modal-provider__badge">
                            {meta.badge}
                          </span>
                        )}
                        {active && (
                          <span className="sw-modal-provider__check">
                            <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <span className="sw-modal-provider__desc">
                        {meta.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slippage — display only, dimmed */}
            <div className="sw-modal-section sw-modal-section--dimmed">
              <div className="sw-modal-section__label">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path d="M2 12L12 2M5 2H2v3M12 9v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Slippage Tolerance
                <span className="sw-modal-section__note">
                  Managed by protocol ({settings.slippage}%)
                </span>
              </div>
              <div className="sw-modal-slippage sw-modal-slippage--disabled">
                {SLIPPAGE_PRESETS.map((p) => (
                  <div key={p} className={`sw-slip-pill ${settings.slippage === p ? "sw-slip-pill--active" : ""}`}>
                    {p}%
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="sw-modal-summary">
              <div className="sw-modal-summary__chip">
                <span className="sw-modal-summary__dot" />
                {EARN_PROVIDER_META[settings.earnProvider].label}
                {EARN_PROVIDER_META[settings.earnProvider].badge && (
                  <span className="sw-modal-summary__badge">
                    {EARN_PROVIDER_META[settings.earnProvider].badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sw-modal__footer">
          <button className="sw-modal__reset" onClick={resetSettings}>
            Reset to defaults
          </button>
          <button className="sw-modal__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
