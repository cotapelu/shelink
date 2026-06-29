/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
'use client';

import { useState, useEffect } from 'react';
import { listPreservations } from '@/server/shared/preservation.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PreservationsPage() {
  const [preservations, setPreservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await listPreservations();
      setPreservations(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      RENEWED: 'outline',
      EXPIRED: 'destructive',
      LIFTED: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Bảo tồn tài sản</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {preservations.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{p.respondent}</CardTitle>
                  {getStatusBadge(p.status)}
                </div>
                <p className="text-sm text-stone-500">{p.type} · {p.propertyType}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Tài sản: {p.amount ? `$${p.amount.toLocaleString()}` : 'N/A'}</p>
                <p className="text-sm mb-2">Hết hạn: {new Date(p.expiryDate).toLocaleDateString('vi-VN')}</p>
                {p.matter && <p className="text-sm text-stone-500">Vụ việc: {p.matter.title}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
