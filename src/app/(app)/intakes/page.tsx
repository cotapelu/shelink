'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listIntakes } from '@/server/intakes/actions';
import { toast } from 'sonner';
import { useTerminology } from '@/hooks/use-terminology';
import { IntakePipeline } from './_components/intake-pipeline';
import { CreateIntakeButton } from './_components/intake-create-button';
import { buildIntakeStages, type PipelineItem } from './_components/pipeline-lib';

/** Trang Tiếp nhận dạng pipeline (TD-A1/A2): kanban kéo-thả + chế độ danh sách. */
export default function IntakesPage() {
  const terms = useTerminology();
  const stages = useMemo(() => buildIntakeStages(terms.intake), [terms.intake]);
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await listIntakes({ pageSize: 100 });
      setItems(
        rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          clientName: r.client?.name ?? null,
          contactName: r.contactName ?? null,
          ownerName: r.ownerUser?.name ?? null,
          receivedAt: r.receivedAt,
          claimAmount: r.claimAmount != null ? Number(r.claimAmount) : null
        }))
      );
    } catch (e: any) {
      toast.error('Lỗi khi tải tiếp nhận: ' + (e?.message ?? 'không rõ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{terms.intake}</h1>
          <p className="text-[13px] text-muted-foreground">Kéo thẻ giữa các giai đoạn đang xử lý để chuyển bước. Cảnh báo vàng khi chờ quá 24 giờ.</p>
        </div>
        <CreateIntakeButton onCreated={load} />
      </header>
      {loading ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Đang tải…</p>
      ) : (
        <IntakePipeline items={items} onMoved={load} stages={stages} />
      )}
    </div>
  );
}
