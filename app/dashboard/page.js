'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const rules = [
  { tag: 'QBCore', pattern: /qb|qbx|qb-core/i },
  { tag: 'ESX', pattern: /esx/i },
  { tag: 'vRP', pattern: /vrp/i },
  { tag: 'OX', pattern: /ox_inventory|ox_lib/i },
  { tag: 'Lua', pattern: /\.lua|lua/i },
  { tag: 'NUI', pattern: /html|css|js|nui|react|vue/i },
  { tag: 'MySQL', pattern: /mysql|innodb|varchar|auto_increment/i },
  { tag: 'PostgreSQL', pattern: /postgres|serial|plpgsql/i },
];

function detectTags(fileNames, sqlText) {
  const joined = `${fileNames.join(' ')} ${sqlText}`;
  const tags = new Set();
  for (const rule of rules) {
    if (rule.pattern.test(joined)) tags.add(rule.tag);
  }
  return Array.from(tags);
}

function parseCodeBlocks(answer) {
  const blocks = answer.match(/```[\s\S]*?```/g) || [];
  if (!blocks.length) return null;

  const cleaned = blocks.map((b) => b.replace(/^```\w*\n?/, '').replace(/```$/, '').trim());
  const [first = '', second = '', third = ''] = cleaned;

  return {
    clientLua: first || '-- client.lua não retornado pela IA',
    serverLua: second || '-- server.lua não retornado pela IA',
    nuiHtml: third || '<!doctype html><html><body><h1>NUI não retornada</h1></body></html>',
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const folderInputRef = useRef(null);

  const [folderFiles, setFolderFiles] = useState([]);
  const [sqlFile, setSqlFile] = useState(null);
  const [sqlContent, setSqlContent] = useState('');
  const [brain, setBrain] = useState(null);

  const [scriptFiles, setScriptFiles] = useState([
    { name: 'client.lua', content: '-- client.lua' },
    { name: 'server.lua', content: '-- server.lua' },
    { name: 'web/index.html', content: '<!doctype html><html><body>Preview NUI</body></html>' },
  ]);
  const [selectedFile, setSelectedFile] = useState('client.lua');

  const [history, setHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const [aiPrompt, setAiPrompt] = useState('Crie um sistema de garagem premium com NUI profissional.');
  const [chat, setChat] = useState([
    { role: 'agent', text: 'Envie sua base e SQL. Depois mande o primeiro prompt para abrir o workspace.', at: new Date().toISOString() },
  ]);
  const [workspaceMode, setWorkspaceMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showNuiPreview, setShowNuiPreview] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('fivecoder_session');
    if (!session) {
      router.push('/login');
      return;
    }

    const savedBrain = localStorage.getItem('fivecoder_brain');
    if (savedBrain) {
      const parsed = JSON.parse(savedBrain);
      setBrain(parsed);
      setHistory((prev) => [
        ...prev,
        `Cérebro carregado: ${parsed.baseType || 'tipo não identificado'} (${parsed.tags.join(', ')})`,
      ]);
    }
  }, [router]);

  const canAnalyze = folderFiles.length > 0 && !!sqlFile && !analyzing;

  const fileSummary = useMemo(
    () => folderFiles.slice(0, 8).map((f) => f.webkitRelativePath || f.name),
    [folderFiles],
  );

  const currentFile = useMemo(
    () => scriptFiles.find((file) => file.name === selectedFile) || scriptFiles[0],
    [scriptFiles, selectedFile],
  );

  const nuiFile = useMemo(
    () => scriptFiles.find((file) => file.name.includes('index.html')),
    [scriptFiles],
  );

  function configureFolderSelection() {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute('webkitdirectory', '');
    folderInputRef.current.setAttribute('directory', '');
  }

  async function handleSqlFile(file) {
    setError('');
    setSqlFile(file);

    try {
      const content = await file.text();
      setSqlContent(content.slice(0, 300000));
      setHistory((prev) => [...prev, `SQL carregado: ${file.name} (${Math.round(file.size / 1024)} KB)`]);
    } catch {
      setError('Não foi possível ler o SQL. Tente outro arquivo.');
    }
  }

  async function analyzeBase() {
    setAnalyzing(true);
    setError('');
    setUploadProgress(0);

    try {
      for (let i = 1; i <= 5; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 160));
        setUploadProgress(i * 20);
      }

      const fileNames = folderFiles.map((file) => file.name);
      const tags = detectTags(fileNames, sqlContent);
      let baseType = 'Base custom';

      if (tags.includes('QBCore')) baseType = 'QBCore';
      else if (tags.includes('ESX')) baseType = 'ESX';
      else if (tags.includes('vRP')) baseType = 'vRP';

      const sqlEngine = tags.includes('PostgreSQL') ? 'PostgreSQL' : 'MySQL';

      const brainData = {
        createdAt: new Date().toISOString(),
        baseType,
        sqlEngine,
        tags,
        fileCount: folderFiles.length,
        sqlFileName: sqlFile?.name,
      };

      setBrain(brainData);
      localStorage.setItem('fivecoder_brain', JSON.stringify(brainData));
      setHistory((prev) => [
        ...prev,
        `Base analisada: ${brainData.baseType} com ${brainData.fileCount} arquivo(s).`,
        `Banco: ${brainData.sqlEngine}. Tags: ${brainData.tags.join(', ') || 'nenhuma'}.`,
      ]);
    } catch {
      setError('Falha ao analisar sua base.');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateSelectedFileContent(content) {
    setScriptFiles((prev) => prev.map((file) => (file.name === selectedFile ? { ...file, content } : file)));
  }

  async function sendPrompt() {
    if (!aiPrompt.trim()) return;

    const userMsg = { role: 'user', text: aiPrompt.trim(), at: new Date().toISOString() };
    setChat((prev) => [...prev, userMsg]);
    setAiLoading(true);
    setError('');

    if (!workspaceMode) setWorkspaceMode(true);

    try {
      const context = brain
        ? `Tipo: ${brain.baseType}\nBanco: ${brain.sqlEngine}\nTags: ${brain.tags.join(', ')}\nSQL amostra: ${sqlContent.slice(0, 1200)}`
        : `Sem base analisada. SQL amostra: ${sqlContent.slice(0, 1200)}`;

      const response = await fetch('/api/hf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim(), context }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar com Hugging Face.');

      const answer = data.answer;
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
        updateSelectedFileContent(answer);
      }

      setHistory((prev) => [...prev, 'Prompt processado. Workspace atualizado com resposta da IA.']);
      setAiPrompt('');
    } catch (err) {
      setChat((prev) => [...prev, { role: 'agent', text: `Erro: ${err.message}`, at: new Date().toISOString() }]);
      setError(`Erro IA: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  const setupPanel = (
    <section className="panel card-glass fade-up">
      <h2>Conectar base</h2>
      <p className="muted">Selecione a pasta da base e envie o SQL para análise.</p>

      <div className="row">
        <label className="input-block">
          Pasta da base
          <input
            ref={folderInputRef}
            type="file"
            multiple
            onClick={configureFolderSelection}
            onChange={(e) => setFolderFiles(Array.from(e.target.files || []))}
          />
        </label>

        <label className="input-block">
          SQL da base
          <input
            type="file"
            accept=".sql,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSqlFile(file);
            }}
          />
        </label>
      </div>

      <button type="button" disabled={!canAnalyze} onClick={analyzeBase}>
        {analyzing ? 'Analisando...' : 'Upload + Analisar base'}
      </button>

      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${uploadProgress}%` }} /></div>

      {brain && (
        <div className="small-box">
          <p><strong>Base:</strong> {brain.baseType}</p>
          <p><strong>Banco:</strong> {brain.sqlEngine}</p>
          <p><strong>Arquivos:</strong> {brain.fileCount}</p>
        </div>
      )}

      {fileSummary.length > 0 && (
        <div className="small-box">
          <strong>Arquivos detectados ({folderFiles.length})</strong>
          <ul>{fileSummary.map((name) => <li key={name}>{name}</li>)}</ul>
        </div>
      )}
    </section>
  );

  const promptPanel = (
    <section className="panel card-glass fade-up">
      <h2>Primeiro prompt</h2>
      <p className="muted">Quando você enviar o primeiro prompt, o sistema muda para modo workspace estilo VSCode.</p>
      <label className="input-block">
        Prompt para IA
        <textarea rows={5} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ex: crie um sistema completo de inventário com NUI moderna" />
      </label>
      <button type="button" onClick={sendPrompt} disabled={aiLoading || !aiPrompt.trim()}>
        {aiLoading ? 'Gerando...' : 'Enviar prompt e abrir workspace'}
      </button>
    </section>
  );

  return (
    <main className="dashboard-page">
      <div className="mesh mesh--one" />
      <div className="mesh mesh--two" />

      <header className="dash-header fade-up">
        <div>
          <p className="eyebrow">FiveCoder AI Dashboard</p>
          <h1>Studio Profissional de Scripts Lua + NUI</h1>
          <p className="muted">Chat com IA + Explorador de Arquivos + Editor de Código + Preview NUI.</p>
        </div>
        <button type="button" className="logout-btn" onClick={() => { localStorage.removeItem('fivecoder_session'); router.push('/login'); }}>
          Sair
        </button>
      </header>

      {error && <p className="error-text fade-up">{error}</p>}

      {!workspaceMode ? (
        <>
          {setupPanel}
          {promptPanel}
        </>
      ) : (
        <section className="workspace fade-up">
          <aside className="workspace-left panel card-glass">
            <div className="explorer-head">
              <h3>Explorer</h3>
              <button type="button" className="small-btn" onClick={() => setShowNuiPreview((v) => !v)}>
                {showNuiPreview ? 'Voltar código' : 'Visualizar NUI'}
              </button>
            </div>

            <ul className="file-list">
              {scriptFiles.map((file) => (
                <li key={file.name}>
                  <button
                    type="button"
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

            {!showNuiPreview ? (
              <textarea
                className="code-editor"
                value={currentFile?.content || ''}
                onChange={(e) => updateSelectedFileContent(e.target.value)}
                rows={22}
              />
            ) : (
              <iframe className="nui-frame" title="Preview NUI" srcDoc={nuiFile?.content || '<h1>NUI vazia</h1>'} />
            )}
          </aside>

          <aside className="workspace-right panel card-glass">
            <h3>Chat da IA</h3>
            <div className="chat-box">
              {chat.map((msg, idx) => (
                <div key={`${msg.at}-${idx}`} className={`chat-msg ${msg.role === 'user' ? 'user' : 'agent'}`}>
                  <strong>{msg.role === 'user' ? 'Você' : 'Agent'}</strong>
                  <pre>{msg.text}</pre>
                </div>
              ))}
            </div>
            <label className="input-block">
              Nova mensagem
              <textarea rows={4} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Peça ajustes no script, novas features, correções..." />
            </label>
            <button type="button" onClick={sendPrompt} disabled={aiLoading || !aiPrompt.trim()}>
              {aiLoading ? 'Respondendo...' : 'Enviar'}
            </button>
          </aside>
        </section>
      )}

      <section className="panel card-glass fade-up">
        <h2>Histórico</h2>
        <ul className="history">
          {history.length === 0 ? <li>Nenhuma ação ainda.</li> : history.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
        </ul>
      </section>
    </main>
  );
}
