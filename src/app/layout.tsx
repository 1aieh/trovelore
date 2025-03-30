import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import OrdersTable from "@/components/comp-485";
import SyncShopify from "@/components/SyncShopify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trovelore Order Management",
  description: "Order management system for Trovelore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Add console log for debugging Shopify order fetching
  console.log('Attempting to render layout with Shopify components');
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="container mx-auto py-8">
          <SyncShopify />
          <OrdersTable data={[]} />
        </div>
        {children}
      </body>
    </html>
  );
}
