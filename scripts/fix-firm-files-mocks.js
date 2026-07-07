const fs = require('fs');
const filePath = 'src/tests/server/firm-files/actions.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ensure FirmFile import
if (!content.includes('import type { FirmFile } from "@prisma/client"')) {
  content = content.replace(
    /import type \{ FirmFileCategory \} from "@prisma\/client";/,
    `import type { FirmFile, FirmFileCategory } from "@prisma/client";`
  );
}

// 2. Helper function
const helper = `
function buildFirmFile(overrides: Partial<FirmFile> = {}): FirmFile {
  const base: FirmFile = {
    id: "fid",
    name: "File.pdf",
    description: null,
    category: "GUIDE" as FirmFileCategory,
    tags: [],
    path: "/uploads/firm-files/fid",
    mimeType: null,
    size: 1234,
    sha256: null,
    uploadedById: "u1",
    uploadedBy: { id: "u1", name: "User" } as any,
    supersededById: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, ...overrides };
}
`;

if (!content.includes('function buildFirmFile')) {
  content = content.replace(
    /import type \{ FirmFile, FirmFileCategory \} from "@prisma\/client";/,
    `$&\n${helper}`
  );
}

// 3. Wrap create/update/findUnique mocks: mockResolvedValue(inner) -> mockResolvedValue(buildFirmFile(inner))
content = content.replace(
  /(mockPrisma\.firmFile\.(?:create|update|findUnique)\.mockResolvedValue\()([\s\S]*?)(\));/g,
  (match, p1, p2, p3) => {
    return `${p1}buildFirmFile(${p2})${p3}`;
  }
);

// 4. Handle findMany mock: replace each object inside array with buildFirmFile
content = content.replace(
  /(mockPrisma\.firmFile\.findMany\.mockResolvedValue\(\[)([\s\S]*?)(\]\))/g,
  (match, start, arrayContent, end) => {
    const newContent = arrayContent.replace(/\{([\s\S]*?)\}/g, (objMatch, inner) => {
      return `buildFirmFile({ ${inner} })`;
    });
    return start + newContent + end;
  }
);

fs.writeFileSync(filePath, content);
console.log('Fixed firm-files test mocks using buildFirmFile helper');