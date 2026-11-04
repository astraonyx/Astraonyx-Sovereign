import type { Metadata } from 'next';
import '@/src/styles/globals.css';
import { AstraonyxSidebar } from '@/src/components/navigation/astraonyx-sidebar';
import { AstraonyxTopbar } from '@/src/components/navigation/astraonyx-topbar';
import { CosmicParticles } from '@/src/components/cosmic/cosmic-particles';

export const metadata: Metadata = {
  title: 'ASTRAONYX — Sovereign Cosmic Command Center',
  description: 'Elegant Luxury Minimal Professional Cosmic Space Interface for Astraonyx Ataraxia Ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#030508] text-slate-100 min-h-screen overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Subtle Ambient Stardust Particle Atmosphere */}
        <CosmicParticles />

        {/* Ambient Cosmic Underglow Orbs */}
        <div className="fixed top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none z-0" />

        {/* Expandable Instagram-Style Sidebar */}
        <AstraonyxSidebar />

        {/* Main Stage Canvas */}
        <div className="pl-[72px] min-h-screen flex flex-col relative z-10 transition-all duration-300">
          <AstraonyxTopbar />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
