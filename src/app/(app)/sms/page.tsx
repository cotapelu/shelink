'use client';

import { useState, useEffect } from 'react';
import { listSmsMessages } from '@/server/shared/sms.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SmsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await listSmsMessages();
      setMessages(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Tin nhắn SMS</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardHeader>
                <CardTitle className="text-lg">Đến: {msg.to}</CardTitle>
                <p className="text-sm text-stone-500">{msg.status}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2 whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs text-stone-400">
                  Gửi lúc: {new Date(msg.createdAt).toLocaleString('vi-VN')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
