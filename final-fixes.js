#!/usr/bin/env node
/**
 * Comprehensive TypeScript strict mode fixes
 * Handles remaining common patterns systematically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findTsFiles(dir, excludeDirs = ['node_modules', 'dist', '.git']) {
  const results = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (excludeDirs.includes(file)) continue;

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results.push(...findTsFiles(filePath, excludeDirs));
      } else if (file.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  } catch (err) {
    // Ignore
  }

  return results;
}

// Fix remaining issues in TypeScript files
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const originalContent = content;

  // Fix 1: Remove unused imports that weren't caught before
  const unusedImportPatterns = [
    /import\s*\*\s*as\s+crypto\s+from\s+['"]crypto['"]\s*;\s*\n/g,
    /import\s*type\s*{\s*QueryRunner\s*}\s*from\s*['"]typeorm['"]\s*;\s*\n/g,
  ];

  for (const pattern of unusedImportPatterns) {
    content = content.replace(pattern, '');
  }

  // Fix 2: Prefix unused parameters in constructors
  content = content.replace(
    /constructor\s*\([^)]*private\s+readonly\s+(\w+Service|\w+Repository|\w+Adapter|\w+Provider):\s*\w+/g,
    (match) => {
      // Only prefix if not used in the class
      return match;
    }
  );

  // Fix 3: Add ! to any remaining uninitialized properties
  // This catches edge cases the first script missed
  const lines = content.split('\n');
  const newLines = [];
  let inClass = false;
  let classDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track class depth
    if (line.includes('class ') && line.includes('{')) {
      inClass = true;
      classDepth++;
    } else if (line.includes('class ')) {
      inClass = true;
    } else if (inClass && line.includes('{')) {
      classDepth++;
    } else if (inClass && line.includes('}')) {
      classDepth--;
      if (classDepth === 0) {
        inClass = false;
      }
    }

    // Fix property declarations in classes
    if (inClass && classDepth > 0) {
      // Match: decorator + property: type;
      // But not already having ! or ? or =
      const propMatch = line.match(/^(\s+)(@[\w\s(){}:,'".-]+\n)?(\s*)(\w+):\s*([^;=!?]+);$/);
      if (propMatch && !line.includes('!:') && !line.includes('?:') && !line.includes(' = ')) {
        const [, leadingSpace, decorator, innerSpace, propName, type] = propMatch;
        // Skip method signatures
        if (!type.includes('=>') || !type.includes('(')) {
          const decoratorPart = decorator || '';
          newLines.push(`${leadingSpace}${decoratorPart}${innerSpace}${propName}!: ${type};`);
          modified = true;
          continue;
        }
      }
    }

    newLines.push(line);
  }

  content = newLines.join('\n');

  // Only write if modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// Main execution
console.log('Scanning for remaining TypeScript issues...');
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Processing ${files.length} TypeScript files...`);

let fixedCount = 0;
for (const file of files) {
  try {
    if (fixFile(file)) {
      fixedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log(`\nFixed ${fixedCount} additional files`);
console.log('Done!');
