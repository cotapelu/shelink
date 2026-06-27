'use client';

import { useState, useEffect } from 'react';
import { getEvents } from '@/server/genealogy/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/utils/dateHelpers';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (e: any) {
      toast.error('Lỗi khi tải sự kiện: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Sự kiện gia phả</h1>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <p className="text-sm text-stone-500">{event.type}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{event.description}</p>
                <p className="text-sm text-stone-500">
                  {formatDisplayDate(event.year, event.month, event.day)}
                </p>
                <p className="text-sm text-stone-500">
                  Người liên quan: {event.person?.fullName}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
