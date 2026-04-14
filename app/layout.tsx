import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Quiniela · World Cup 2026",
  description: "Play the World Cup prediction game with your friends.",
  openGraph: {
    title: "Quiniela · World Cup 2026",
    description: "Play the World Cup prediction game with your friends.",
    url: "https://quinielatikitaka.com",
    siteName: "Quiniela",
    images: [
      {
        url: "https://quinielatikitaka.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Quiniela · World Cup 2026",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiniela · World Cup 2026",
    description: "Play the World Cup prediction game with your friends.",
    images: ["https://quinielatikitaka.com/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
