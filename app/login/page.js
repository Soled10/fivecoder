'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });

  function handleSubmit(event) {
    event.preventDefault();
    localStorage.setItem(
      'fivecoder_session',
      JSON.stringify({ email: form.email, loggedAt: new Date().toISOString() }),
    );
    router.push('/dashboard');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">FiveCoder AI • Next.js</p>
        <h1>Login da Plataforma</h1>
        <p>Entre para conectar sua base, enviar SQL e gerar/editar scripts Lua profissionais.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              placeholder="voce@servidor.com"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              placeholder="********"
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>

          <button type="submit">Entrar no dashboard</button>
        </form>
      </section>
    </main>
  );
}
