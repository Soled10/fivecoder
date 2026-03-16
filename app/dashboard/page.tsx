'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

type Brain = {
  createdAt: string;
  baseType: string;
  sqlEngine: string;
  tags: string[];
  fileCount: number;
  sqlFileName?: string;
};

const rules = [
  { tag: 'QBCore', pattern: /qb|qbx|qb-core/i },
  { tag: 'ESX', pattern: /esx/i },
  { tag: 'vRP', pattern: /vrp/i },
  { tag: 'OX', pattern: /ox_inventory|ox_lib/i },
  { tag: 'NUI', pattern: /html|css|js|nui|react|vue/i },
  { tag: 'MySQL', pattern: /mysql|innodb|varchar|auto_increment/i },
  { tag: 'PostgreSQL', pattern: /postgres|serial|plpgsql/i },
];

function detectTags(fileNames: string[], sqlText: string) {
  const source = `${fileNames.join(' ')} ${sqlText}`;
  const tags = new Set<string>();
  rules.forEach((rule) => {
    if (rule.pattern.test(source)) tags.add(rule.tag);
  });
  return Array.from(tags);
}

export default function DashboardPage() {
  const router = useRouter();
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const [sqlContent, setSqlContent] = useState('');
  const [firstPrompt, setFirstPrompt] = useState('Crie um sistema premium de inventário com NUI moderna e segura.');
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [brain, setBrain] = useState<Brain | null>(null);

  const canAnalyze = useMemo(() => !!sqlFile && folderFiles.length > 0 && !analyzing, [sqlFile, folderFiles, analyzing]);

  function configureFolderSelection() {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }

  async function onSqlUpload(file: File) {
    setSqlFile(file);
    setError('');
    try {
      const content = await file.text();
      setSqlContent(content.slice(0, 300000));
    } catch {
      setError('Falha ao processar SQL.');
    }
  }

  async function analyzeBase() {
    setAnalyzing(true);
    setProgress(0);
    setError('');

    try {
      for (let i = 1; i <= 5; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 120));
        setProgress(i * 20);
      }

      const names = folderFiles.map((file) => file.name);
      const tags = detectTags(names, sqlContent);

      let baseType = 'Custom';
      if (tags.includes('QBCore')) baseType = 'QBCore';
      else if (tags.includes('ESX')) baseType = 'ESX';
      else if (tags.includes('vRP')) baseType = 'vRP';

      const sqlEngine = tags.includes('PostgreSQL') ? 'PostgreSQL' : 'MySQL';

      const result: Brain = {
        createdAt: new Date().toISOString(),
        baseType,
        sqlEngine,
        tags,
        fileCount: folderFiles.length,
        sqlFileName: sqlFile?.name,
      };

      setBrain(result);
      localStorage.setItem('fivecoder_brain', JSON.stringify(result));
    } catch {
      setError('Erro ao analisar base.');
    } finally {
      setAnalyzing(false);
    }
  }

  function openWorkspace() {
    if (!firstPrompt.trim()) {
      setError('Digite um primeiro prompt.');
      return;
    }

    localStorage.setItem('fivecoder_first_prompt', firstPrompt.trim());
    router.push('/workspace');
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
            <p className="badge">Configuração da base</p>
            <h1>Conectar projeto FiveM</h1>
          </div>
          <button
            className="danger-btn"
            onClick={() => {
              localStorage.removeItem('fivecoder_session');
              router.push('/login');
            }}
          >
            Sair
          </button>
        </header>

        <section className="pro-card section-card">
          <h2>1) Upload da base e SQL</h2>
          <div className="grid-two">
            <label>
              Pasta da base
              <input
                ref={folderInputRef}
                type="file"
                multiple
                onClick={configureFolderSelection}
                onChange={(e) => setFolderFiles(Array.from(e.target.files || []))}
              />
            </label>
            <label>
              SQL
              <input
                type="file"
                accept=".sql,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSqlUpload(file);
                }}
              />
            </label>
          </div>

          <button onClick={analyzeBase} disabled={!canAnalyze}>
            {analyzing ? 'Analisando...' : 'Analisar Base'}
          </button>
          <div className="progress-wrap"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
          {error && <p className="text-error">{error}</p>}

          {brain && (
            <div className="small-panel">
              <p><strong>Tipo:</strong> {brain.baseType}</p>
              <p><strong>Banco:</strong> {brain.sqlEngine}</p>
              <p><strong>Arquivos:</strong> {brain.fileCount}</p>
              <p><strong>Tags:</strong> {brain.tags.join(', ') || 'nenhuma'}</p>
            </div>
          )}
        </section>

        <section className="pro-card section-card">
          <h2>2) Primeiro Prompt</h2>
          <p className="muted">Ao enviar, você vai para o workspace com explorer à esquerda e chat à direita.</p>
          <textarea rows={5} value={firstPrompt} onChange={(e) => setFirstPrompt(e.target.value)} />
          <button onClick={openWorkspace}>Abrir Workspace</button>
        </section>
      </section>
    </main>
  );
}
