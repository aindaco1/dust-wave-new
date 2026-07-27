import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const generatedDirectories = ['dev', 'docs'];
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const signalExitCodes = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143
};

let serverProcess;
let requestedSignal;
let forceKillTimer;

async function cleanGeneratedDirectories() {
  await Promise.all(generatedDirectories.map(async (directory) => {
    const outputPath = path.join(projectRoot, directory);
    await rm(outputPath, { recursive: true, force: true });
    await mkdir(outputPath, { recursive: true });
  }));

  console.log('\nCleaned generated output: dev/ and docs/');
}

function signalServer(signal) {
  if (!serverProcess?.pid) return;

  try {
    if (process.platform === 'win32') {
      serverProcess.kill(signal);
    } else {
      // The detached child owns a process group containing concurrently,
      // Eleventy, and the Gulp asset watcher, so one signal shuts down the full server.
      process.kill(-serverProcess.pid, signal);
    }
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

function handleShutdownSignal(signal) {
  if (requestedSignal) {
    signalServer('SIGKILL');
    return;
  }

  requestedSignal = signal;
  console.log(`\nStopping local server (${signal})...`);
  signalServer(signal);

  forceKillTimer = setTimeout(() => signalServer('SIGKILL'), 5_000);
  forceKillTimer.unref();
}

for (const signal of Object.keys(signalExitCodes)) {
  process.on(signal, () => handleShutdownSignal(signal));
}

let exitCode = 1;

try {
  serverProcess = spawn(npmCommand, ['run', 'watch:server'], {
    cwd: projectRoot,
    detached: process.platform !== 'win32',
    stdio: 'inherit'
  });

  const result = await new Promise((resolve) => {
    serverProcess.once('error', (error) => resolve({ error }));
    serverProcess.once('close', (code, signal) => resolve({ code, signal }));
  });

  if (result.error) {
    console.error(`Unable to start the local server: ${result.error.message}`);
  } else if (requestedSignal) {
    exitCode = signalExitCodes[requestedSignal] ?? 1;
  } else if (result.signal) {
    exitCode = signalExitCodes[result.signal] ?? 1;
  } else {
    exitCode = result.code ?? 1;
  }
} finally {
  clearTimeout(forceKillTimer);

  try {
    await cleanGeneratedDirectories();
  } catch (error) {
    console.error(`Failed to clean generated output: ${error.message}`);
    exitCode = 1;
  }
}

process.exitCode = exitCode;
