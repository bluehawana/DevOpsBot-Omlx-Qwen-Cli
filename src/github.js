import { execSync } from 'child_process';
import { loadConfig } from './config.js';

export function execGit(cmd, cwd = undefined) {
  try {
    const out = execSync(cmd, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString().trim();
    return { ok: true, output: out };
  } catch (err) {
    return { ok: false, error: err.message, stderr: err.stderr?.toString() };
  }
}

export async function cloneConfigRepo() {
  const config = loadConfig();
  const { repo } = config.github;

  const workDir = `${loadConfig().skills.syncDir}..config`;
  const exists = execSync(`test -d ${workDir} && echo yes || echo no`, { encoding: 'utf-8' }).trim() === 'yes';

  if (exists) {
    const result = execGit('git pull', workDir);
    console.log(result.ok ? 'Config repo pulled.' : `Pull failed: ${result.error}`);
  } else {
    execSync(`git clone ${repo} ${workDir}`, { stdio: 'inherit' });
    console.log('Config repo cloned.');
  }

  return workDir;
}

export async function cloneSkillsRepo() {
  const config = loadConfig();
  const { skillsRepo } = config.github;
  const dir = config.skills.syncDir;

  const exists = execSync(`test -d ${dir} && echo yes || echo no`, { encoding: 'utf-8' }).trim() === 'yes';

  if (exists) {
    const result = execGit('git pull', dir);
    console.log(result.ok ? 'Skills repo pulled.' : `Pull failed: ${result.error}`);
  } else {
    execSync(`git clone ${skillsRepo} ${dir}`, { stdio: 'inherit' });
    console.log('Skills repo cloned.');
  }

  return dir;
}

export function listRemoteRepos() {
  const config = loadConfig();
  return [
    { name: 'Config', url: config.github.repo },
    { name: 'Skills', url: config.github.skillsRepo },
  ];
}

export function isGitAvailable() {
  try {
    execSync('git --version');
    return true;
  } catch {
    return false;
  }
}

export function isSSHKeyPresent() {
  try {
    execSync('ssh -T git@github.com 2>&1 || true', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
