import { readFile } from 'fs/promises';
import { resolve } from 'path';
import ollama from 'ollama';

const FILES = ['src/reviewer.js', 'src/cli.js'];
const MODEL_A = 'qwen3.6';
const MODEL_B = 'gemma4';
const PROMPT = `You are a code reviewer. Analyze the code and return JSON:
{title, summary, score: number, bugs: [], suggestions: [], overall}

---
{{body}}
---
`;

function prompt(model, body) {
  return ollama.generate({ model, prompt: PROMPT.replace('{{body}}', body), stream: false });
}

async function run() {
  console.log('═══ A/B Test: Code Review Models ═══\n');
  console.log(`Files: ${FILES.join(', ')}`);
  console.log(`Model A: ${MODEL_A}\nModel B: ${MODEL_B}\n`);

  const body = (await Promise.all(FILES.map(f => readFile(resolve(f), 'utf-8')))).join('\n\n');

  const [a, b] = await Promise.all([
    prompt(MODEL_A, body).then(r => {
      try { return JSON.parse(r.response); } catch { return { score: 5, raw: r.response.slice(0, 200) }; }
    }),
    prompt(MODEL_B, body).then(r => {
      try { return JSON.parse(r.response); } catch { return { score: 5, raw: r.response.slice(0, 200) }; }
    }),
  ]);

  console.log(`Model ${MODEL_A}:  Score ${a.score}/10`);
  console.log(`  Title: ${a.title}`);
  console.log(`  Summary: ${a.summary}`);
  console.log(`  Bugs: ${a.bugs?.length}  Suggestions: ${a.suggestions?.length}`);
  console.log('');
  console.log(`Model ${MODEL_B}:  Score ${b.score}/10`);
  console.log(`  Title: ${b.title}`);
  console.log(`  Summary: ${b.summary}`);
  console.log(`  Bugs: ${b.bugs?.length}  Suggestions: ${b.suggestions?.length}`);
  console.log('');

  const winner = (a.score || 0) >= (b.score || 0) ? MODEL_A : MODEL_B;
  const margin = Math.abs((a.score || 0) - (b.score || 0));
  console.log(`${winner} wins${margin > 0 ? ` by ${margin} point${margin > 1 ? 's' : ''}` : ' (tie)'}`);
}

run().catch(console.error);
