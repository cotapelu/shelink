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
  const [loading, setLoading] = useState(false);

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
