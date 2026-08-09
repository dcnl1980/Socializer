import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Socializer",
  description: "Internal LinkedIn growth OS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <a href="/" className="brand">
            Socializer
          </a>
          <nav>
            <a href="/seats">Seats</a>
            <a href="/leads">Leads</a>
            <a href="/sequences">Sequences</a>
            <a href="/content">Content</a>
            <a href="/jobs">Jobs</a>
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
