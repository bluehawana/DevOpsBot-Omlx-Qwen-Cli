import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '.devopsbot');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

const DEFAULT_CONFIG = {
  github: {
    repo: 'git@github.com:volvo-group/devopsbot-config.git',
    branch: 'main',
    skillsRepo: 'git@github.com:volvo-group/devopsbot-skills.git',
  },
  macStudios: [
    { name: 'Mac Studio 1', host: 'ip1', user: 'harvad', port: 22 },
    { name: 'Mac Studio 2', host: 'ip2', user: 'harvad', port: 22 },
  ],
  ollama: {
    host: 'http://localhost:11434',
    model: 'llama3.3',
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
  const yaml = require('yaml');
  const userConfig = yaml.parse(raw);

  return mergeDeep(DEFAULT_CONFIG, userConfig);
}

export function saveConfig(config) {
  const yaml = require('yaml');
  if (!existsSync(CONFIG_DIR)) {
    require('fs').mkdirSync(CONFIG_DIR, { recursive: true });
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
    if (source[key] instanceof Object && key in target) {
      output[key] = mergeDeep(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}
