'use client';

import { useState, useEffect } from 'react';
import { listExpressTrackings } from '@/server/shared/express.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ExpressPage() {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrackings = async () => {
    try {
      const data = await listExpressTrackings();
      setTrackings(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackings();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Theo dõi vận chuyển</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trackings.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-lg">{t.trackingNo}</CardTitle>
                <p className="text-sm text-stone-500">{t.companyCode || 'N/A'}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Mục đích: {t.purpose}</p>
                <p className="text-sm mb-2">Trạng thái: {t.lastState}</p>
                {t.matter && <p className="text-sm text-stone-500">Vụ việc: {t.matter.title}</p>}
                <p className="text-xs text-stone-400 mt-2">
                  Tạo bởi: {t.createdBy?.name} · {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
