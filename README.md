require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3001);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://localhost:3000,http://127.0.0.1:8000').split(',').map((value) => value.trim()).filter(Boolean);

app.use(express.json({ limit: '20mb' }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const matchesAllowed = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp(`^${allowed.replace(/\*/g, '.*')}$`);
          return regex.test(origin);
        }
        return allowed === origin || origin.endsWith('.github.io') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
      });

      if (matchesAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin not allowed: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.disable('x-powered-by');

function getProviderInfo() {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      supportsVision: true,
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      supportsVision: true,
    };
  }

  return {
    provider: 'not-configured',
    model: 'none',
    supportsVision: false,
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', provider: getProviderInfo().provider });
});

app.get('/api/config', (req, res) => {
  res.json(getProviderInfo());
});

function buildOpenAiMessages(historyMessages, imageDataUrl) {
  const messages = [];

  const systemMessage = 'You are Felix Argyle, a helpful, stylish 3D model assistant. Keep answers concise, practical, and friendly.';
  messages.push({ role: 'system', content: systemMessage });

  for (const message of historyMessages) {
    if (!message || !message.content) continue;
    if (message.role === 'user') {
      const content = [];
      content.push({ type: 'text', text: message.content });
      if (imageDataUrl && message.content && message.content.toLowerCase().includes('image')) {
        content.push({ type: 'image_url', image_url: { url: imageDataUrl } });
      }
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'assistant', content: message.content });
    }
  }

  return messages;
}

async function callOpenAI(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from the AI model.';
}

async function callGemini(messages, imageDataUrl) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const contents = [];
  let systemText = 'You are Felix Argyle, a helpful AI assistant.';

  for (const message of messages) {
    if (message.role === 'system') {
      systemText = message.content;
      continue;
    }

    if (message.role === 'user') {
      const parts = [];
      if (typeof message.content === 'string') {
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text') {
            parts.push({ text: part.text });
          }
          if (part.type === 'image_url') {
            parts.push({ inline_data: { mime_type: 'image/jpeg', data: part.image_url.url.split(',')[1] } });
          }
        }
      }
      if (imageDataUrl && !parts.some((part) => part.inline_data)) {
        parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageDataUrl.split(',')[1] } });
      }
      contents.push({ role: 'user', parts });
    }

    if (message.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: message.content }] });
    }
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemText }],
      },
      contents,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error: ${body}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || 'No response from the AI model.';
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], imageDataUrl } = req.body || {};
    const providerInfo = getProviderInfo();

    if (providerInfo.provider === 'not-configured') {
      return res.status(503).json({ error: 'No AI provider is configured. Add OPENAI_API_KEY or GEMINI_API_KEY in your .env file.' });
    }

    if (providerInfo.provider === 'openai') {
      const aiMessages = buildOpenAiMessages(messages, imageDataUrl);
      const reply = await callOpenAI(aiMessages);
      return res.json({ reply });
    }

    if (providerInfo.provider === 'gemini') {
      const aiMessages = messages.filter((message) => !!message && message.content);
      const reply = await callGemini(aiMessages, imageDataUrl);
      return res.json({ reply });
    }

    return res.status(503).json({ error: 'AI provider unavailable.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected AI error.' });
  }
});

app.use(express.static(path.join(__dirname)));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Felix Argyle AI backend running at http://localhost:${PORT}`);
});
