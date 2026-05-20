import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '.devopsbot');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

// `provider` selects the LLM backend used for code review:
//   - "omlx"    → local oMLX on MacBook M5 (default for the `local-omlx` branch)
//   - "ollama"  → company Mac Studios running Ollama (default for the `company-ollama` branch)
// Can be overridden by DEVOPSBOT_PROVIDER env var or by .devopsbot/config.yaml.
const DEFAULT_CONFIG = {
  provider: 'omlx',
  github: {
    repo: 'git@github.com:volvo-group/devopsbot-config.git',
    branch: 'main',
    skillsRepo: 'git@github.com:volvo-group/devopsbot-skills.git',
  },
  // Company Mac Studios — fill in the BMC hostnames in .devopsbot/config.yaml
  // Format: BMC-F59GQX45NH.got.<corporate-domain>
  macStudios: [
    { name: 'Mac Studio 1', host: 'BMC-F59GQX45NH.got.volvo.net', user: 'harvad', port: 22 },
    { name: 'Mac Studio 2', host: 'BMC-F59GQX45NJ.got.volvo.net', user: 'harvad', port: 22 },
  ],
  ollama: {
    // Default Ollama host — points at localhost; in company env this is
    // typically the first Mac Studio. Failover to second studio is handled in llm-provider.js.
    host: 'http://localhost:11434',
    model: 'llama3.3',
  },
  omlx: {
    host: 'http://localhost:8000',
    model: 'Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated-mlx-8bit',
    apiKey: process.env.DEVOPSBOT_OMLX_API_KEY || 'omlx-a4qtcnh7r8e9p8vt',
  },
  copilot: {
    enabled: true,
    licenseType: 'business', // from Microsoft
  },
  skills: {
    syncDir: join(CONFIG_DIR, 'skills'),
    versionControl: true,
  },
};

export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  const userConfig = yaml.parse(raw);

  return mergeDeep(DEFAULT_CONFIG, userConfig);
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, yaml.stringify(config));
}

export function getSkillsPath() {
  return loadConfig().skills.syncDir;
}

export function getConfigFile() {
  return CONFIG_FILE;
}

function mergeDeep(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    // Arrays replace wholesale — user can't accidentally inherit half a default array
    if (Array.isArray(sv)) {
      output[key] = sv;
    } else if (sv !== null && typeof sv === 'object' && key in target && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      output[key] = mergeDeep(target[key], sv);
    } else {
      output[key] = sv;
    }
  }
  return output;
}
