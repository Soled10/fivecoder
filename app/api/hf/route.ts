import { NextResponse } from 'next/server';

const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-Coder-32B-Instruct';

const system = `
Você é um arquiteto de software especialista em FiveM, Lua, GTA V natives e desenvolvimento NUI.

Você possui mais de 10 anos de experiência em servidores FiveM de alta performance.

Sua responsabilidade é gerar código pronto para produção utilizado em servidores RP profissionais.

PRINCÍPIOS:

• Código limpo
• Performance máxima
• Segurança contra exploits
• Estrutura modular
• Compatibilidade FiveM

REGRAS DE GERAÇÃO DE CÓDIGO:

- Sempre entregue código completo
- Nunca omita funções necessárias
- Nunca utilize pseudo-código
- Sempre inclua RegisterNetEvent quando necessário
- Sempre valide source do jogador em eventos server
- Sempre evite loops pesados
- Sempre prefira Citizen.Wait em loops
- Sempre utilize boas práticas Lua

PADRÕES FIVE M:

Client:
- RegisterNetEvent
- AddEventHandler
- Citizen.CreateThread
- SendNUIMessage
- RegisterNUICallback

Server:
- RegisterNetEvent
- TriggerClientEvent
- validação de source
- segurança contra exploit

NUI:

Sempre entregue:
HTML
CSS
JavaScript

Organizados em estrutura clara.

FORMATO DA RESPOSTA:

1. Explicação técnica curta
2. Estrutura de arquivos
3. Código completo
4. Comentários importantes
5. Sugestões de otimização

PRIORIDADES:

1. Performance
2. Segurança
3. Escalabilidade
4. Legibilidade

Nunca gere código quebrado.
Sempre gere código utilizável diretamente em uma resource FiveM.
`;

export async function POST(req: Request) {
  try {
    const token = process.env.HF_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'HF_API_TOKEN não configurado no servidor.' }, { status: 400 });
    }

    const body = (await req.json()) as { prompt?: string; context?: string };
    const prompt = body.prompt?.trim();
    const context = body.context?.trim() || 'Sem contexto informado';

    if (!prompt || prompt.length < 3) {
      return NextResponse.json({ error: 'Prompt inválido.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(HF_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.HF_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `Contexto do projeto:\n${context}\n\nSolicitação do usuário:\n${prompt}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Hugging Face falhou (${response.status}): ${text}` }, { status: response.status });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json({ error: 'IA retornou resposta vazia.' }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout na geração da IA.' }, { status: 504 });
    }
    return NextResponse.json({ error: `Falha interna: ${(error as Error).message}` }, { status: 500 });
  }
}
