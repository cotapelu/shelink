'use client';

import { useState, useEffect } from 'react';
import { listLineages, createLineage, deleteLineage } from '@/server/genealogy/lineage.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LineagePage() {
  const [lineages, setLineages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLineages();
  }, []);

  const loadLineages = async () => {
    try {
      const data = await listLineages();
      setLineages(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải dòng họ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Quản lý dòng họ</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lineages.map((l) => (
            <Card key={l.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {l.person?.fullName} (Đời {l.generation})
                </CardTitle>
                <p className="text-sm text-stone-500">
                  Gốc: {l.rootPerson?.fullName}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Đường dẫn: {l.path}</p>
                <p className="text-sm text-stone-500">
                  ID: {l.id}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
