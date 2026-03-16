'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type ScriptFile = { name: string; content: string };
type ChatMessage = { role: 'user' | 'agent'; text: string; at: string };

function parseCodeBlocks(answer: string) {
  const blocks = answer.match(/```[\s\S]*?```/g) || [];
  if (blocks.length < 3) return null;
  const cleaned = blocks.map((b) => b.replace(/^```\w*\n?/, '').replace(/```$/, '').trim());
  return {
    clientLua: cleaned[0],
    serverLua: cleaned[1],
    nuiHtml: cleaned[2],
  };
}

export default function WorkspacePage() {
  const router = useRouter();
  const initialPrompt = typeof window !== 'undefined' ? localStorage.getItem('fivecoder_first_prompt') || '' : '';

  const [scriptFiles, setScriptFiles] = useState<ScriptFile[]>([
    { name: 'client.lua', content: '-- client.lua' },
    { name: 'server.lua', content: '-- server.lua' },
    { name: 'web/index.html', content: '<!doctype html><html><body><h1>NUI Preview</h1></body></html>' },
  ]);
  const [selectedFile, setSelectedFile] = useState('client.lua');
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'agent', text: 'Workspace iniciado. Peça alterações e melhorias no script.', at: new Date().toISOString() },
    ...(initialPrompt ? [{ role: 'user', text: initialPrompt, at: new Date().toISOString() }] : []),
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNuiPreview, setShowNuiPreview] = useState(false);
  const [error, setError] = useState('');

  const currentFile = useMemo(
    () => scriptFiles.find((f) => f.name === selectedFile) || scriptFiles[0],
    [scriptFiles, selectedFile],
  );
  const nuiFile = useMemo(() => scriptFiles.find((f) => f.name === 'web/index.html'), [scriptFiles]);

  function patchCurrentFile(next: string) {
    setScriptFiles((prev) => prev.map((f) => (f.name === selectedFile ? { ...f, content: next } : f)));
  }

  async function sendPrompt() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');

    const userMessage: ChatMessage = { role: 'user', text: prompt.trim(), at: new Date().toISOString() };
    setChat((prev) => [...prev, userMessage]);

    try {
      const brain = localStorage.getItem('fivecoder_brain');
      const context = brain || 'Sem dados da base';

      const response = await fetch('/api/hf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), context }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na IA.');

      const answer: string = data.answer;
      setChat((prev) => [...prev, { role: 'agent', text: answer, at: new Date().toISOString() }]);

      const parsed = parseCodeBlocks(answer);
      if (parsed) {
        setScriptFiles([
          { name: 'client.lua', content: parsed.clientLua },
          { name: 'server.lua', content: parsed.serverLua },
          { name: 'web/index.html', content: parsed.nuiHtml },
        ]);
        setSelectedFile('client.lua');
      } else {
        patchCurrentFile(answer);
      }

      setPrompt('');
    } catch (err) {
      setError((err as Error).message);
      setChat((prev) => [...prev, { role: 'agent', text: `Erro: ${(err as Error).message}`, at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

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
            <p className="badge">Workspace</p>
            <h1>Modo IDE Profissional</h1>
          </div>
          <button className="danger-btn" onClick={() => router.push('/dashboard')}>Voltar</button>
        </header>

        {error && <p className="text-error">{error}</p>}

        <section className="workspace-grid pro-card">
          <div className="explorer-panel">
            <div className="explorer-top">
              <h3>Explorer</h3>
              <button className="small-btn" onClick={() => setShowNuiPreview((s) => !s)}>
                {showNuiPreview ? 'Voltar código' : 'Visualizar NUI'}
              </button>
            </div>

            <ul className="file-list">
              {scriptFiles.map((file) => (
                <li key={file.name}>
                  <button
                    className={`file-item ${selectedFile === file.name ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFile(file.name);
                      setShowNuiPreview(false);
                    }}
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>

            {showNuiPreview ? (
              <iframe title="preview nui" className="nui-frame" srcDoc={nuiFile?.content || '<h1>NUI vazia</h1>'} />
            ) : (
              <textarea
                className="code-editor"
                rows={24}
                value={currentFile?.content || ''}
                onChange={(e) => patchCurrentFile(e.target.value)}
              />
            )}
          </div>

          <div className="chat-panel">
            <h3>Chat IA</h3>
            <div className="chat-scroll">
              {chat.map((msg, idx) => (
                <article key={`${msg.at}-${idx}`} className={`chat-bubble ${msg.role}`}>
                  <strong>{msg.role === 'user' ? 'Você' : 'Agent'}</strong>
                  <pre>{msg.text}</pre>
                </article>
              ))}
            </div>

            <label>
              Mensagem
              <textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </label>
            <button onClick={sendPrompt} disabled={loading || !prompt.trim()}>
              {loading ? 'Processando...' : 'Enviar Prompt'}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
