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

program.parse(process.argv);

// Default to status if no command
if (process.argv.length === 2) {
  await (import('./cli.js'));
  const { default: CliModule } = await import('./cli.js');
}
