"use client";

import type { SealTypeConfigRow, MatterOption } from "./seal-types";
import { PurposeSection } from "./purpose-section";
import { PageOptionsSection } from "./page-options-section";
import { FileUploadSection } from "./file-upload-section";
import { RequestNoteSection } from "./request-note-section";
import { useSealRequestForm } from "./use-seal-request-form";
import { SealTypeSection } from "./seal-type-section";
import { MatterLinkSection } from "./matter-link-section";
import { ExistingDocumentBanner } from "./existing-document-banner";
import { DocumentTitleField } from "./document-title-field";
import { FormFooter } from "./form-footer";

interface SealRequestFormProps {
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: { draftDocId?: string; matterId?: string; documentTitle?: string } | null;
  onOpenChange: (o: boolean) => void;
}

export function SealRequestForm(props: SealRequestFormProps) {
  const { configs, matters, preset, onOpenChange } = props;
  const {sealType,setSealType,matterId,setMatterId,purposePreset,setPurposePreset,purposeOther,setPurposeOther,documentTitle,setDocumentTitle,pageCount,setPageCount,crossPage,setCrossPage,copies,setCopies,urgency,setUrgency,requestNote,setRequestNote,file,setFile,alsoLegalRep,setAlsoLegalRep,pending,submit} = useSealRequestForm({configs,matters,preset,onOpenChange});

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {preset?.draftDocId && <ExistingDocumentBanner preset={preset} />}
      <SealTypeSection enabledConfigs={configs.filter((c) => c.enabled)} sealType={sealType} setSealType={setSealType} alsoLegalRep={alsoLegalRep} setAlsoLegalRep={setAlsoLegalRep} />
      <MatterLinkSection preset={preset} matters={matters} matterId={matterId} setMatterId={setMatterId} />
      <div className="md:col-span-2">
        <PurposeSection purposePreset={purposePreset} setPurposePreset={setPurposePreset} purposeOther={purposeOther} setPurposeOther={setPurposeOther} />
      </div>
      <DocumentTitleField documentTitle={documentTitle} setDocumentTitle={setDocumentTitle} />
      <PageOptionsSection pageCount={pageCount} setPageCount={setPageCount} copies={copies} setCopies={setCopies} crossPage={crossPage} setCrossPage={setCrossPage} urgency={urgency} setUrgency={setUrgency} />
      <RequestNoteSection requestNote={requestNote} setRequestNote={setRequestNote} />
      <FileUploadSection file={file} onFileChange={setFile} hasExisting={!!preset?.draftDocId} />
      <FormFooter pending={pending} onCancel={() => onOpenChange(false)} onSubmit={submit} />
    </div>
  );
}
