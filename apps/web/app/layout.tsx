import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hán Note",
  description: "Personal AI Chinese vocabulary learning app for Vietnamese speakers",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
