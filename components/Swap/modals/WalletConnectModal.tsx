"use client";

import { useEffect, useRef, useState } from "react";
import { useConnector } from "@solana/connector/react";

interface WalletConnectModalProps {
  onClose: () => void;
}

function getInstallUrl(name: string) {
  const n = name.toLowerCase();
  if (n.includes("phantom")) return "https://phantom.app";
  if (n.includes("solflare")) return "https://solflare.com";
  if (n.includes("backpack")) return "https://backpack.app";
  return "https://phantom.app";
}

export function WalletConnectModal({ onClose }: WalletConnectModalProps) {
  const { wallets, select, connecting, selectedWallet } = useConnector();
  const [connectingName, setConnectingName] = useState<string | null>(null);
  const [recentWallet, setRecentWallet] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const recent = localStorage.getItem("sw_recentWallet");
    if (recent) setRecentWallet(recent);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-close once connected
  useEffect(() => {
    if (selectedWallet?.name) {
      localStorage.setItem("sw_recentWallet", selectedWallet.name);
      onClose();
    }
  }, [selectedWallet, onClose]);

  async function handleSelect(name: string) {
    setConnectingName(name);
    try {
      await select(name);
      localStorage.setItem("sw_recentWallet", name);
    } catch (err) {
      console.error("Wallet connect failed:", err);
    } finally {
      setConnectingName(null);
    }
  }

  const installed = wallets.filter((w) => w.installed);
  const notInstalled = wallets.filter((w) => !w.installed);

  const sorted = [...installed].sort((a, b) => {
    if (a.wallet.name === recentWallet) return -1;
    if (b.wallet.name === recentWallet) return 1;
    return 0;
  });

  return (
    <div
      className="sw-modal-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="sw-modal sw-modal--wallet"
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
      >
        {/* Header */}
        <div className="sw-modal__header">
          <button
            className="sw-modal__help"
            onClick={() =>
              window.open("https://docs.solana.com/wallet-guide", "_blank")
            }
            aria-label="Wallet help"
          >
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M5.5 5.5a1.5 1.5 0 012.83.5c0 1-1.5 1.5-1.5 2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="7" cy="10" r="0.5" fill="currentColor" />
            </svg>
          </button>
          <span className="sw-modal__title">Connect wallet</span>
          <button
            className="sw-modal__close"
            onClick={onClose}
            aria-label="Close"
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

        {/* Body */}
        <div className="sw-modal__body sw-modal__body--wallet">
          {sorted.length === 0 && notInstalled.length === 0 ? (
            /* Empty state */
            <div className="sw-wallet-empty">
              <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                <rect
                  x="6"
                  y="13"
                  width="36"
                  height="26"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M30 26a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" />
                <path d="M6 20h36" stroke="currentColor" strokeWidth="2" />
              </svg>
              <p className="sw-wallet-empty__title">No wallets detected</p>
              <p className="sw-wallet-empty__sub">
                Install a Solana wallet to get started
              </p>
              <div className="sw-wallet-empty__actions">
                <button
                  className="sw-wallet-empty__btn"
                  onClick={() => window.open("https://phantom.app", "_blank")}
                >
                  Get Phantom
                </button>
                <button
                  className="sw-wallet-empty__btn sw-wallet-empty__btn--outline"
                  onClick={() => window.open("https://backpack.app", "_blank")}
                >
                  Get Backpack
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Installed wallets */}
              {sorted.length > 0 && (
                <div className="sw-wallet-grid">
                  {sorted.map((w) => {
                    const isConnecting = connectingName === w.wallet.name;
                    const isRecent = recentWallet === w.wallet.name;
                    return (
                      <button
                        key={w.wallet.name}
                        className="sw-wallet-row"
                        onClick={() => handleSelect(w.wallet.name)}
                        disabled={connecting || !!connectingName}
                      >
                        <div className="sw-wallet-row__icon-wrap">
                          {w.wallet.icon ? (
                            <img
                              src={w.wallet.icon}
                              alt={w.wallet.name}
                              width={36}
                              height={36}
                              className="sw-wallet-row__icon"
                            />
                          ) : (
                            <div className="sw-wallet-row__icon sw-wallet-row__icon--fallback">
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                width="18"
                                height="18"
                              >
                                <rect
                                  x="2"
                                  y="5"
                                  width="16"
                                  height="12"
                                  rx="2"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                />
                                <path
                                  d="M14 11a1 1 0 110-2 1 1 0 010 2z"
                                  fill="currentColor"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="sw-wallet-row__info">
                          <span className="sw-wallet-row__name">
                            {w.wallet.name}
                          </span>
                          {isRecent && !isConnecting && (
                            <span className="sw-wallet-row__recent">
                              Recent
                            </span>
                          )}
                          {isConnecting && (
                            <span className="sw-wallet-row__status">
                              Connecting…
                            </span>
                          )}
                        </div>
                        {isConnecting ? (
                          <span
                            className="sw-spinner sw-spinner--dark"
                            aria-hidden
                          />
                        ) : (
                          <svg
                            viewBox="0 0 12 12"
                            fill="none"
                            width="10"
                            height="10"
                            className="sw-wallet-row__arrow"
                          >
                            <path
                              d="M3 6h6M7 4l2 2-2 2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Not-installed wallets */}
              {notInstalled.length > 0 && sorted.length > 0 && (
                <div className="sw-wallet-divider">
                  <span>More wallets</span>
                </div>
              )}
              {notInstalled.length > 0 && (
                <div className="sw-wallet-grid sw-wallet-grid--secondary">
                  {notInstalled.slice(0, 3).map((w) => (
                    <button
                      key={w.wallet.name}
                      className="sw-wallet-row sw-wallet-row--install"
                      onClick={() =>
                        window.open(getInstallUrl(w.wallet.name), "_blank")
                      }
                    >
                      <div className="sw-wallet-row__icon-wrap">
                        {w.wallet.icon ? (
                          <img
                            src={w.wallet.icon}
                            alt={w.wallet.name}
                            width={36}
                            height={36}
                            className="sw-wallet-row__icon"
                          />
                        ) : (
                          <div className="sw-wallet-row__icon sw-wallet-row__icon--fallback" />
                        )}
                      </div>
                      <div className="sw-wallet-row__info">
                        <span className="sw-wallet-row__name">
                          {w.wallet.name}
                        </span>
                        <span className="sw-wallet-row__status sw-wallet-row__status--muted">
                          Not installed
                        </span>
                      </div>
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        width="10"
                        height="10"
                        className="sw-wallet-row__arrow"
                      >
                        <path
                          d="M2 2h8v8M10 2L2 10"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sw-modal__footer sw-modal__footer--wallet">
          <p className="sw-wallet-note">
            Connecting a wallet means you agree to our terms.
          </p>
        </div>
      </div>
    </div>
  );
}
