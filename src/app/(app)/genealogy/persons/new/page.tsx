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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPerson } from '@/server/genealogy/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function NewPersonPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'MALE',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthPlace: '',
    occupation: '',
    currentResidence: '',
    phoneNumber: '',
    note: '',
    isDeceased: false,
    isInLaw: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        birthYear: formData.birthYear ? Number(formData.birthYear) : null,
        birthMonth: formData.birthMonth ? Number(formData.birthMonth) : null,
        birthDay: formData.birthDay ? Number(formData.birthDay) : null,
      } as any;
      await createPerson(data);
      toast.success('Tạo thành công');
      router.push('/genealogy/persons');
    } catch (e: any) {
      toast.error('Lỗi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" className="mb-4" onClick={() => router.back()}>
        ← Quay lại
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Thêm thành viên mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên *</label>
              <Input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giới tính</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full border rounded p-2"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Năm sinh</label>
                <Input type="number" value={formData.birthYear} onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tháng sinh</label>
                <Input type="number" min={1} max={12} value={formData.birthMonth} onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                <Input type="number" min={1} max={31} value={formData.birthDay} onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nơi sinh</label>
              <Input value={formData.birthPlace} onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nghề nghiệp</label>
              <Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nơi cư trú</label>
              <Input value={formData.currentResidence} onChange={(e) => setFormData({ ...formData, currentResidence: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <Input value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <textarea className="w-full border rounded p-2" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={3} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
