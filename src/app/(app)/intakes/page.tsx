'use client';

import { useState, useEffect } from 'react';
import { listIntakes } from '@/server/intake/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function IntakesPage() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIntakes = async () => {
    try {
      const data = await listIntakes();
      setIntakes(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntakes();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      INTAKE: 'default',
      PENDING_CONFIRMATION: 'secondary',
      CONVERTED: 'outline',
      DECLINED: 'destructive',
      NEEDS_REVISION: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Tiếp nhận hồ sơ</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intakes.map((intake) => (
            <Card key={intake.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{intake.title}</CardTitle>
                  {getStatusBadge(intake.status)}
                </div>
                <p className="text-sm text-stone-500">{intake.contactName}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 line-clamp-2">{intake.description}</p>
                <div className="flex justify-between items-center text-xs text-stone-500">
                  <span>Người nhận: {intake.ownerUser?.name}</span>
                  <span>{new Date(intake.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
