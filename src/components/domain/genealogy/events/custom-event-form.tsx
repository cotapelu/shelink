"use client";

import { useState, useEffect } from "react";
import { CustomEventRecord } from "@/utils/eventHelpers";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { CustomEventFormView } from "./custom-event-view";

function useCustomEventForm(onSuccess: () => void, onCancel: () => void, eventToEdit?: CustomEventRecord | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(eventToEdit?.name || "");
  const [eventDate, setEventDate] = useState(eventToEdit?.event_date || "");
  const [location, setLocation] = useState(eventToEdit?.location || "");
  const [content, setContent] = useState(eventToEdit?.content || "");

  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name); setEventDate(eventToEdit.event_date); setLocation(eventToEdit.location || ""); setContent(eventToEdit.content || "");
    } else {
      setName(""); setEventDate(""); setLocation(""); setContent("");
    }
    setError(null);
  }, [eventToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = { name, event_date: eventDate, location: location || null, content: content || null };
      if (eventToEdit) await api.put(API_ENDPOINTS.EVENTS_UPDATE(eventToEdit.id), payload);
      else await api.post(API_ENDPOINTS.EVENTS_CREATE, payload);
      onSuccess(); onCancel();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu sự kiện");
    } finally { setLoading(false); }
  };

  return { name, setName, eventDate, setEventDate, location, setLocation, content, setContent, loading, error, isEdit: !!eventToEdit, handleSubmit };
}

interface CustomEventFormProps {
  eventToEdit?: CustomEventRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomEventForm({ eventToEdit, onSuccess, onCancel }: CustomEventFormProps) {
  const form = useCustomEventForm(onSuccess, onCancel, eventToEdit);
  return (
    <CustomEventFormView
      name={form.name} eventDate={form.eventDate} location={form.location} content={form.content}
      setName={form.setName} setEventDate={form.setEventDate} setLocation={form.setLocation} setContent={form.setContent}
      error={form.error} loading={form.loading} isEdit={form.isEdit} onCancel={onCancel} onSubmit={form.handleSubmit}
    />
  );
}
