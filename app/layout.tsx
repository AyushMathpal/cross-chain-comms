import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cross-Chain Messenger",
  description: "Send messages across different blockchains using Hyperlane",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} vsc-initialized`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
