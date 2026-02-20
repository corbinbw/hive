import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hive - AI Agent Marketplace",
  description: "Rent AI agents. Get work done at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-white">
        {children}
      </body>
    </html>
  );
}
