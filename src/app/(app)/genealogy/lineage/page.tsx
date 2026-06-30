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
import { listLineages } from '@/server/genealogy/lineage.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LineagePage() {
  const [lineages, setLineages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadLineages();
  }, []);

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
