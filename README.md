# DevOpsBot CLI

DevOpsBot is a CLI tool that connects Ollama, your company GitHub (Volvo Group), and two Mac Studios for automated dev operations.

## Features

- **Ollama Integration**: Connects to locally installed Ollama for AI capabilities
- **Company GitHub Sync**: Pulls/pushes configuration, skills, and dev artifacts to the Volvo Group company GitHub repo
- **Mac Studio Connection**: SSH to your two Mac Studios (ip1, ip2) from the CLI
- **GitHub Copilot Support**: Leverages existing Microsoft Copilot licenses for enhanced development
- **Skills Management**: Version-controlled skill definitions stored in the company GitHub repo

## Prerequisites

- Node.js >= 18
- Ollama installed and running (`ollama serve`)
- SSH access configured to both Mac Studios
- Company GitHub credentials

## Installation

```bash
npm install
npm run setup
```

## Usage

```bash
devopsbot            # Show status of all connections
devopsbot setup      # Configure GitHub and Mac Studio connections
devopsbot connect    # Connect to a Mac Studio
devopsbot pull       # Pull latest config/skills from company GitHub
```

## Configuration

Create a `.devopsbot` config file or use the interactive setup wizard.

## Mac Studios

| Machine | IP Address |
|---------|------------|
| Mac Studio 1 | ip1 |
| Mac Studio 2 | ip2 |

## License

MIT
