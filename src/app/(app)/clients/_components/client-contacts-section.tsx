"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Section } from "./client-form-ui";
import { Plus } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { ContactCard } from "./contact-card";
import type { ClientCreateInput } from "@/server/clients/schemas";

export function ClientContactsSection() {
  const {
    control,
    setValue
  } = useFormContext<ClientCreateInput>();

  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });

  return (
    <Section
      title="联系人"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              name: "",
              title: "",
              phone: "",
              email: "",
              wechat: "",
              isPrimary: false,
              notes: ""
            })
          }
          className="h-7 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm联系人
        </Button>
      }
    >
      <div className="col-span-2 space-y-3">
        {fields.map((field, idx) => (
          <ContactCard
            key={field.id}
            index={idx}
            onRemove={() => remove(idx)}
            canRemove={fields.length > 1}
          />
        ))}
      </div>
    </Section>
  );
}
