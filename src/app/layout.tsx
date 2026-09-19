import type { Metadata } from "next";
import {
  Newsreader,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tape — Personal Trading Journal",
  description:
    "A single-user trading journal to log trades, review analytics, track risk, and export history.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-text">
        <div className="flex-1 flex flex-col w-full">{children}</div>
        <footer className="hairline-t py-6 text-center text-xs text-muted">
          Tape — personal trading journal
        </footer>
      </body>
    </html>
  );
}