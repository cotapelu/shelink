"use client";

import { Section } from "./client-form-ui";
import { ClientIdentityFields } from "./client-identity-fields";
import { ClientContactFields } from "./client-contact-fields";
import { ClientLegalBusinessFields } from "./client-legal-business-fields";
import { ClientDemographicsFields } from "./client-demographics-fields";
import { AISearchField } from "./ai-search-field";
import { ClientTagsNotes } from "./client-tags-notes";

export function ClientBasicInfoSection() {
  return (
    <Section title="Thông tin cơ bản">
      <ClientIdentityFields />
      <ClientContactFields />
      <ClientLegalBusinessFields />
      <AISearchField />
      <ClientDemographicsFields />
      <ClientTagsNotes />
    </Section>
  );
}
