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
import { useParams } from 'next/navigation';
import { getPerson } from '@/server/genealogy/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/utils/dateHelpers';

export default function PersonDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPerson = async () => {
    try {
      const data = await getPerson(id);
      setPerson(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải thông tin: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPerson();
  }, [id]);

  if (loading) return <p>Đang tải...</p>;
  if (!person) return <p>Không tìm thấy</p>;

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" className="mb-4" onClick={() => window.history.back()}>
        ← Quay lại
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{person.fullName}</CardTitle>
          <p className="text-stone-500">ID: {person.id}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p><strong>Giới tính:</strong> {person.gender}</p>
              <p><strong>Ngày sinh:</strong> {formatDisplayDate(person.birthYear, person.birthMonth, person.birthDay)}</p>
              <p><strong>Nơi sinh:</strong> {person.birthPlace || 'N/A'}</p>
              <p><strong>Nghề nghiệp:</strong> {person.occupation || 'N/A'}</p>
              <p><strong>Nơi cư trú:</strong> {person.currentResidence || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Đời:</strong> {person.generation ?? 'N/A'}</p>
              <p><strong>Thứ sinh:</strong> {person.birthOrder ?? 'N/A'}</p>
              <p><strong>Đã mất:</strong> {person.isDeceased ? 'Có' : 'Không'}</p>
              {person.isDeceased && (
                <p><strong>Ngày mất:</strong> {formatDisplayDate(person.deathYear, person.deathMonth, person.deathDay)}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
