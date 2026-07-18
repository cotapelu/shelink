"use client";

import { EventNameField } from "./event-name-field";
import { EventDateField } from "./event-date-field";
import { EventLocationField } from "./event-location-field";
import { EventContentField } from "./event-content-field";

interface CustomEventFormFieldsProps {
  name: string;
  eventDate: string;
  location: string;
  content: string;
  onNameChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onContentChange: (v: string) => void;
}

export function CustomEventFormFields({
  name,
  eventDate,
  location,
  content,
  onNameChange,
  onDateChange,
  onLocationChange,
  onContentChange,
}: CustomEventFormFieldsProps) {
  return (
    <div className="space-y-5">
      <EventNameField name={name} onChange={onNameChange} />
      <EventDateField eventDate={eventDate} onChange={onDateChange} />
      <EventLocationField location={location} onChange={onLocationChange} />
      <EventContentField content={content} onChange={onContentChange} />
    </div>
  );
}
