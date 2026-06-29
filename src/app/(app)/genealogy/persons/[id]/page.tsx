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
