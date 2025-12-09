import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BPL S5 Pick'Ems",
  description: "勝者を予想しよう",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
