import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OneAuth by dreamymonk", template: "%s · OneAuth" },
  description: "OneAuth: one secure account for Mira and every dreamymonk app.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
