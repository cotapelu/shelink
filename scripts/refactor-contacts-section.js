const fs = require('fs');
const path = 'src/app/(app)/clients/[id]/_components/contacts-section.tsx';
const original = fs.readFileSync(path, 'utf8');

const startMarker = 'export function ContactsSection(';
const startIdx = original.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find ContactsSection');
  process.exit(1);
}

const before = original.slice(0, startIdx);

const newBlock = `
function renderEmpty() {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">联系人</h2>
      <p className="text-sm text-muted-foreground">暂无联系人</p>
    </section>
  );
}

function renderTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
            <TableHead>职务</TableHead>
            <TableHead>电话</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>微信</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.title ?? "—"}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell>{c.email ?? "—"}</TableCell>
              <TableCell>{c.wechat ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ContactsSection({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return renderEmpty();
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">联系人</h2>
      {renderTable({ contacts })}
    </section>
  );
}
`;

fs.writeFileSync(path, before + newBlock);
console.log('Refactored ContactsSection successfully.');