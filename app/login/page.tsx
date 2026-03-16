'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const TEST_USER = { email: 'admin@fivecoder.dev', password: '123456' };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => email.trim().length > 5 && password.trim().length > 3, [email, password]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    await new Promise((resolve) => setTimeout(resolve, 450));

    if (email.trim().toLowerCase() !== TEST_USER.email || password.trim() !== TEST_USER.password) {
      setError('Credenciais inválidas. Use as credenciais de teste exibidas abaixo.');
      setLoading(false);
      return;
    }

    localStorage.setItem(
      'fivecoder_session',
      JSON.stringify({ email: email.trim().toLowerCase(), loggedAt: new Date().toISOString() }),
    );
    router.push('/dashboard');
  }

  return (
    <main className="center-page fade-in">
      <section className="pro-card auth-card">
        <p className="badge">FiveCoder • Pro Edition</p>
        <h1>Login seguro do Studio</h1>
        <p className="muted">Entre para usar o gerador de scripts FiveM com IA, explorador e preview NUI.</p>

        <div className="credentials-box">
          <strong>Acesso de teste</strong>
          <span>E-mail: admin@fivecoder.dev</span>
          <span>Senha: 123456</span>
        </div>

        <form className="stack" onSubmit={handleLogin}>
          <label>
            E-mail
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>

          <label>
            Senha
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>

          {error && <p className="text-error">{error}</p>}

          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? 'Entrando...' : 'Entrar no FiveCoder'}
          </button>
        </form>
      </section>
    </main>
  );
}
