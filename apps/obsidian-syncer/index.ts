#!/usr/bin/env bun
import { $ } from 'bun';

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || '/vault';
const AUTH_TOKEN = process.env.OBSIDIAN_AUTH_TOKEN;
const CONTINUOUS = process.env.OBSIDIAN_CONTINUOUS === 'true';
const SYNC_OPTS = process.env.OBSIDIAN_SYNC_OPTS || '';

if (!AUTH_TOKEN) {
  console.error('ERROR: OBSIDIAN_AUTH_TOKEN environment variable is required');
  process.exit(1);
}

let command = `ob sync --path ${VAULT_PATH}`;

if (CONTINUOUS) {
  command += ' --continuous';
}

if (SYNC_OPTS) {
  command += ` ${SYNC_OPTS}`;
}

console.log(`Starting Obsidian sync for vault at: ${VAULT_PATH}`);
console.log(`Command: ${command}`);

const result = await $`${command}`;
const exitCode = result.exitCode;

if (exitCode !== 0) {
  console.error('Sync failed with exit code:', exitCode);
  process.exit(exitCode);
}

console.log('Sync completed successfully');
