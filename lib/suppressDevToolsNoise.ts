// lib/suppressDevToolsNoise.ts
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("showPopover") &&
      args[0].includes("disconnected")
    ) {
      return; // swallow DevTools popover noise
    }
    originalError(...args);
  };
}
