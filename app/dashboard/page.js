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
  { tag: 'MySQL', pattern: /mysql|innodb/i },
  { tag: 'PostgreSQL', pattern: /postgres|serial|plpgsql/i },
];

function detectTags(fileNames, sqlText) {
  const joined = `${fileNames.join(' ')} ${sqlText}`;
  const tags = new Set();
  rules.forEach((rule) => {
    if (rule.pattern.test(joined)) tags.add(rule.tag);
  });
  return Array.from(tags);
}

export default function DashboardPage() {
  const router = useRouter();
  const folderInputRef = useRef(null);

  const [folderFiles, setFolderFiles] = useState([]);
  const [sqlFile, setSqlFile] = useState(null);
  const [sqlContent, setSqlContent] = useState('');
  const [brain, setBrain] = useState(null);
  const [scriptName, setScriptName] = useState('novo_sistema_garagem');
  const [scriptCode, setScriptCode] = useState('-- Seu script Lua será criado aqui...');
  const [history, setHistory] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('Crie um sistema de garagem premium com NUI profissional.');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

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
      setHistory([
        `Cérebro carregado: ${parsed.baseType || 'tipo não identificado'} (${parsed.tags.join(', ')})`,
      ]);
    }
  }, [router]);

  const canAnalyze = folderFiles.length > 0 && sqlFile;

  const fileSummary = useMemo(
    () => folderFiles.slice(0, 8).map((f) => f.webkitRelativePath || f.name),
    [folderFiles],
  );

  function configureFolderSelection() {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute('webkitdirectory', '');
    folderInputRef.current.setAttribute('directory', '');
  }

  async function handleSqlFile(file) {
    setSqlFile(file);
    const content = await file.text();
    setSqlContent(content.slice(0, 200000));
  }

  function analyzeBase() {
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
      `Base analisada: ${brainData.baseType} com ${brainData.fileCount} arquivos e SQL ${brainData.sqlFileName}.`,
      `Cérebro atualizado com tags: ${brainData.tags.join(', ')}`,
    ]);
  }

  async function generateWithHuggingFace() {
    setAiLoading(true);
    setAiResponse('');

    try {
      const context = brain
        ? `Tipo: ${brain.baseType}\nBanco: ${brain.sqlEngine}\nTags: ${brain.tags.join(', ')}\nSQL amostra: ${sqlContent.slice(0, 1200)}`
        : `Sem base analisada. SQL amostra: ${sqlContent.slice(0, 1200)}`;

      const response = await fetch('/api/hf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, context }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao gerar com Hugging Face.');
      }

      setAiResponse(data.answer);
      setScriptCode(data.answer);
      setHistory((prev) => [...prev, 'IA Hugging Face gerou novo conteúdo para o script.']);
    } catch (error) {
      setAiResponse(`Erro: ${error.message}`);
      setHistory((prev) => [...prev, `Erro na IA: ${error.message}`]);
    } finally {
      setAiLoading(false);
    }
  }

  function createNewScript() {
    const baseContext = brain
      ? `-- Base detectada: ${brain.baseType}\n-- SQL: ${brain.sqlEngine}\n-- Tags: ${brain.tags.join(', ')}\n\n`
      : '-- Base ainda não conectada\n\n';

    setScriptCode(`${baseContext}local Script = {}\n\nfunction Script.Init()\n  print('Script ${scriptName} iniciado com sucesso!')\nend\n\nreturn Script\n`);
    setHistory((prev) => [...prev, `Novo script criado: ${scriptName}`]);
  }

  function saveScriptEdit() {
    const key = `fivecoder_script_${scriptName}`;
    localStorage.setItem(
      key,
      JSON.stringify({ scriptName, code: scriptCode, updatedAt: new Date().toISOString() }),
    );
    setHistory((prev) => [...prev, `Edição salva no script: ${scriptName}`]);
  }

  return (
    <main className="dashboard-page">
      <header className="dash-header">
        <div>
          <p className="eyebrow">FiveCoder AI Dashboard</p>
          <h1>Conectar base e criar/editar scripts</h1>
        </div>
        <button
          type="button"
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem('fivecoder_session');
            router.push('/login');
          }}
        >
          Sair
        </button>
      </header>

      <section className="panel">
        <h2>1) Conectar base</h2>
        <p>Selecione a pasta da sua base, faça upload e depois envie o SQL para análise completa.</p>

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
          Upload + Analisar base
        </button>

        {fileSummary.length > 0 && (
          <div className="small-box">
            <strong>Arquivos detectados:</strong>
            <ul>
              {fileSummary.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel split">
        <div>
          <h2>2) Cérebro da base</h2>
          {!brain ? (
            <p>Aguardando análise da base e SQL...</p>
          ) : (
            <div className="small-box">
              <p>
                <strong>Tipo:</strong> {brain.baseType}
              </p>
              <p>
                <strong>Banco:</strong> {brain.sqlEngine}
              </p>
              <p>
                <strong>Arquivos:</strong> {brain.fileCount}
              </p>
              <p>
                <strong>Tags:</strong> {brain.tags.join(', ')}
              </p>
            </div>
          )}

          <h2 style={{ marginTop: 16 }}>3) IA Hugging Face (grátis)</h2>
          <label className="input-block">
            Prompt para IA
            <textarea
              rows={6}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Descreva o script/NUI que você quer gerar..."
            />
          </label>
          <button type="button" onClick={generateWithHuggingFace} disabled={aiLoading || !aiPrompt.trim()}>
            {aiLoading ? 'Gerando com Hugging Face...' : 'Gerar com Hugging Face'}
          </button>
          {aiResponse && <pre className="ai-response">{aiResponse}</pre>}
        </div>

        <div>
          <h2>4) Novo script / Editar script</h2>
          <label className="input-block">
            Nome do script
            <input value={scriptName} onChange={(e) => setScriptName(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" onClick={createNewScript}>
              Criar novo script
            </button>
            <button type="button" onClick={saveScriptEdit}>
              Salvar edição
            </button>
          </div>
          <textarea value={scriptCode} onChange={(e) => setScriptCode(e.target.value)} rows={16} />
        </div>
      </section>

      <section className="panel">
        <h2>Histórico</h2>
        <ul className="history">
          {history.length === 0 ? (
            <li>Nenhuma ação ainda.</li>
          ) : (
            history.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
          )}
        </ul>
      </section>
    </main>
  );
}
