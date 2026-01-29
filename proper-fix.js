#!/usr/bin/env node
/**
 * Proper fix for TS2564 - adds ! only to class properties, not object literals
 */

const fs = require('fs');
const path = require('path');

function findTsFiles(dir) {
  const results = [];
  const exclude = ['node_modules', 'dist', '.git'];

  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        if (exclude.includes(file)) continue;
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          scan(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
          results.push(filePath);
        }
      }
    } catch (err) {}
  }

  scan(dir);
  return results;
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];
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
      for (let char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      if (braceDepth === 0 && i > classStartLine) {
        inClass = false;
      }
    }

    // Fix class properties only
    if (inClass && braceDepth > 0) {
      // Match:  propertyName: Type;
      // NOT:    propertyName!: Type;  (already fixed)
      // NOT:    propertyName?: Type;  (optional)
      // NOT:    propertyName =       (has initializer)
      // NOT:    { propertyName:      (object literal)
      const propertyMatch = trimmed.match(/^(\w+):\s*(.+);$/);

      if (propertyMatch && !trimmed.includes('!:') && !trimmed.includes('?:') && !trimmed.includes('=')) {
        const [, propName, typeDecl] = propertyMatch;

        // Skip if it looks like a method signature (has =>)
        if (!typeDecl.includes('=>')) {
          // Skip if it looks like a function type with parentheses
          if (!typeDecl.match(/^\s*\([^)]*\)/)) {
            // Get indentation
            const indent = line.match(/^(\s*)/)[1];
            // Add definite assignment
            result.push(`${indent}${propName}!: ${typeDecl};`);
            modified = true;
            continue;
          }
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

// Main
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
    console.error(`Error in ${file}:`, err.message);
  }
}

console.log(`Fixed ${fixedCount} files with class property issues`);
