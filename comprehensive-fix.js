#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Recursively find all .ts files
function findFiles(dir) {
  let results = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        results = results.concat(findFiles(filePath));
      } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
        results.push(filePath);
      }
    }
  } catch (err) {}
  return results;
}

// Fix a single file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix 1: Add definite assignment to properties that don't have it
  // This is the safest fix for DTOs/entities used with class-transformer
  content = content.replace(
    /^(\s*)(\w+):\s*([^;=!?]+);$/gm,
    (match, indent, name, type) => {
      // Skip if it's part of an interface or type
      if (type.includes('=>')) return match;
      // Skip if in an interface context (basic check)
      const linesBefore = content.substring(0, content.indexOf(match)).split('\n');
      const lastFewLines = linesBefore.slice(-10).join('\n');
      if (lastFewLines.includes('interface ') && !lastFewLines.includes('class ')) {
        return match;
      }
      // Add !
      return `${indent}${name}!: ${type};`;
    }
  );

  // Write if changed
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Main
const files = findFiles(srcDir);
console.log(`Processing ${files.length} files...`);

let count = 0;
for (const file of files) {
  try {
    if (fixFile(file)) count++;
  } catch (err) {
    console.error(`Error in ${file}:`, err.message);
  }
}

console.log(`Fixed ${count} files`);
