import { NextResponse } from 'next/server';

const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-Coder-32B-Instruct';

export async function POST(req) {
  try {
    const token = process.env.HF_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            'HF_API_TOKEN não configurado. Crie um token no Hugging Face e adicione no ambiente para habilitar IA real.',
        },
        { status: 400 },
      );
    }

    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt inválido.' }, { status: 400 });
    }

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

    const composedPrompt = `Contexto da base:\n${context || 'Sem contexto'}\n\nPedido do usuário:\n${prompt}\n\nRetorne em formato:\n1) Resumo técnico\n2) Arquivos sugeridos\n3) Código principal em Lua\n4) Sugestão de NUI (HTML/CSS/JS).`;

    const response = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.HF_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: composedPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Erro do Hugging Face (${response.status}): ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json({ error: 'Resposta vazia da IA.' }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: `Falha interna: ${error.message}` }, { status: 500 });
  }
}
