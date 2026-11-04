import './globals.css';

export const metadata = {
  title: 'Astraonyx Polaris — Cosmic Next.js & React 3D Portal',
  description: 'Next.js 14, React, Tailwind CSS, and Three.js interface for Astraonyx Polaris WhatsApp Ecosystem.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <body className="bg-obsidian-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
