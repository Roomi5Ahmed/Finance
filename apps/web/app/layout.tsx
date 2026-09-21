import type { Metadata } from "next";
import { Roboto, Inter, Anton } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const inter = Inter({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Finance Tracker",
  description: "AI-powered personal finance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${inter.variable} ${anton.variable}`}>
        <div className="starfield" />
        <div className="ember-glow" />
        {children}
      </body>
    </html>
  );
}
