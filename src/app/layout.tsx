import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CESFAM Rodelillo",
  description: "Centro de Salud Familiar Rodelillo. Información y Portal de Funcionarios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="antialiased scroll-smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --font-inter: 'Inter', sans-serif;
            --font-poppins: 'Poppins', sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-screen flex flex-col font-sans">{children}</body>
    </html>
  );
}
