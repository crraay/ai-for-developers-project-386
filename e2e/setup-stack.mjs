import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const BACKEND_URL = 'http://localhost:8080/api/ping';
const FRONTEND_URL = 'http://localhost:4200';
const BACKEND_TIMEOUT_MS = 120_000;
const FRONTEND_TIMEOUT_MS = 120_000;

async function waitFor(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry after a short pause.
    }
    await setTimeout(1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`"${command} ${args.join(' ')}" exited with code ${code}`));
      }
    });
  });
}

async function shutdown() {
  try {
    await run('docker', ['compose', 'down', '-v']);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await run('docker', ['compose', 'up', '--build', '-d']);

try {
  await waitFor(BACKEND_URL, BACKEND_TIMEOUT_MS);
  await waitFor(FRONTEND_URL, FRONTEND_TIMEOUT_MS);
} catch (error) {
  await shutdown();
  throw error;
}

// Keep the process alive so Playwright can tear the stack down via SIGTERM.
setInterval(() => {}, 60_000);
