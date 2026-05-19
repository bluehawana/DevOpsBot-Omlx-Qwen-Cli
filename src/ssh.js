import { Client } from 'ssh2';
import { exec } from 'child_process';
import { loadConfig } from './config.js';

export function connectToMacStudio(index, interactive = false) {
  const config = loadConfig();
  const studio = config.macStudios[index];

  if (!studio) {
    console.error(`Mac Studio #${index} not found.`);
    return;
  }

  const connStr = `${studio.user}@${studio.host}:${studio.port}`;

  if (interactive) {
    // For now, just print the command so user can copy/paste
    console.log(`Connect to ${studio.name} (${studio.host})`);
    console.log(`  ssh ${connStr}`);
    console.log('');

    // Try an SSH test connection
    exec(`ssh -o ConnectTimeout=5 -o BatchMode=yes ${connStr} 'echo "Connected to ${studio.name}"' 2>/dev/null`, {
      stdio: 'inherit',
    });
  } else {
    // Programmatic connection
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`Connected to ${studio.name} (${studio.host})`);
      conn.exec('uname -a', (err, stream) => {
        if (err) console.error(err);
        stream.on('close', () => conn.end());
      });
    });
    conn.on('error', (err) => {
      console.error(`Failed to connect to ${studio.name}: ${err.message}`);
    });
    conn.connect({
      host: studio.host,
      port: studio.port,
      username: studio.user,
    });
  }
}

export async function listMacStudios() {
  const config = loadConfig();
  const studios = Array.isArray(config.macStudios) ? config.macStudios : [];
  return studios.map((s, i) => ({
    index: i,
    name: s.name,
    host: s.host,
    user: s.user,
    port: s.port,
  }));
}
