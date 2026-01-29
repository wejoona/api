#!/usr/bin/env node
/**
 * Script to fix TS6133 errors (unused variables) by removing or prefixing with underscore
 */

const fs = require('fs');
const path = require('path');

function findTsFiles(dir) {
  const results = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules')) {
        results.push(...findTsFiles(filePath));
      } else if (file.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  } catch (err) {
    // Ignore permission errors
  }

  return results;
}

// List of known unused imports/variables from build errors
const fixPatterns = [
  // Admin module
  { file: 'admin.controller.ts', remove: ['UsePipes', 'ValidationPipe'] },
  { file: 'admin.service.ts', remove: ['Between'] },
  { file: 'audit.service.ts', remove: ['Between'] },

  // Beneficiary module
  { file: 'create-beneficiary.dto.ts', remove: ['IsPhoneNumber'] },

  // Bill payments module
  { file: 'requests.ts', remove: ['IsPhoneNumber', 'Matches'] },
  { file: 'pay-bill.use-case.ts', remove: ['BillPaymentErrorCodes'] },

  // Common utils
  { file: 'secure-fetch.ts', remove: ['CircuitOpenError'] },
  { file: 'rate-limit.service.ts', prefix: ['windowStart'] },
  { file: 'pin-verification.guard.ts', prefix: ['userId'] },

  // Migrations
  { file: '1738300000000-AddSecurityNotificationTypes.ts', prefix: ['queryRunner'] },
  { file: '1738800000000-AddNotificationTypes.ts', prefix: ['queryRunner'] },

  // Bill payment adapters
  { file: 'cie-adapter.ts', prefix: ['configService'] },
  { file: 'generic-bill-adapter.ts', prefix: ['configService'] },
  { file: 'sodeci-adapter.ts', prefix: ['configService'] },
  { file: 'orange-money-adapter.ts', remove: ['crypto'] },
];

function removeUnusedImport(content, importName) {
  // Remove from multi-line imports
  let result = content.replace(
    new RegExp(`\\s*${importName},?\\s*\\n`, 'g'),
    '\n'
  );

  // Remove from single-line imports
  result = result.replace(
    new RegExp(`,\\s*${importName}\\s*`, 'g'),
    ''
  );
  result = result.replace(
    new RegExp(`${importName}\\s*,\\s*`, 'g'),
    ''
  );

  // Clean up empty import blocks
  result = result.replace(/import\s*{\s*}\s*from/g, '');
  result = result.replace(/import\s*{\s*,\s*/g, 'import { ');
  result = result.replace(/,\s*}\s*from/g, ' } from');

  return result;
}

function prefixUnusedVariable(content, varName) {
  // Prefix parameter/variable declarations
  const patterns = [
    new RegExp(`\\b(${varName}):\\s*`, 'g'),  // Parameter with type
    new RegExp(`\\bconst\\s+(${varName})\\s*=`, 'g'),  // const declaration
    new RegExp(`\\blet\\s+(${varName})\\s*=`, 'g'),  // let declaration
  ];

  let result = content;
  for (const pattern of patterns) {
    result = result.replace(pattern, (match) => {
      return match.replace(varName, `_${varName}`);
    });
  }

  return result;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const allFiles = findTsFiles(srcDir);

let fixedCount = 0;

for (const pattern of fixPatterns) {
  const matchingFiles = allFiles.filter(f => f.includes(pattern.file));

  for (const filePath of matchingFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (pattern.remove) {
      for (const importName of pattern.remove) {
        const newContent = removeUnusedImport(content, importName);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }

    if (pattern.prefix) {
      for (const varName of pattern.prefix) {
        const newContent = prefixUnusedVariable(content, varName);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
      fixedCount++;
    }
  }
}

console.log(`\nFixed ${fixedCount} files`);
console.log('Done!');
