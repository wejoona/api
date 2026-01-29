#!/usr/bin/env node
/**
 * Robust property initializer fix
 * Adds ! to ALL class properties that don't have initializers
 */

const fs = require('fs');
const path = require('path');

function findTsFiles(dir) {
  const results = [];
  const exclude = ['node_modules', 'dist', '.git', 'coverage'];

  function scan(currentDir) {
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
      // Ignore errors
    }
  }

  scan(dir);
  return results;
}

function fixProperties(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  let modified = false;

  let inClass = false;
  let braceCount = 0;
  let lastLineWasDecorator = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track if we're in a class
    if (trimmed.startsWith('class ') || trimmed.includes(' class ')) {
      inClass = true;
      result.push(line);
      continue;
    }

    // Track braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;

    if (braceCount === 0 && inClass) {
      inClass = false;
    }

    // Check if line is a decorator
    if (trimmed.startsWith('@')) {
      lastLineWasDecorator = true;
      result.push(line);
      continue;
    }

    // Check if this is a property declaration that needs fixing
    if (inClass && braceCount > 0) {
      // Match: propertyName: Type; (with optional decorators before)
      // Should not have !, ?, or = already
      const propertyMatch = trimmed.match(/^(\w+):\s*(.+);$/);

      if (propertyMatch) {
        const [, propName, typeAndRest] = propertyMatch;

        // Skip if already has definite assignment, optional, or initializer
        if (!line.includes('!:') && !line.includes('?:') && !line.includes(' = ') && !line.includes('=;')) {
          // Skip method signatures (they have =>)
          if (!typeAndRest.includes('=>')) {
            // Skip if it looks like a method/function type
            if (!typeAndRest.match(/^\s*\([^)]*\)\s*=>/)) {
              // Extract indentation
              const indent = line.match(/^(\s*)/)[1];

              // Add the ! operator
              result.push(`${indent}${propName}!: ${typeAndRest};`);
              modified = true;
              lastLineWasDecorator = false;
              continue;
            }
          }
        }
      }
    }

    lastLineWasDecorator = false;
    result.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    return true;
  }

  return false;
}

// Main
console.log('Scanning for TypeScript files...');
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files`);
console.log('Fixing property initializers...\n');

let fixedCount = 0;
const fixedFiles = [];

for (const file of files) {
  try {
    if (fixProperties(file)) {
      fixedCount++;
      fixedFiles.push(file);
      if (fixedCount % 10 === 0) {
        console.log(`Progress: ${fixedCount} files fixed...`);
      }
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log(`\nFixed ${fixedCount} files`);

if (fixedCount > 0 && fixedCount <= 20) {
  console.log('\nFixed files:');
  fixedFiles.forEach(f => console.log(`  - ${f}`));
}

console.log('\nDone!');
