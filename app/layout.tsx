import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FiveCoder Pro Studio',
  description: 'Plataforma profissional para engenharia de scripts FiveM com IA Hugging Face.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-grid" />
        {children}
      </body>
    </html>
  );
}
