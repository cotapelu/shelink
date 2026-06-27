'use client';

import { useState, useEffect } from 'react';
import { listSealRequests } from '@/server/shared/seals.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SealsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      const data = await listSealRequests();
      setRequests(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      APPROVED: 'default',
      REJECTED: 'destructive',
      STAMPED: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Yêu cầu dùng chữ ký</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{req.code}</CardTitle>
                  {getStatusBadge(req.status)}
                </div>
                <p className="text-sm text-stone-500">{req.purpose}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Người yêu cầu: {req.requestedBy?.name}</p>
                <p className="text-sm mb-4">Trạng thái: {req.status}</p>
                <div className="text-xs text-stone-500">
                  {req.approvedBy && <p>Phê duyệt bởi: {req.approvedBy.name}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
