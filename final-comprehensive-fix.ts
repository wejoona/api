/**
 * Comprehensive TypeScript Strict Mode Fix
 *
 * Run with: npx ts-node final-comprehensive-fix.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Helper to find all TS files
function findTsFiles(dir: string, exclude = ['node_modules', 'dist', '.git']): string[] {
  const results: string[] = [];

  function scan(currentDir: string) {
    try {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        if (exclude.includes(file)) continue;
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          scan(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
          results.push(filePath);
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  scan(dir);
  return results;
}

// Fix 1: Configuration file - wrap parseInt/parseFloat arguments
function fixConfigurationFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix all parseInt with potential undefined
  content = content.replace(/parseInt\(process\.env\.(\w+), 10\) \|\| (\d+)/g,
    (match, envVar, defaultVal) => `parseInt(process.env.${envVar} || '${defaultVal}', 10)`);

  // Fix all parseFloat with potential undefined
  content = content.replace(/parseFloat\(process\.env\.(\w+)\) \|\| ([\d.]+)/g,
    (match, envVar, defaultVal) => `parseFloat(process.env.${envVar} || '${defaultVal}')`);

  // Handle the 1_000_000 case
  content = content.replace(/parseFloat\(process\.env\.(\w+)\) \|\| 1_000_000/g,
    (match, envVar) => `parseFloat(process.env.${envVar} || '1000000')`);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Fix 2: Add definite assignment (!) to class properties
function fixClassProperties(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result: string[] = [];
  let modified = false;

  let inClass = false;
  let braceDepth = 0;
  let classStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect class definition
    if (trimmed.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
      inClass = true;
      classStartLine = i;
      braceDepth = 0;
    }

    // Track braces
    if (inClass) {
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      if (braceDepth === 0 && i > classStartLine) {
        inClass = false;
      }
    }

    // Fix class properties only (not in object literals)
    if (inClass && braceDepth > 0) {
      const propertyMatch = trimmed.match(/^(\w+):\s*(.+);$/);

      if (propertyMatch && !trimmed.includes('!:') && !trimmed.includes('?:') && !trimmed.includes('=')) {
        const [, propName, typeDecl] = propertyMatch;

        // Skip method signatures
        if (!typeDecl.includes('=>') && !typeDecl.match(/^\s*\([^)]*\)/)) {
          const indent = line.match(/^(\s*)/)?.[1] || '';
          result.push(`${indent}${propName}!: ${typeDecl};`);
          modified = true;
          continue;
        }
      }
    }

    result.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    return true;
  }

  return false;
}

// Fix 3: Prefix unused parameters with underscore
function fixUnusedParameters(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Prefix queryRunner parameters (TypeORM logger)
  if (filePath.includes('typeorm-logger')) {
    content = content.replace(/queryRunner\?:/g, '_queryRunner?:');
  }

  // Prefix other known unused parameters
  const unusedParams = ['windowStart', 'userId'];
  for (const param of unusedParams) {
    content = content.replace(new RegExp(`\\b(const|let)\\s+${param}\\s*=`, 'g'), `$1 _${param} =`);
    content = content.replace(new RegExp(`\\b${param}:\\s*(\\w+)`, 'g'), `_${param}: $1`);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Fix 4: Remove unused imports
function removeUnusedImports(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const unusedImports = [
    'UsePipes',
    'ValidationPipe',
    'Between',
    'IsPhoneNumber',
    'Matches',
    'BillPaymentErrorCodes',
    'CircuitOpenError',
    'VERSION_NEUTRAL',
  ];

  for (const importName of unusedImports) {
    // Remove from import lists
    content = content.replace(new RegExp(`\\s*${importName},?\\s*\\n`, 'g'), '\n');
    content = content.replace(new RegExp(`,\\s*${importName}\\s*`, 'g'), '');
    content = content.replace(new RegExp(`${importName}\\s*,\\s*`, 'g'), '');
  }

  // Remove crypto import if unused
  content = content.replace(/import\s*\*\s*as\s+crypto\s+from\s+['"]crypto['"]\s*;\s*\n/g, '');

  // Clean up empty imports
  content = content.replace(/import\s*{\s*}\s*from/g, '');
  content = content.replace(/import\s*{\s*,\s*/g, 'import { ');
  content = content.replace(/,\s*}\s*from/g, ' } from');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Main execution
async function main() {
  console.log('Starting comprehensive TypeScript strict mode fixes...\n');

  const srcDir = path.join(__dirname, 'src');
  const files = findTsFiles(srcDir);

  console.log(`Found ${files.length} TypeScript files\n`);

  let configFixed = 0;
  let propertiesFixed = 0;
  let paramsFixed = 0;
  let importsFixed = 0;

  // Fix configuration file specifically
  const configFile = path.join(srcDir, 'config', 'configuration.ts');
  if (fs.existsSync(configFile)) {
    if (fixConfigurationFile(configFile)) {
      configFixed++;
      console.log('Fixed: configuration.ts');
    }
  }

  // Fix all files
  for (const file of files) {
    let fileFixed = false;

    if (fixClassProperties(file)) {
      propertiesFixed++;
      fileFixed = true;
    }

    if (fixUnusedParameters(file)) {
      paramsFixed++;
      fileFixed = true;
    }

    if (removeUnusedImports(file)) {
      importsFixed++;
      fileFixed = true;
    }

    if (fileFixed && propertiesFixed % 50 === 0) {
      console.log(`Progress: ${propertiesFixed} files with property fixes...`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Configuration files fixed: ${configFixed}`);
  console.log(`Files with property fixes: ${propertiesFixed}`);
  console.log(`Files with parameter fixes: ${paramsFixed}`);
  console.log(`Files with import fixes: ${importsFixed}`);
  console.log('\nDone!');
}

main().catch(console.error);
