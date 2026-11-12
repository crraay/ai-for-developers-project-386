import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('close', () => resolve());
  });
}

export default async function globalTeardown() {
  await run('docker', ['compose', 'down', '-v']);
}
