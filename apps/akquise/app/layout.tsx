import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Studiojeker ONE",
  description:
    "Gemeinsame Planung für Akquise, Social Marketing und Newsletter mit manueller Freigabe",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
