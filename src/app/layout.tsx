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
      <head>
        <title>Ripple</title>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta property="og:title" content="Ripple" />
        <meta property="og:description" content="Find Your Sound" />
        <meta property="og:image" content="/icon.svg" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
