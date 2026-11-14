import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const BACKEND_URL = 'http://localhost:8080/api/ping';
const FRONTEND_URL = 'http://localhost:5173';
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

export default async function globalSetup() {
  await run('docker', ['compose', 'up', '--build', '-d']);

  try {
    await waitFor(BACKEND_URL, BACKEND_TIMEOUT_MS);
    await waitFor(FRONTEND_URL, FRONTEND_TIMEOUT_MS);
  } catch (error) {
    await run('docker', ['compose', 'down', '-v']);
    throw error;
  }
}
