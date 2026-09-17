import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frente Cultura",
  description: "Organización y seguimiento del Frente Cultura",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
