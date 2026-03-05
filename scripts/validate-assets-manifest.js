#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'public', 'assets', 'manifest.json');

function fail(message) {
  console.error(`[manifest] ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse JSON at ${filePath}: ${error.message}`);
    return null;
  }
}

function checkCaseSensitivePath(root, relPath) {
  const parts = relPath.split('/').filter(Boolean);
  let current = root;
  const traversed = [];

  for (const part of parts) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) {
      return { ok: false, reason: `Missing directory: ${current}` };
    }
    const entries = fs.readdirSync(current);
    if (!entries.includes(part)) {
      const lower = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
      const currentPath = path.join(...traversed, part);
      if (lower) {
        return {
          ok: false,
          reason: `Case mismatch for "${currentPath}" (found "${lower}")`,
        };
      }
      return { ok: false, reason: `Missing path segment "${currentPath}"` };
    }
    traversed.push(part);
    current = path.join(current, part);
  }

  if (!fs.existsSync(current)) {
    return { ok: false, reason: `Path not found: ${relPath}` };
  }
  if (!fs.statSync(current).isFile()) {
    return { ok: false, reason: `Not a file: ${relPath}` };
  }
  return { ok: true };
}

function parseGlbJson(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 20) return null;
  if (buf.toString('utf8', 0, 4) !== 'glTF') return null;
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  // 0x4E4F534A = 'JSON' little-endian
  if (jsonChunkType !== 0x4E4F534A) return null;
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  if (jsonEnd > buf.length) return null;
  try {
    return JSON.parse(buf.toString('utf8', jsonStart, jsonEnd));
  } catch {
    return null;
  }
}

const manifest = readJson(manifestPath);
if (!manifest) {
  process.exit(1);
}

const models = Array.isArray(manifest.models) ? manifest.models : [];
const roles = manifest.roles && typeof manifest.roles === 'object' ? manifest.roles : {};
const modelIds = new Set();

for (const model of models) {
  if (!model || typeof model !== 'object') {
    fail('Invalid model entry (expected object)');
    continue;
  }
  if (typeof model.id !== 'string' || !model.id) {
    fail('Model entry missing "id"');
    continue;
  }
  if (modelIds.has(model.id)) {
    fail(`Duplicate model id "${model.id}"`);
    continue;
  }
  modelIds.add(model.id);

  if (typeof model.path !== 'string' || !model.path) {
    fail(`Model "${model.id}" missing "path"`);
    continue;
  }
  if (path.isAbsolute(model.path)) {
    fail(`Model "${model.id}" path must be relative: ${model.path}`);
    continue;
  }

  const check = checkCaseSensitivePath(path.join(repoRoot, 'public'), model.path);
  if (!check.ok) {
    fail(`Model "${model.id}" invalid path "${model.path}": ${check.reason}`);
    continue;
  }

  if (model.path.toLowerCase().endsWith('.glb')) {
    const absoluteModelPath = path.join(repoRoot, 'public', model.path);
    const glbJson = parseGlbJson(absoluteModelPath);
    const images = Array.isArray(glbJson?.images) ? glbJson.images : [];
    for (const img of images) {
      if (!img || typeof img.uri !== 'string' || !img.uri || img.uri.startsWith('data:')) continue;
      const relTexturePath = path.posix.normalize(path.posix.join(path.posix.dirname(model.path), img.uri));
      const textureCheck = checkCaseSensitivePath(path.join(repoRoot, 'public'), relTexturePath);
      if (!textureCheck.ok) {
        fail(
          `Model "${model.id}" references missing texture "${img.uri}" -> "${relTexturePath}": ${textureCheck.reason}`,
        );
      }
    }
  }
}

for (const [roleName, value] of Object.entries(roles)) {
  const ids = Array.isArray(value) ? value : [value];
  for (const id of ids) {
    if (typeof id !== 'string' || !id) {
      fail(`Role "${roleName}" contains invalid model id value`);
      continue;
    }
    if (!modelIds.has(id)) {
      fail(`Role "${roleName}" references unknown model id "${id}"`);
    }
  }
}

if (!process.exitCode) {
  console.log('[manifest] OK');
}
