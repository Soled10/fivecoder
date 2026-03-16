'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SettingsPage() {
  const [model, setModel] = useState('Qwen/Qwen2.5-Coder-32B-Instruct');

  return (
    <main className="app-shell fade-in">
      <aside className="sidebar pro-card">
        <h3>FiveCoder</h3>
        <nav className="nav-col">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/workspace">Workspace</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </aside>

      <section className="content-col">
        <header className="topbar pro-card">
          <div>
            <p className="badge">Configurações</p>
            <h1>Segurança e modelo</h1>
          </div>
        </header>

        <section className="pro-card section-card">
          <h2>Modelo padrão</h2>
          <p className="muted">Defina o modelo recomendado para seu backend Hugging Face.</p>
          <input value={model} onChange={(e) => setModel(e.target.value)} />
          <p className="muted">Dica: salve no `.env.local` como `HF_MODEL` para uso do backend.</p>
        </section>

        <section className="pro-card section-card">
          <h2>Checklist de segurança</h2>
          <ul>
            <li>Não exponha `HF_API_TOKEN` no front-end.</li>
            <li>Use rate limit no endpoint `/api/hf` em produção.</li>
            <li>Valide eventos server-side no código gerado.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
