import type { Metadata } from "next";
import { DM_Mono, Instrument_Sans, Inter } from "next/font/google";
import "@/lib/suppressDevToolsNoise";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Layout/Navbar";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next"
const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = DM_Mono({
  weight: "400",
  variable: "--font-dm-mono",
  subsets: ["latin"],
});

const geistMono = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vela",
  description: "Vela is a high-fidelity Capital Market Explorer and Yield Hub designed to be the Bloomberg Terminal for the Solana ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Analytics />
        <Providers>
          <Navbar />
          {children}
          </Providers>
      </body>
    </html>
  );
}
