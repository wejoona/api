#!/usr/bin/env node
/**
 * Script to fix TS2564 errors by adding definite assignment assertions (!) to DTO/Entity properties
 *
 * This script:
 * 1. Finds all .dto.ts and .entity.ts files
 * 2. Adds ! to properties that don't have initializers or definite assignment assertions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all DTO and entity files
function findFiles(dir, pattern) {
  const results = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results.push(...findFiles(filePath, pattern));
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  } catch (err) {
    // Ignore permission errors
  }

  return results;
}

// Fix property declarations by adding ! where needed
function fixFileProperties(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match property declarations that need fixing
  // Pattern: property name, colon, type, semicolon - but NOT already with ! or = or ?
  const propertyPattern = /^(\s+)(@[\w(){}:,'".\s-]+\n\s+)?(\w+):\s*([^;=!?]+);$/gm;

  const newContent = content.replace(propertyPattern, (match, indent, decorator, propName, type) => {
    // Skip if already has definite assignment (!), optional (?), or initializer (=)
    if (match.includes('!:') || match.includes('?:') || match.includes(' = ')) {
      return match;
    }

    // Skip if it's a method signature (has parentheses in type)
    if (type.includes('(') && type.includes(')') && type.includes('=>')) {
      return match;
    }

    modified = true;
    const decoratorPart = decorator || '';
    return `${indent}${decoratorPart}${propName}!: ${type};`;
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// Main execution
const srcDir = path.join(__dirname, 'src');

console.log('Finding DTO and entity files...');
const dtoFiles = findFiles(srcDir, /\.dto\.ts$/);
const entityFiles = findFiles(srcDir, /\.entity\.ts$/);
const ormEntityFiles = findFiles(srcDir, /\.orm-entity\.ts$/);

const allFiles = [...dtoFiles, ...entityFiles, ...ormEntityFiles];

console.log(`Found ${allFiles.length} files to process`);

let fixedCount = 0;
for (const file of allFiles) {
  if (fixFileProperties(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files`);
console.log('Done!');
