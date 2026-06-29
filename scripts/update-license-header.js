const fs = require('fs');
const path = require('path');

// Simple Apache 2.0 header with attribution
const NEW_HEADER = `/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */`;

function getAllFiles(dir, extensions, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'dist') {
        continue;
      }
      getAllFiles(fullPath, extensions, fileList);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function replaceHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Find where the old header ends (look for the first line that is not a comment or empty after /*)
  let headerEnd = 0;
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('/*')) {
      inComment = true;
    }

    if (inComment && line.startsWith('*/')) {
      headerEnd = i + 1;
      break;
    }

    // If we hit a non-comment line before finding */, header might be malformed, skip
    if (inComment === false && line !== '' && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*/')) {
      headerEnd = i;
      break;
    }
  }

  // If no header found or header malformed, skip
  if (headerEnd === 0) {
    // No header, prepend at beginning
    const newContent = [NEW_HEADER, ...lines].join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    return { changed: true, reason: 'no existing header' };
  }

  // Check if already has the new header pattern
  const existingHeader = lines.slice(0, headerEnd).join('\n');
  if (existingHeader.includes('SPDX-License-Identifier: Apache-2.0')) {
    return { changed: false, reason: 'already updated' };
  }

  // Replace header
  const newLines = [NEW_HEADER, ...lines.slice(headerEnd)];
  const newContent = newLines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');

  return { changed: true };
}

// Main
const srcDir = path.join(process.cwd(), 'src');
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

console.log('🔍 Scanning for source files...');
const files = getAllFiles(srcDir, extensions);

console.log(`📦 Found ${files.length} files.`);

let changed = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    const result = replaceHeader(file);
    if (result.changed) {
      console.log(`✅  Updated: ${file}${result.reason ? ` (${result.reason})` : ''}`);
      changed++;
    } else {
      console.log(`⏭  Skipped: ${file} (${result.reason})`);
      skipped++;
    }
  } catch (err) {
    console.error(`❌  Error processing ${file}:`, err.message);
    errors++;
  }
}

console.log('');
console.log('==========================================');
console.log(`Summary:`);
console.log(`  Total files scanned: ${files.length}`);
console.log(`  Headers updated: ${changed}`);
console.log(`  Files skipped: ${skipped}`);
console.log(`  Errors: ${errors}`);
console.log('==========================================');
