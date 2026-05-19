import ollama from 'ollama';
import { loadConfig } from './config.js';

export async function checkOllama() {
  try {
    const { name, size } = await ollama.show({ model: 'llama3.3' });
    return {
      ok: true,
      model: name,
      size,
      endpoint: loadConfig().ollama.host,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
    };
  }
}

export async function generate(prompt, model) {
  const config = loadConfig();
  const modelName = model || config.ollama.model;

  const response = await ollama.generate({
    model: modelName,
    prompt,
    stream: false,
  });

  return response.response;
}

export async function listModels() {
  try {
    const result = await ollama.list();
    return result.models.map(m => ({
      name: m.name,
      size: `${(m.size / 1e9).toFixed(1)} GB`,
      modified: new Date(m.modified_at).toISOString(),
    }));
  } catch (err) {
    return [{ error: err.message }];
  }
}

export async function ps() {
  try {
    const result = await ollama.ps();
    return result.models.map(m => ({
      name: m.name,
      id: m.digest,
      size: `${(m.size / 1e9).toFixed(1)} GB`,
    }));
  } catch (err) {
    return [{ error: err.message }];
  }
}
