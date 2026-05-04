import type { Metadata } from "next";
import Navigation from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "DayMap AI",
  description: "Plan your whole day with AI-powered scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
