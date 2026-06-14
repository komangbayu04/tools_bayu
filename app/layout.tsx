import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ShellChrome } from "@/components/shell/ShellChrome";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bayu's Dashboard",
  description: "Personal productivity dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-[family-name:var(--font-urbanist)] antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="kamarupa-theme">
          <ShellChrome>{children}</ShellChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
