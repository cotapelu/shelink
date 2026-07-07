const fs = require('fs');
const path = 'src/utils/gedcom.ts';
const content = fs.readFileSync(path, 'utf8');

const startMarker = 'export function exportToGedcom(';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find exportToGedcom');
  process.exit(1);
}

// Find end: the start of 'function getMonthName'
const endMarker = 'function getMonthName(';
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('Could not find getMonthName after exportToGedcom');
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx); // includes getMonthName and the rest

const newBlock = fs.readFileSync('scripts/export-gedcom-new-block.txt', 'utf8');

fs.writeFileSync(path, before + newBlock + after);
console.log('Refactored exportToGedcom successfully.');
