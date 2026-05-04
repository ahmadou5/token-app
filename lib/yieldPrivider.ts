import { EarnProvider, SwapProvider, PerpProvider } from "@/context/SwapSettingsContext";

const PROVIDER_ICONS: Record<EarnProvider, string> = {
  kamino: "https://kamino.com/favicon.ico",
  marginfi: "https://app.marginfi.com/favicon.ico",
  drift: "https://app.drift.trade/favicon.ico",
  jupiter: "https://jup.ag/favicon.ico",
};

const SWAP_PROVIDER_ICONS: Record<SwapProvider, string> = {
  metis: "https://jup.ag/favicon.ico",
  titan: "https://jup.ag/favicon.ico",
};

const PERP_PROVIDER_ICONS: Record<PerpProvider, string> = {
  adrena: "https://adrena.xyz/favicon.ico",
  flash: "https://flash.trade/favicon.ico",
};

const PROTOCOL_COLORS: Record<EarnProvider, string> = {
  kamino: "#9945FF",
  marginfi: "#6399FF",
  drift: "#FFA500",
  jupiter: "#A020F0",
};

const PROTOCOL_NAMES: Record<EarnProvider, string> = {
  kamino: "Kamino",
  marginfi: "MarginFi",
  drift: "Drift",
  jupiter: "Jupiter",
};

const getProviderIcon = (provider: EarnProvider | undefined): string => {
  return provider && PROVIDER_ICONS[provider] ? PROVIDER_ICONS[provider] : "";
};

const getProviderColor = (provider: EarnProvider | undefined): string => {
  return provider && PROTOCOL_COLORS[provider] ? PROTOCOL_COLORS[provider] : "";
};

const getProviderName = (provider: EarnProvider | undefined): string => {
  return provider && PROTOCOL_NAMES[provider] ? PROTOCOL_NAMES[provider] : "";
};

export { 
  getProviderIcon, 
  getProviderColor, 
  getProviderName, 
  PROVIDER_ICONS, 
  SWAP_PROVIDER_ICONS, 
  PERP_PROVIDER_ICONS 
};

