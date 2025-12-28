import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// import '../server-init'; // COMENTADO: Bloqueaba el healthcheck de Railway
// La BD se inicializa lazy en cada endpoint que la necesita

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Payments Platform - Admin Console',
  description: 'Plataforma integral de pagos: cheques electrónicos, transferencias bancarias, pagos digitales, débitos automáticos y conciliación',
  keywords: 'pagos, cheques electrónicos, transferencias, payment links, débitos automáticos, conciliación bancaria, plataforma de pagos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}