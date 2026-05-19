/**
 * LLM Provider Abstraction
 *
 * Supports two backends:
 *   - oMLX (local dev on MacBook M5, OpenAI-compatible API)
 *   - Ollama (company Mac Studios, native Ollama API)
 *
 * Switch via config: `provider: "omlx"` or `provider: "ollama"`
 * Or env var: DEVOPSBOT_PROVIDER=omlx|ollama
 */

import { loadConfig } from './config.js';

// ─── Provider Detection ──────────────────────────────────────────────

export function getActiveProvider() {
  const envProvider = process.env.DEVOPSBOT_PROVIDER;
  if (envProvider === 'omlx' || envProvider === 'ollama') {
    return envProvider;
  }
  const config = loadConfig();
  return config.provider || 'omlx';
}

// ─── oMLX Backend (OpenAI-compatible) ───────────────────────────────

async function generateOMLX(prompt, model) {
  const config = loadConfig();
  const omlxConfig = config.omlx;
  const modelName = model || omlxConfig.model;

  const response = await fetch(`${omlxConfig.host}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${omlxConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`oMLX API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function pingOMLX() {
  try {
    const config = loadConfig();
    const response = await fetch(`${config.omlx.host}/v1/models`, {
      headers: { 'Authorization': `Bearer ${config.omlx.apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── Ollama Backend (company Mac Studios) ───────────────────────────

async function generateOllama(prompt, model) {
  const config = loadConfig();
  const ollamaConfig = config.ollama;
  const modelName = model || ollamaConfig.model;
  const host = ollamaConfig.host || 'http://localhost:11434';

  const response = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 4000,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.response;
}

async function pingOllama() {
  try {
    const config = loadConfig();
    const host = config.ollama.host || 'http://localhost:11434';
    const response = await fetch(`${host}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── Mac Studio Failover (for company environment) ──────────────────

async function generateWithFailover(prompt, model) {
  const config = loadConfig();
  const studios = config.macStudios || [];
  const hosts = studios.length > 0
    ? studios.map(s => `http://${s.host}:11434`)
    : [config.ollama?.host || 'http://localhost:11434'];

  let lastError;
  for (const host of hosts) {
    try {
      const modelName = model || config.ollama.model;
      const response = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 4000 },
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (response.ok) {
        const data = await response.json();
        return data.response;
      }
      lastError = new Error(`${host} returned ${response.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Mac Studios unreachable');
}

// ─── Public API ─────────────────────────────────────────────────────

export async function generate(prompt, model = null) {
  const provider = getActiveProvider();
  if (provider === 'ollama') {
    const config = loadConfig();
    // If multiple Mac Studios are configured, use failover
    if (config.macStudios?.length > 1) {
      return generateWithFailover(prompt, model);
    }
    return generateOllama(prompt, model);
  }
  return generateOMLX(prompt, model);
}

export async function ping() {
  const provider = getActiveProvider();
  return provider === 'ollama' ? pingOllama() : pingOMLX();
}

export function getProviderInfo() {
  const provider = getActiveProvider();
  const config = loadConfig();
  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      host: config.ollama.host,
      model: config.ollama.model,
      macStudios: config.macStudios?.map(s => s.host) || [],
    };
  }
  return {
    provider: 'omlx',
    host: config.omlx.host,
    model: config.omlx.model,
  };
}
