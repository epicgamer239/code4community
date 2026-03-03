import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

// Security headers are configured in next.config.mjs

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Code4Community",
  description: "At Code4Community, we build donor management systems, volunteer platforms, program dashboards, and custom software for nonprofits and organizations.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://code4community.net'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/c4c.png', sizes: '32x32', type: 'image/png' },
      { url: '/c4c.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/c4c.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
