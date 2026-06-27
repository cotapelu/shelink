'use client';

import { useState, useEffect } from 'react';
import { listReports } from '@/server/shared/reports.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      const data = await listReports();
      setReports(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Báo cáo</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-lg">{r.name}</CardTitle>
                <p className="text-sm text-stone-500">Loại: {r.type}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Tạo bởi: {r.generatedByUser?.name}</p>
                <p className="text-sm mb-2">{new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                {r.fileUrl && (
                  <Button size="sm" onClick={() => window.open(r.fileUrl, '_blank')}>
                    Xem báo cáo
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
