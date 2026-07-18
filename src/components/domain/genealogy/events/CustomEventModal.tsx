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
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { CustomEventRecord } from "@/utils/eventHelpers";
import api from "@/lib/api/client";
import { getToken } from "@/lib/storage/auth";
import { CustomEventHeader } from "./custom-event-header";
import { CustomEventForm } from "./custom-event-form";

interface CustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventToEdit?: CustomEventRecord | null;
}

export default function CustomEventModal({
  isOpen,
  onClose,
  onSuccess,
  eventToEdit,
}: CustomEventModalProps) {
  useEffect(() => {
    const token = getToken();
    if (token) api.setToken(token);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="p-4 border-b">
              <CustomEventHeader onClose={onClose} isEdit={!!eventToEdit} />
            </div>
            <div className="p-4">
              <CustomEventForm
                eventToEdit={eventToEdit}
                onSuccess={onSuccess}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
