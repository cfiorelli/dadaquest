#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const sourceExtensions = new Set(['.js', '.mjs']);
const approvedFiles = new Set([
  'src/web3d/render/renderPolicy.js',
]);
const legacyExceptions = new Set([
  'src/web3d/player/babyVisual.js',
  'src/web3d/world/characters.js',
  'src/web3d/world/cutouts.js',
  'src/web3d/world/buildEraAdventureWorld.js',
  'src/web3d/world/buildWorld.js',
  'src/web3d/world/buildWorld2.js',
  'src/web3d/world/buildWorld3.js',
  'src/web3d/world/buildWorld4.js',
]);
const forbiddenKeys = [
  'renderingGroupId',
  'alphaIndex',
  'needDepthPrePass',
  'forceDepthWrite',
  'disableDepthWrite',
  'transparencyMode',
  'backFaceCulling',
];
const assignmentPattern = new RegExp(`\\b(${forbiddenKeys.join('|')})\\b\\s*(?::|=)`, 'g');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, files);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    files.push(abs);
  }
  return files;
}

const files = walk(srcRoot);
const violations = [];

for (const absolutePath of files) {
  const relativePath = path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');
  if (approvedFiles.has(relativePath) || legacyExceptions.has(relativePath)) continue;
  const stripped = stripComments(fs.readFileSync(absolutePath, 'utf8'));
  const lines = stripped.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    assignmentPattern.lastIndex = 0;
    const line = lines[index];
    const match = assignmentPattern.exec(line);
    if (!match) continue;
    violations.push({
      file: relativePath,
      line: index + 1,
      key: match[1],
      text: line.trim(),
    });
  }
}

if (violations.length > 0) {
  console.error('[render-policy] Direct render-property assignment is forbidden outside the central policy module.');
  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line} (${violation.key}) ${violation.text}`);
  }
  console.error('[render-policy] Allowed legacy exception files:');
  for (const file of legacyExceptions) console.error(`   - ${file}`);
  process.exit(1);
}

console.log('[render-policy] OK');
