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
import { getPersons } from '@/server/genealogy/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Person } from '@/types';

export default function KinshipPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [personA, setPersonA] = useState<string>('');
  const [personB, setPersonB] = useState<string>('');
  const [relationship, setRelationship] = useState<string | null>(null);

  const loadPersons = async () => {
    try {
      const data = await getPersons({ page: 1, limit: 1000 });
      setPersons(data as any);
    } catch (e: any) {
      toast.error('Lỗi khi tải danh sách người: ' + e.message);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const calculateKinship = () => {
    if (!personA || !personB) {
      toast.error('Vui lòng chọn hai người');
      return;
    }
    if (personA === personB) {
      setRelationship('Cùng một người');
      return;
    }
    // Stub: In real app, run BFS on relationship graph
    setRelationship('Xa xóm (cần tính toán)');
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Tính quan hệ họ hàng</h1>
      <Card>
        <CardHeader>
          <CardTitle>Chọn hai người để tính quan hệ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Người 1</label>
              <select
                value={personA}
                onChange={(e) => setPersonA(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">Chọn...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Người 2</label>
              <select
                value={personB}
                onChange={(e) => setPersonB(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">Chọn...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={calculateKinship}>Tính quan hệ</Button>
          {relationship && (
            <p className="mt-4 text-lg font-semibold">Quan hệ: {relationship}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
