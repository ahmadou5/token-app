"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      scriptProps={{ "data-cfasync": "false" }} // suppresses React script warning
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
