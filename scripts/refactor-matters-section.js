const fs = require('fs');
const path = 'src/app/(app)/clients/[id]/_components/matters-section.tsx';
const original = fs.readFileSync(path, 'utf8');

const startMarker = 'export function MattersSection(';
const startIdx = original.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find MattersSection');
  process.exit(1);
}

const before = original.slice(0, startIdx);

const newBlock = `
function renderEmpty() {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">关联案件</h2>
      <p className="text-sm text-muted-foreground">暂无关联案件</p>
    </section>
  );
}

function renderMattersTable({ matters, billingsMap }: { matters: Matter[]; billingsMap: Map<string, Billing[]> }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>案件编号</TableHead>
            <TableHead>案由</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>签约合同</TableHead>
            <TableHead>金额</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matters.flatMap((m) => {
            const billings = billingsMap.get(m.id) ?? [];
            return billings.map((b) => (
              <TableRow key={\`\${m.id}-\${b.id}\`}>
                <TableCell className="font-mono text-xs">{m.internalCode}</TableCell>
                <TableCell className="max-w-[200px] truncate">{m.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{m.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{b.title}</TableCell>
                <TableCell className="text-right font-mono">{yuan(Number(b.contractAmount))}</TableCell>
              </TableRow>
            ));
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function MattersSection({ matters, billingsMap }: MattersSectionProps) {
  if (matters.length === 0) {
    return renderEmpty();
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">关联案件</h2>
      {renderMattersTable({ matters, billingsMap })}
    </section>
  );
}
`;

fs.writeFileSync(path, before + newBlock);
console.log('Refactored MattersSection successfully.');