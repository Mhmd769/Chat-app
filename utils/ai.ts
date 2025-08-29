const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your env.');
}

type GeminiGenerateOptions = {
  systemPrompt?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export async function generateAIReply(
  userPrompt: string,
  opts: GeminiGenerateOptions = {}
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key missing');
  }

  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(userPrompt, opts.systemPrompt) }],
      },
    ],
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 512,
      temperature: opts.temperature ?? 0.7,
    },
  } as any;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || 'Gemini request failed';
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no text');
  }
  return text.trim();
}

function buildPrompt(userPrompt: string, systemPrompt?: string): string {
  const base = systemPrompt
    ? `${systemPrompt}\n\nUser: ${userPrompt}`
    : userPrompt;
  return base;
}


