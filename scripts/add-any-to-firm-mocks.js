const fs = require('fs');
const filePath = 'src/tests/server/firm-files/actions.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Cast mockResolvedValue argument to any for create/update/findUnique/findMany
content = content.replace(
  /(mockPrisma\.firmFile\.(?:create|update|findUnique|findMany)\.mockResolvedValue\()([\s\S]*?)(\));/g,
  `$1$2 as any$3`
);

fs.writeFileSync(filePath, content);
console.log('Added "as any" to firmFile mockResolvedValue calls');