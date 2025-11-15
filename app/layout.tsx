import type { Metadata } from "next";
import "./globals.css";
import { MaterialThemeProvider } from "@/components/MaterialThemeProvider";

export const metadata: Metadata = {
  title: "Aurora Scrobbler",
  description: "Material expressive Last.fm scrobbler built for the web."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MaterialThemeProvider>{children}</MaterialThemeProvider>
      </body>
    </html>
  );
}
