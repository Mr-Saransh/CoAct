import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/SocketProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoAct | Real-Time Group Interaction",
  description: "A premium, browser-based real-time group interaction platform.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark antialiased`}>
      <body className="min-h-screen bg-background text-foreground font-sans">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
