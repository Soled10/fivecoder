'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const TEST_USER = {
  email: 'admin@fivecoder.dev',
  password: '123456',
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => form.email.trim().length > 3 && form.password.trim().length > 3,
    [form.email, form.password],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    await new Promise((resolve) => setTimeout(resolve, 450));

    const valid =
      form.email.trim().toLowerCase() === TEST_USER.email && form.password.trim() === TEST_USER.password;

    if (!valid) {
      setLoading(false);
      setError('Credenciais inválidas. Use o login de teste exibido na tela.');
      return;
    }

    localStorage.setItem(
      'fivecoder_session',
      JSON.stringify({ email: form.email.trim().toLowerCase(), loggedAt: new Date().toISOString() }),
    );
    router.push('/dashboard');
  }

  return (
    <main className="auth-page">
      <div className="mesh mesh--one" />
      <div className="mesh mesh--two" />

      <section className="auth-card card-glass fade-up">
        <p className="eyebrow">FiveCoder AI • Next.js + React</p>
        <h1>Bem-vindo ao FiveCoder Studio</h1>
        <p className="muted">
          Faça login para conectar sua base FiveM, analisar SQL, gerar scripts Lua e NUI com IA Hugging Face.
        </p>

        <div className="demo-creds">
          <strong>Login de teste:</strong>
          <span>E-mail: admin@fivecoder.dev</span>
          <span>Senha: 123456</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              placeholder="admin@fivecoder.dev"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              placeholder="123456"
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? 'Entrando...' : 'Entrar no dashboard'}
          </button>
        </form>
      </section>
    </main>
  );
}
