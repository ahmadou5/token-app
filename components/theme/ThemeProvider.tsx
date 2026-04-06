// components/theme/ThemeProvider.tsx
// Wrap this around your app in layout.tsx
// Install: npm install next-themes

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class" // toggles .dark on <html>
      defaultTheme="dark" // dark mode by default as requested
      enableSystem={false} // don't follow OS preference
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
