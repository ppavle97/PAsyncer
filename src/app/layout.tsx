import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAsyncer — Pratilac oglasa",
  description: "Prati promene cena i oglase na Polovnim automobilima",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
