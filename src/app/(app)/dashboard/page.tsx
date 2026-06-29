/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
