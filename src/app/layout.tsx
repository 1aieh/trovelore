import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SyncShopify from "@/components/SyncShopify"; // Client component for syncing orders
import OrdersTable from "@/components/comp-485"; // Your orders table component

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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="container mx-auto py-8">
          {/* The SyncShopify component will trigger the sync on client load */}
          <SyncShopify />
          {/* Your orders table component */}
          <OrdersTable data={[]} />
        </div>
        {children}
      </body>
    </html>
  );
}