#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkOllama, listModels } from './ollama.js';
import { cloneConfigRepo, cloneSkillsRepo, listRemoteRepos, isGitAvailable } from './github.js';
import { connectToMacStudio, listMacStudios } from './ssh.js';
import { loadConfig, saveConfig } from './config.js';

const program = new Command();

program
  .name('devopsbot')
  .description('DevOpsBot CLI - Ollama + Company GitHub + Mac Studios')
  .version('0.1.0');

program
  .command('status')
  .description('Show status of all connections')
  .action(async () => {
    const config = loadConfig();

    console.log(chalk.bold('\n═══ DevOpsBot Status ═══\n'));

    // Ollama
    const spinner = ora('Checking Ollama...').start();
    const ollamaStatus = await checkOllama();
    spinner.stop();
    console.log(chalk[ollamaStatus.ok ? 'green' : 'red'](
      `  Ollama:      ${ollamaStatus.ok ? '✓ Connected' : '✗ Disconnected'}`
    ));
    if (ollamaStatus.ok) {
      console.log(chalk.dim(`    Model: ${ollamaStatus.model}`));
      console.log(chalk.dim(`    Endpoint: ${config.ollama.host}`));
    }

    // GitHub
    const gitOk = isGitAvailable();
    console.log(chalk[gitOk ? 'green' : 'yellow'](
      `  GitHub:      ${gitOk ? '✓ Connected' : '✗ Not configured'}`
    ));
    if (gitOk) {
      for (const repo of listRemoteRepos()) {
        console.log(chalk.dim(`    ${repo.name}: ${repo.url}`));
      }
    }

    // Mac Studios
    const studios = await listMacStudios();
    console.log(chalk.bold('\n  Mac Studios:'));
    for (const studio of studios) {
      console.log(chalk.cyan(`    #${studio.index}: ${studio.name} (${studio.host}:${studio.port})`));
    }

    // Copilot
    console.log(chalk.dim(`  Copilot:     ${config.copilot.enabled ? '✓ Enabled' : 'Disabled'}`));
    console.log('');
  });

program
  .command('setup')
  .description('Interactive setup for Ollama, GitHub, and Mac Studios')
  .action(async () => {
    const inquirer = (await import('inquirer')).default;

    console.log(chalk.bold('\n═══ DevOpsBot Setup ═══\n'));

    // Ollama
    const ollamaOk = await checkOllama();
    if (!ollamaOk.ok) {
      console.log(chalk.yellow('Ollama not detected. Make sure `ollama serve` is running.'));
      console.log('Start with: ollama serve');
    } else {
      console.log(chalk.green(`Ollama is running with model: ${ollamaOk.model}`));
    }

    // Git
    if (!isGitAvailable()) {
      console.log(chalk.yellow('Git not found. Please install Git.'));
    }

    // Config
    const { configPath } = await inquirer.prompt({
      name: 'configPath',
      message: 'Path to config directory:',
      default: '.devopsbot',
    });

    const config = loadConfig();
    config.github.repo = (await inquirer.prompt([{
      name: 'repo',
      message: 'Company GitHub repo (config):',
      default: config.github.repo,
    }])).repo;
    config.github.skillsRepo = (await inquirer.prompt([{
      name: 'skillsRepo',
      message: 'Skills GitHub repo:',
      default: config.github.skillsRepo,
    }])).skillsRepo;

    // Update Mac Studios
    for (let i = 0; i < config.macStudios.length; i++) {
      const studio = config.macStudios[i];
      const answers = await inquirer.prompt([
        { name: 'host', message: `${studio.name} IP address:`, default: studio.host },
        { name: 'user', message: `${studio.name} username:`, default: studio.user },
      ]);
      studio.host = answers.host;
      studio.user = answers.user;
    }

    saveConfig(config);
    console.log(chalk.green('\nConfig saved!'));

    // Pull repos
    console.log('\nPulling repos...');
    await cloneConfigRepo();
    await cloneSkillsRepo();
    console.log(chalk.green('\nSetup complete!'));
  });

program
  .command('connect')
  .description('Connect to a Mac Studio')
  .argument('[index]', 'Studio index (0 or 1)', '0')
  .action(async (index) => {
    const studios = await listMacStudios();
    const i = parseInt(index, 10);

    if (isNaN(i) || i >= studios.length) {
      console.log(chalk.yellow('\nAvailable studios:'));
      for (const s of studios) {
        console.log(chalk.cyan(`  #${s.index}: ${s.name} (${s.host})`));
      }
      return;
    }

    connectToMacStudio(i, true);
  });

program
  .command('pull')
  .description('Pull latest from company GitHub (config + skills)')
  .action(async () => {
    console.log(chalk.bold('\n═══ Pulling from Company GitHub ═══\n'));
    await cloneConfigRepo();
    await cloneSkillsRepo();
    console.log(chalk.green('\nPull complete.'));
  });

program
  .command('list-models')
  .description('List available Ollama models')
  .action(async () => {
    const models = await listModels();
    console.log(chalk.bold('\n═══ Ollama Models ═══\n'));
    for (const m of models) {
      console.log(chalk.cyan(`  ${m.name}`));
      console.log(chalk.dim(`    Size: ${m.size}  Modified: ${m.modified}`));
    }
    console.log('');
  });

// --- Review Commands ---

program
  .command('review')
  .description('Code review with Ollama')
  .argument('[files...]', 'Files to review (default: current changes)')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (files, opts) => {
    const { reviewCode, getDiffs, getStagedFiles, getFileDiff, readFiles } = await import('./reviewer.js');

    let filesToReview;

    if (files && files.length > 0) {
      filesToReview = readFiles(files);
    } else {
      // Review current changes
      const diffs = getDiffs();
      if (diffs.ok && Object.keys(diffs.files).length > 0) {
        filesToReview = {};
        for (const file of Object.keys(diffs.files)) {
          filesToReview[file] = getFileDiff('', file);
        }
      } else {
        const staged = getStagedFiles();
        if (staged.length > 0) {
          filesToReview = readFiles(staged);
        } else {
          const unstage = getUnstagedFiles();
          filesToReview = readFiles(unstage);
        }
      }
    }

    if (!filesToReview || Object.keys(filesToReview).length === 0) {
      console.log(chalk.yellow('\nNo files to review.'));
      return;
    }

    const spinner = ora('Reviewing code...').start();
    const result = await reviewCode(filesToReview, opts.model);
    spinner.stop();

    // --- Output ---
    console.log(chalk.bold('\n═══ Code Review ═══\n'));
    console.log(chalk.cyan(`  ${result.title}`));
    console.log(chalk.dim(`  ${result.summary}\n`));

    const score = result.score || '—';
    const scoreColor = result.score >= 8 ? 'green' : result.score >= 6 ? 'yellow' : 'red';
    console.log(chalk.bold(chalk[scoreColor](`  Score: ${score}/10`)));

    if (result.bugs?.length) {
      console.log(chalk.red('  Bugs:'));
      for (const b of result.bugs) console.log(chalk.red(`    ⛔ ${b}`));
      console.log('');
    }

    if (result.suggestions?.length) {
      console.log(chalk.blue('  Suggestions:'));
      for (const s of result.suggestions) console.log(chalk.blue(`    💡 ${s}`));
      console.log('');
    }

    if (result.security?.length) {
      console.log(chalk.yellow('  Security:'));
      for (const s of result.security) console.log(chalk.yellow(`    ⚠️  ${s}`));
      console.log('');
    }

    if (result.categories?.length) {
      console.log(chalk.magenta('  Categories:'));
      for (const c of result.categories) {
        const sev = c.severity === 'high' ? chalk.red(c.severity.toUpperCase()) :
                    c.severity === 'medium' ? chalk.yellow(c.severity.toUpperCase()) :
                    chalk.dim(c.severity.toUpperCase());
        console.log(`    [${sev}] ${c.title}`);
        if (c.body) console.log(chalk.dim(`      ${c.body}`));
      }
      console.log('');
    }

    if (result.overall) {
      console.log(chalk.bold('  Overall:'));
      console.log(chalk.dim(`  ${result.overall}\n`));
    }
  });

program
  .command('review:staged')
  .description('Review staged changes')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (opts) => {
    const { reviewCode, getStagedFiles, readFiles } = await import('./reviewer.js');
    const files = getStagedFiles();
    if (!files.length) { console.log(chalk.yellow('\nNo staged changes.')); return; }
    const spinner = ora('Reviewing staged files...').start();
    const result = await reviewCode(readFiles(files), opts.model);
    spinner.stop();
    console.log(chalk.bold('\n═══ Staged Changes Review ═══\n'));
    console.log(chalk.cyan(`  ${result.title}`));
    console.log(chalk.dim(`  ${result.summary}\n`));
    console.log(chalk.bold(chalk[result.score >= 8 ? 'green' : 'yellow'](`  Score: ${result.score}/10`)));
  });

program
  .command('review:github')
  .description('Review a GitHub PR')
  .argument('[PR#]', 'Pull request number (default: current branch)')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (pr, opts) => {
    const { reviewCode, getDiffs, getFileDiff } = await import('./reviewer.js');
    const prNum = parseInt(pr, 10) || getPRNumber();
    const url = prNum ? `pull/${prNum}/files` : 'files';
    const spinner = ora('Fetching PR data...').start();

    try {
      const raw = execSync(`gh pr view ${prNum} --json title,body,headRepositoryOwner,url 2>/dev/null`, { encoding: 'utf-8' });
      spinner.succeed(`PR #${prNum}: ${raw.trim()}`);
    } catch {
      spinner.fail('Could not fetch PR. Is gh CLI installed?');
    }

    spinner.start('Reviewing PR changes...');
    const diffs = getDiffs('origin/main');
    const files = {};
    for (const file of Object.keys(diffs.files)) {
      files[file] = getFileDiff('', file);
    }
    const result = await reviewCode(files, opts.model);
    spinner.stop();

    console.log(chalk.bold('\n═══ GitHub PR Review ═══\n'));
    console.log(chalk.cyan(`  ${result.title}`));
    console.log(chalk.dim(`  ${result.summary}\n`));
    console.log(chalk.bold(chalk[result.score >= 8 ? 'green' : 'yellow'](`  Score: ${result.score}/10`)));
  });

program
  .command('analyze')
  .description('Deep codebase analysis')
  .argument('[dir]', 'Directory to analyze')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (dir, opts) => {
    const { analyzeCode } = await import('./reviewer.js');
    const spinner = ora('Analyzing codebase...').start();
    const result = await analyzeCode(dir, opts.model);
    spinner.stop();

    console.log(chalk.bold('\n═══ Codebase Analysis ═══\n'));
    const s = result.stats;
    console.log(chalk.cyan(`  Files: ${s.total_files}  Lines: ${s.total_lines}`));
    console.log(chalk.dim(`  Avg size: ${s.average_file_size} lines  Largest: ${s.largest_file.name} (${s.largest_file.lines} lines)`));
    console.log('');
    console.log(chalk.bold('  File types:'));
    for (const t of s.file_types) console.log(chalk.dim(`    ${t.extension}: ${t.count}`));
    console.log('');

    if (result.analysis.issues?.length) {
      console.log(chalk.red('  Issues:'));
      for (const i of result.analysis.issues) console.log(chalk.red(`    [${i.severity}] ${i.file}: ${i.message}`));
      console.log('');
    }

    if (result.analysis.recommendations?.length) {
      console.log(chalk.blue('  Recommendations:'));
      for (const r of result.analysis.recommendations) console.log(chalk.blue(`    • ${r}`));
      console.log('');
    }
  });

program
  .command('summary')
  .description('Generate PR summary from current changes')
  .option('-m, --model <model>', 'Ollama model to use')
  .action(async (opts) => {
    const { generatePRSummary } = await import('./reviewer.js');
    const spinner = ora('Generating summary...').start();
    const text = await generatePRSummary(opts.model);
    spinner.stop();
    console.log(chalk.bold('\n═══ PR Summary ═══\n'));
    console.log(text);
    console.log('');
  });

program.parse(process.argv);

// Default to status if no command
if (process.argv.length === 2) {
  await (import('./cli.js'));
  const { default: CliModule } = await import('./cli.js');
}

// Default to status if no command
if (process.argv.length === 2) {
  await (import('./cli.js'));
  const { default: CliModule } = await import('./cli.js');
}
