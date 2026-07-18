"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { CustomEventFormFields } from "./CustomEventFormFields";
import { CustomEventFooter } from "./custom-event-footer";

interface CustomEventFormViewProps {
  name: string;
  eventDate: string;
  location: string;
  content: string;
  setName: (v: string) => void;
  setEventDate: (v: string) => void;
  setLocation: (v: string) => void;
  setContent: (v: string) => void;
  error: string | null;
  loading: boolean;
  isEdit: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const formSectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function CustomEventFormView({ name, eventDate, location, content, setName, setEventDate, setLocation, setContent, error, loading, isEdit, onCancel, onSubmit }: CustomEventFormViewProps) {
  return (
    <>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </motion.div>
      )}
      <form onSubmit={onSubmit} className="space-y-6">
        <motion.div
          variants={formSectionVariants}
          initial="hidden"
          animate="show"
          className="bg-white/80 p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-200/80 space-y-5"
        >
          <CustomEventFormFields
            name={name}
            eventDate={eventDate}
            location={location}
            content={content}
            onNameChange={setName}
            onDateChange={setEventDate}
            onLocationChange={setLocation}
            onContentChange={setContent}
          />
        </motion.div>
        <motion.div
          variants={formSectionVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="flex justify-between items-center gap-4 pt-4 sm:pt-6"
        >
          <CustomEventFooter
            loading={loading}
            isEdit={isEdit}
            onCancel={onCancel}
          />
        </motion.div>
      </form>
    </>
  );
}
