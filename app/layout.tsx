import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${urbanist.variable} h-full`}>
      <body className="h-full font-[family-name:var(--font-urbanist)] antialiased bg-[#EDF0F2]">
        {children}
      </body>
    </html>
  );
}
