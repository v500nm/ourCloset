#!/usr/bin/env node

/**
 * check-mock-imports.js
 * Scans `src/` to prevent direct imports of mock datasets (e.g., MOCK_WARDROBE, MOCK_HISTORY)
 * in production code, enforcing migration to local-first data layers (Dexie/IDB).
 *
 * Excluded paths:
 *  - src/lib/mockData.ts (definition)
 *  - src/lib/fixtures/ (test & demo fixtures)
 *  - src/app/demo/ (isolated demo showcase)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Files permitted to import or use mock datasets during Phase 0 baseline.
// As subsequent phases (Phase 1, Phase 2, etc.) migrate each service/page,
// they should be removed from this allowlist.
const LEGACY_ALLOWLIST = new Set([
  'src/providers/AuthProvider.tsx',
].map(p => path.normalize(p)));

const EXCLUDED_PATTERNS = [
  path.normalize('src/lib/mockData.ts'),
  path.normalize('src/lib/fixtures/'),
  path.normalize('src/app/demo/'),
];

const MOCK_IDENTIFIERS = [
  'MOCK_WARDROBE',
  'MOCK_HISTORY',
  'MOCK_HOUSEHOLD',
  'MOCK_USERS_DB',
];

const MOCK_MODULE_PATTERN = /from\s+['"][^'"]*mockData['"]/;

function isExcluded(relativeFilePath) {
  const normalized = path.normalize(relativeFilePath);
  return EXCLUDED_PATTERNS.some(excluded => normalized.startsWith(excluded) || normalized === excluded);
}

function walkSync(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSync(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  if (isExcluded(relativePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // Check for mock module import
    if (MOCK_MODULE_PATTERN.test(line)) {
      violations.push({ line: lineNum, text: line.trim(), reason: 'Imports from mockData' });
      return;
    }
    // Check for specific mock identifier usages
    for (const ident of MOCK_IDENTIFIERS) {
      if (line.includes(ident)) {
        // Exclude definition lines if any
        if (!line.includes(`export const ${ident}`) && !line.includes(`const ${ident}:`)) {
          violations.push({ line: lineNum, text: line.trim(), reason: `References ${ident}` });
          break;
        }
      }
    }
  });

  if (violations.length === 0) return null;
  return {
    filePath: relativePath,
    isLegacyAllowed: LEGACY_ALLOWLIST.has(path.normalize(relativePath)),
    violations,
  };
}

function main() {
  const isStrict = process.argv.includes('--strict');
  console.log('🔍 Scanning src/ for mock data imports...\n');

  const allFiles = walkSync(SRC_DIR);
  const results = allFiles.map(scanFile).filter(Boolean);

  const legacyMatches = results.filter(r => r.isLegacyAllowed);
  const unexpectedMatches = results.filter(r => !r.isLegacyAllowed);

  if (legacyMatches.length > 0) {
    console.log(`⚠️  Found ${legacyMatches.length} legacy files using mock data (tracked for Phase 1/2 migration):`);
    legacyMatches.forEach(item => {
      console.log(`   - ${item.filePath} (${item.violations.length} occurrences)`);
    });
    console.log('');
  }

  if (unexpectedMatches.length > 0) {
    console.error(`❌ Found ${unexpectedMatches.length} unauthorized files importing mock datasets:`);
    unexpectedMatches.forEach(item => {
      console.error(`\n📄 ${item.filePath}:`);
      item.violations.forEach(v => {
        console.error(`   Line ${v.line}: [${v.reason}] ${v.text}`);
      });
    });
    console.error('\nTenet violation: New production code must not import mock datasets. Use IDB repository or demo fixtures.');
    process.exit(1);
  }

  if (isStrict && legacyMatches.length > 0) {
    console.error(`❌ Strict mode failed: ${legacyMatches.length} legacy mock usages remain.`);
    process.exit(1);
  }

  console.log('✅ Check passed: No unauthorized mock imports found in production code.');
}

main();

