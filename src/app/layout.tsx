"use client";

import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head><title>Ripple</title></head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
