import type {Metadata, Viewport} from 'next';
import {Inter, Poppins} from 'next/font/google';
import './globals.css';

const inter = Inter({subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700', '800'], display: 'swap'});
const poppins = Poppins({subsets: ['latin'], variable: '--font-poppins', weight: ['500', '600', '700', '800'], display: 'swap'});

export const metadata: Metadata = {
  title: 'AKBS Poultry CRM',
  description: 'AKBS Poultry Farming Private Limited — CRM and business portals.',
  robots: {index: false, follow: false},
};

export const viewport: Viewport = {themeColor: '#071526', width: 'device-width', initialScale: 1};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en" className={`${inter.variable} ${poppins.variable}`} style={{background: '#071526'}}>
    <body>{children}</body>
  </html>;
}
