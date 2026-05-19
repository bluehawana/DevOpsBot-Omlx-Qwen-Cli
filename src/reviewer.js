import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { generate as llmGenerate, ping as llmPing, getProviderInfo } from './llm-provider.js';

// --- File Discovery ---

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.venv', 'venv'];
const CODE_EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.rb', '.sh', '.yaml', '.yml', '.json', '.toml', '.html', '.css', '.vue', '.svelte', '.md'];

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        files.push(...walkDir(path));
      }
    } else if (CODE_EXTS.includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

export function findCodeFiles(rootDir) {
  const dir = rootDir || '.';
  return walkDir(dir);
}

// --- File Content ---

export function readFiles(paths) {
  const contents = {};
  for (const p of paths) {
    try {
      const abs = p.startsWith('/') ? p : join(process.cwd(), p);
      contents[abs] = readFileSync(abs, 'utf-8');
    } catch { /* skip unreadable */ }
  }
  return contents;
}

function fileToRelative(paths) {
  const cwd = process.cwd();
  const result = {};
  for (const [abs, content] of Object.entries(paths)) {
    const rel = relative(cwd, abs);
    result[rel] = content;
  }
  return result;
}

// --- Diff Parsing ---

export function getDiffs(base, head) {
  const options = base ? ` ${base}..${head}` : '';
  try {
    const diff = execSync(`git diff --stat ${options}`, { encoding: 'utf-8' });
    const files = {};
    for (const line of diff.trim().split('\n')) {
      const match = line.match(/(.+?)\s+\|\s+(\d+)/);
      if (match) {
        files[match[1]] = parseInt(match[2], 10);
      }
    }
    return { files, ok: true };
  } catch (err) {
    return { files: {}, ok: false, error: err.message };
  }
}

export function getFileDiff(base, file) {
  try {
    const opt = base ? `${base} -- ` : '';
    return execSync(`git diff ${opt} -- "${file}"`, { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

export function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function getUnstagedFiles() {
  try {
    const out = execSync('git diff --name-only', { encoding: 'utf-8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function getPRNumber() {
  try {
    const out = execSync('git branch --show-current', { encoding: 'utf-8' });
    const match = out.match(/(?:pr|pull|issue|PR|Issue)\/(\d+)/i) || out.match(/#(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

// --- Ollama Review Engine ---

const CODE_AUDIT_PROMPT = `You are a senior code reviewer. Analyze the provided code and return a JSON object with:

- title: one-line summary (max 80 chars)
- summary: 2-3 sentence overview of what the code does
- score: 1-10 based on overall quality
- bugs: array of strings describing potential bugs (limit 10, be concise)
- suggestions: array of strings with improvement suggestions (limit 10)
- style: array of strings with style/naming/lint suggestions (limit 10)
- security: array of strings about potential security issues (empty array if none)
- categories: array of objects with {category, severity, title, body}
- overall: brief 2-3 sentence overall assessment
- fileCount: number of files analyzed
- code: the code being reviewed, using precise and concise language

Return only the JSON object, no markdown formatting. Each array item should be a single sentence. Be specific and actionable.`;

const SUMMARY_PROMPT = `You are a senior developer. Given the following code changes, provide a concise PR description:

- Brief summary of what changed
- List of changed files
- 2-3 key points about the changes
- Any breaking changes or important notes

Return only the text, no JSON. Be concise and technical.`;

const ANALYSIS_PROMPT = `You are a senior code analyst. Analyze this codebase and return a JSON object:

- total_files: number
- total_lines: number
- file_types: array of {extension, count}
- average_file_size: number (bytes)
- largest_file: {name, lines}
- complexity_indicators: array of strings (e.g., "Large files detected", "Deep nesting in X")
- patterns_detected: array of strings (e.g., "CommonJS detected", "Missing error handling")
- issues: array of {type, file, line, severity, message}
- strengths: array of strings
- recommendations: array of strings

Return only JSON, no markdown.`;

export async function reviewCode(files, model) {
  const rel = fileToRelative(files);
  const body = Object.entries(rel).map(([path, content]) => `=== ${path} ===\n${content}`).join('\n\n');
  const prompt = `${CODE_AUDIT_PROMPT}\n\n---\n${body}`;

  try {
    const response = await llmGenerate(prompt, model);
    return parseJSON(response);
  } catch (err) {
    const info = getProviderInfo();
    console.error(`LLM error (${info.provider} @ ${info.host}):`, err.message);
    return { error: err.message };
  }
}

export async function generatePRSummary(model) {
  const diffs = getDiffs();
  if (diffs.ok && Object.keys(diffs.files).length > 0) {
    const body = Object.entries(diffs.files).map(([file]) => getFileDiff('', file)).join('\n\n');
    const prompt = `${SUMMARY_PROMPT}\n\n---\n${body}`;
    try {
      const response = await llmGenerate(prompt, model);
      return response.trim();
    } catch (err) {
      return `Error generating summary: ${err.message}`;
    }
  } else {
    return 'No tracked changes to summarize.';
  }
}

export async function analyzeCodebase(rootDir, model) {
  const files = findCodeFiles(rootDir);
  let totalLines = 0;
  let largest = { name: '', lines: 0 };
  const typeCount = {};

  for (const f of files) {
    const content = readFileSync(f, 'utf-8');
    const lines = content.split('\n').length;
    totalLines += lines;
    const rel = relative(rootDir || '.', f);
    if (lines > largest.lines) {
      largest = { name: rel, lines };
    }
    const ext = extname(f) || 'no-ext';
    typeCount[ext] = (typeCount[ext] || 0) + 1;
  }

  const body = Object.entries(fileToRelative(files)).map(([path, content]) => `=== ${path} ===\n${content}`).join('\n\n');
  const prompt = `${ANALYSIS_PROMPT}\n\n---\n${body}`;

  try {
    const response = await llmGenerate(prompt, model);
    return {
      stats: {
        total_files: files.length,
        total_lines: totalLines,
        file_types: Object.entries(typeCount).map(([ext, count]) => ({ extension: ext, count })),
        average_file_size: Math.round(totalLines / files.length),
        largest_file: largest,
      },
      analysis: parseJSON(response),
    };
  } catch (err) {
    return {
      stats: {
        total_files: files.length,
        total_lines: totalLines,
        file_types: Object.entries(typeCount).map(([ext, count]) => ({ extension: ext, count })),
        average_file_size: Math.round(totalLines / files.length),
        largest_file: largest,
      },
      analysis: { error: err.message },
    };
  }
}

// --- Helpers ---

function parseJSON(text) {
  // If already an object (e.g., from reviewCode's result), return it as-is
  if (typeof text === 'object' && text !== null) return text;

  const textStr = String(text);
  const jsonMatch = textStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return { error: textStr };
    }
  }
  return { error: textStr };
}

export { CODE_AUDIT_PROMPT, SUMMARY_PROMPT, ANALYSIS_PROMPT, parseJSON, fileToRelative };
