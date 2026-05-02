import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://portaldireccionee.minenergia.gov.co'
  ),
  title: {
    default: 'Portal de Dirección EE – MinMinas',
    template: '%s | Portal de Dirección EE',
  },
  description:
    'Dashboard ejecutivo de la Dirección de Energía Eléctrica del Ministerio de Minas y Energía – República de Colombia.',
  keywords: [
    'energía eléctrica', 'MinMinas', 'dashboard', 'Colombia',
    'presupuesto', 'contratos', 'subsidios', 'comunidades energéticas',
  ],
  authors: [{ name: 'Ministerio de Minas y Energía' }],
  robots: { index: false, follow: false },
  icons: {
    // Favicon SVG único con media queries internas (cambia blanco/negro según tema)
    icon: '/favicon.svg',
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Portal de Dirección EE – MinMinas',
    description: 'Dashboard ejecutivo de la Dirección de Energía Eléctrica del Ministerio de Minas y Energía – República de Colombia.',
    url: 'https://portaldireccionee.minenergia.gov.co',
    siteName: 'Portal de Dirección EE',
    images: [{ url: '/images/logo-minenergia.png', width: 512, height: 512 }],
    locale: 'es_CO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF2F9' },
    { media: '(prefers-color-scheme: dark)', color: '#060B14' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const stored = localStorage.getItem('theme');
                  if (stored === 'dark' || stored === 'light') return stored;
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                document.documentElement.classList.add(getTheme());
              })();
            `,
          }}
        />

      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
