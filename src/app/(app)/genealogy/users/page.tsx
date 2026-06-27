'use client';

import { useState, useEffect } from 'react';
import { getUsers } from '@/server/genealogy/users/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải người dùng: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Người dùng hệ thống</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <p className="text-sm text-stone-500">{user.email}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Vai trò: {user.role}</p>
              <p className="text-sm text-stone-500">
                Đăng nhập cuối: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN') : 'Chưa'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
