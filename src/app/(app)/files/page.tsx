'use client';

import { useState, useEffect } from 'react';
import { listFiles } from '@/server/shared/files.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    try {
      const data = await listFiles();
      setFiles(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const download = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Thư viện tệp</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <Card key={file.id}>
              <CardHeader>
                <CardTitle className="text-lg truncate">{file.originalName}</CardTitle>
                <p className="text-sm text-stone-500">{(file.size / 1024).toFixed(1)} KB</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2 text-stone-500">
                  Tải lên bởi: {file.uploadedBy?.name} · {new Date(file.uploadedAt).toLocaleDateString('vi-VN')}
                </p>
                <Button size="sm" onClick={() => download(file.url || file.path, file.originalName)}>
                  Tải xuống
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
