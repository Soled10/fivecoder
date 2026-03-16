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
            'HF_API_TOKEN não configurado. Defina no .env.local para habilitar geração real no Hugging Face.',
        },
        { status: 400 },
      );
    }

    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 4) {
      return NextResponse.json({ error: 'Prompt inválido.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const system =
      'Você é um especialista sênior em FiveM, Lua e NUI. Sempre gere código funcional, profissional, comentado e com foco em performance.';

    const composedPrompt = `Contexto da base:\n${context || 'Sem contexto'}\n\nPedido do usuário:\n${prompt}\n\nFormato obrigatório:\n1) Resumo técnico\n2) Estrutura de arquivos\n3) Código Lua principal\n4) NUI (HTML/CSS/JS)`;

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
          { role: 'user', content: composedPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Erro Hugging Face (${response.status}): ${errorText}` },
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
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout na IA. Tente novamente com um prompt menor.' },
        { status: 504 },
      );
    }

    return NextResponse.json({ error: `Falha interna: ${error.message}` }, { status: 500 });
  }
}
