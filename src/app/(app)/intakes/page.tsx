'use client';

import { useCallback, useEffect, useState } from 'react';
import { listIntakes } from '@/server/intakes/actions';
import { toast } from 'sonner';
import { IntakePipeline } from './_components/intake-pipeline';
import type { PipelineItem } from './_components/pipeline-lib';

/** Trang Tiếp nhận dạng pipeline (TD-A1/A2): kanban kéo-thả + chế độ danh sách. */
export default function IntakesPage() {
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
      <header className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tiếp nhận</h1>
        <p className="text-[13px] text-muted-foreground">
          Kéo thẻ giữa các giai đoạn đang xử lý để chuyển bước. Cảnh báo vàng khi chờ quá 24 giờ.
        </p>
      </header>
      {loading ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Đang tải…</p>
      ) : (
        <IntakePipeline items={items} onMoved={load} />
      )}
    </div>
  );
}
