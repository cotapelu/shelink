'use client';

import { useState, useEffect } from 'react';
import { getDashboardStats, getGenealogyStats } from '@/server/shared/stats.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [genealogyStats, setGenealogyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const [dash, gene] = await Promise.all([
        getDashboardStats(),
        getGenealogyStats(),
      ]);
      setDashboardStats(dash);
      setGenealogyStats(gene);
    } catch (e: any) {
      toast.error('Lỗi khi tải thống kê: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Tổng quan</h1>

      <h2 className="text-2xl font-bold mb-4">Pháp lý</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader><CardTitle>Vụ việc</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{dashboardStats?.totalMatters || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Đang xử lý</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{dashboardStats?.activeMatters || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Công việc</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{dashboardStats?.totalTasks || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Chờ xử lý</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{dashboardStats?.pendingTasks || 0}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4">Gia phả</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Thành viên</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{genealogyStats?.totalPersons || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Mối quan hệ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{genealogyStats?.totalRelationships || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sự kiện</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{genealogyStats?.totalEvents || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dòng họ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{genealogyStats?.totalLineages || 0}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
