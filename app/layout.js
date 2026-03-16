import './globals.css';

export const metadata = {
  title: 'FiveCoder AI Platform',
  description: 'Plataforma Next.js para conectar base FiveM e criar/editar scripts com IA.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
