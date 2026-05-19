# DevOpsBot Project Guide

## Project Overview
- CLI tool connecting Ollama, Volvo Group company GitHub, and 2 Mac Studios
- Node.js/ESM project, CLI entry point at `src/cli.js`
- Main deps: ollama, ssh2, yaml, commander, inquirer, ora, chalk

## Config
- `.devopsbot/` folder for config (GitHub URL, Mac Studio IPs, credentials)
- YAML-based config files

## Key IPs
- Mac Studio 1: ip1
- Mac Studio 2: ip2

## Development
```bash
npm install
node src/cli.js
node src/cli.js setup   # interactive setup
```
