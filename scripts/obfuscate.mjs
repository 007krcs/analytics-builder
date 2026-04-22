/**
 * Post-build obfuscation script.
 * Reads compiled JS files from dist/ and rewrites them with identifier
 * mangling + string-array encoding so the implementation is not readable
 * from the published npm package.
 *
 * Usage: node ../../scripts/obfuscate.mjs [dist-dir]
 * Default dist-dir: ./dist  (relative to cwd, i.e. the package root)
 *
 * What is hidden:  all internal variable names, class internals, logic
 * What is kept:    exported function/class names (renameGlobals: false)
 * What is NOT done: dead-code injection or control-flow flattening
 *                   (those inflate bundle size and slow parse time)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch {
  console.warn('[obfuscate] javascript-obfuscator not installed — skipping.');
  process.exit(0);
}

const distDir = process.argv[2] ?? './dist';

const OBFUSCATE_OPTS = {
  compact: true,
  identifierNamesGenerator: 'mangled',
  renameGlobals: false,          // keep exported names intact
  stringArray: true,
  rotateStringArray: true,
  shuffleStringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  deadCodeInjection: false,      // no size inflation
  controlFlowFlattening: false,  // no parse-time penalty
  selfDefending: false,
  debugProtection: false,
  sourceMap: false,              // strip source maps from output
};

function obfuscateFile(filePath) {
  const code   = readFileSync(filePath, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATE_OPTS);
  writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
  const before = code.length;
  const after  = result.getObfuscatedCode().length;
  const ratio  = ((after / before) * 100).toFixed(0);
  console.log(`  ✓ ${basename(filePath)}  ${before} → ${after} bytes (${ratio}%)`);
}

let files;
try {
  files = readdirSync(distDir)
    .filter((f) => {
      const ext = extname(f);
      return (ext === '.js' || ext === '.cjs') && !f.endsWith('.d.ts');
    })
    .map((f) => join(distDir, f))
    .filter((p) => statSync(p).isFile());
} catch (err) {
  console.error(`[obfuscate] Cannot read dist dir "${distDir}":`, err.message);
  process.exit(1);
}

if (files.length === 0) {
  console.warn(`[obfuscate] No JS files found in "${distDir}" — nothing to obfuscate.`);
  process.exit(0);
}

console.log(`[obfuscate] Processing ${files.length} file(s) in "${distDir}"…`);
for (const file of files) {
  obfuscateFile(file);
}
console.log('[obfuscate] Done.\n');
