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

    const system =
      'Você é um especialista em FiveM, NUI profissional, Lua e frameworks QBCore/ESX/vRP. Gere código limpo, modular e pronto para produção.';

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
