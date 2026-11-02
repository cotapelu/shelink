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

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  CalendarDays,
  ScanLine,
  ChevronDown
} from "lucide-react";
import { DocumentsSection } from "./documents-section";
import type {
  MatterCategory,
  ProcedureType,
  LitigationStanding,
  FeeType,
  PartyRole,
  UserRole,
  BarFilingType
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field } from "./field";
import { FeeSection } from "./fee-section";
import { ClaimSection } from "./claim-section";
import { LawyerSection } from "./lawyer-section";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  matterCategoryLabel,
  procedureTypeLabel,
  feeTypeLabel,
  procedureToStandingOptions,
  userRoleLabel,
  barFilingLabel,
  BAR_FILING_OPTIONS,
  matterCategoryKind,
  PROJECT_BUSINESS_TYPES,
  COUNSEL_TYPES,
  type CategoryKind
} from "@/lib/enums";
import { agencyOptions } from "@/lib/china-regions";
import {
  proceduresByCategory,
  suggestHandlingAgency
} from "@/lib/procedures-by-category";
import { intakeCreateSchema, type IntakeCreateInput } from "@/server/intakes/schemas";
import { createIntake } from "@/server/intakes/actions";
import { uploadDocument } from "@/server/documents/document-upload";
import { parsePleading } from "@/server/ai/parse-pleading";

import {
  recommendCause,
  type CauseRecommendation
} from "@/server/ai/recommend-cause";
import { getEnterpriseDetail, type EnterpriseSearchItem } from "@/server/yuandian/enterprise";
import { cn } from "@/lib/utils";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";
import { CauseAiManualDialog } from "@/app/(app)/matters/_components/cause-ai-manual-dialog";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";
import { ClientCombobox } from "./client-combobox";
import { CauseRecommendationDialog } from "./cause-recommendation-dialog";
import { JurisdictionSelect } from "./jurisdiction-select";
import { useAutoTitleSuggestion } from "./use-auto-title";
import { PartiesSection } from "./parties-section";
import { useIntakeFormStates } from "./use-intake-form-states";

const CATEGORIES: MatterCategory[] = [
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
];



// Khi phía ta là bên bị động, có thể tải đơn khởi kiện/đơn yêu cầu để OCR nhận diện bên đối phương
const RECEIVING_STANDINGS = new Set<LitigationStanding>([
  "DEFENDANT",
  "JOINT_DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLEE",
  "RETRIAL_RESPONDENT",
  "EXECUTED_PERSON",
  "ARBITRATION_RESPONDENT",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "CRIMINAL_DEFENDANT"
]);

const defaults: IntakeCreateInput = {
  title: "",
  category: "CIVIL_COMMERCIAL",
  causeId: "",
  causeFreeText: "",
  description: "",
  receivedAt: new Date(),
  firstProcedureType: undefined,
  firstAgency: "",
  jurisdiction: "",
  ourStanding: undefined,
  claimAmount: undefined,
  claimDescription: "",
  barFiling: undefined,
  counterclaim: false,
  clientId: "",
  clientName: "",
  clientType: "INDIVIDUAL",
  contactName: "",
  contactPhone: "",
  feeType: undefined,
  feeAmount: undefined,
  contingencyTerms: "",
  feeSchedule: "",
  feeNote: "",
  ownerUserId: "",
  coUserIds: [],
  parties: [
    {
      role: "CLIENT_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    },
    {
      role: "OPPOSING_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    }
  ]
};

export type Colleague = { id: string; name: string; role: UserRole };

export function IntakeSheet({
  open,
  onOpenChange,
  clientOptions,
  colleagues
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientOptions: ClientOption[];
  colleagues: Colleague[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [contracts, setContracts] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pleadingRef = useRef<HTMLInputElement>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [aiRecOpen, setAiRecOpen] = useState(false);
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecCandidates, setAiRecCandidates] = useState<CauseRecommendation[]>([]);
  const [aiRecError, setAiRecError] = useState<string | null>(null);
  const [aiRecSituation, setAiRecSituation] = useState<{
    category: MatterCategory;
    text: string;
  } | null>(null);
  const [aiManualOpen, setAiManualOpen] = useState(false);

  const methods = useForm<IntakeCreateInput>({
    resolver: zodResolver(intakeCreateSchema),
    defaultValues: { ...defaults, ownerUserId: session?.user?.id ?? "" }
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = methods;

  const { fields: parties, append: appendParty, remove: removeParty } = useFieldArray({
    control,
    name: "parties"
  });

  // Aggregate all watched fields via custom hook
  const {
    category,
    firstProcedureType,
    clientId,
    feeType,
    ownerUserId,
    coUserIds,
    receivedAt,
    jurisdiction,
    firstAgency: watchedFirstAgency,
    barFiling,
    counterclaim,
    ourStanding,
    businessType,
    serviceStart,
    serviceEnd,
    counselType,
    parties: watchedParties,
    causeFreeText: watchedCauseFree,
    claimAmount: watchedClaimAmount,
    claimDescription: watchedClaimDescription,
    causeId: watchedCauseId,
  } = useIntakeFormStates(control);

  // Cơ quan giải quyết tranh chấp khớp theo địa giới
  const agencyOpts = useMemo(() => agencyOptions(jurisdiction), [jurisdiction]);

  // v0.31: Loại vụ quyết định cấu trúc form (tố tụng/trọng tài vs phi tố tụng/chuyên đề vs tư vấn)
  const kind: CategoryKind = matterCategoryKind(category);
  const nameLabel =
    kind === "counsel" ? "Tên vấn đề tư vấn" : kind === "project" ? "Tên dự án" : "Tên vụ án";



  // Auto-title suggestion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [causeName, setCauseName] = useState("");
  // Truyền control/setValue trực tiếp: hook này gọi ở component body, NGOÀI
  // <FormProvider> render bên dưới, nên useFormContext trả null
  const { setTitleTouched } = useAutoTitleSuggestion({
    control: methods.control,
    setValue: methods.setValue
  });

  // Các thủ tục có thể chọn của loại hiện tại
  const procedureOptions: ProcedureType[] = useMemo(
    () => proceduresByCategory[category] ?? [],
    [category]
  );

  // Lập trường tố tụng có thể chọn của thủ tục hiện tại
  const ourStandingOptions: LitigationStanding[] = useMemo(
    () => procedureToStandingOptions(firstProcedureType, "ours"),
    [firstProcedureType]
  );
  // Lập trường của bên đối phương / người thứ ba cũng thay đổi theo thủ tục hiện tại
  const oppositeStandingOptions: LitigationStanding[] = useMemo(
    () => procedureToStandingOptions(firstProcedureType, "opposite"),
    [firstProcedureType]
  );

  // Khi đổi loại, nếu thủ tục hiện tại không có trong danh sách loại mới thì xóa
  useEffect(() => {
    if (firstProcedureType && !procedureOptions.includes(firstProcedureType)) {
      setValue("firstProcedureType", undefined);
      setValue("ourStanding", undefined);
    }
  }, [category, firstProcedureType, procedureOptions, setValue]);

  // v0.31: Khi đổi loại thì đồng bộ dòng các bên
  // Tư vấn / phi tố tụng / chuyên đề: mặc định chỉ giữ một dòng bên ủy quyền (bên đối phương thêm khi cần)
  // Tố tụng/Trọng tài: đảm bảo ít nhất một dòng bên đối phương
  useEffect(() => {
    const cur = (watchedParties ?? []) as { role?: string }[];
    if (kind === "counsel" || kind === "project") {
      for (let i = cur.length - 1; i >= 1; i--) removeParty(i);
    } else if (!cur.some((x) => x.role === "OPPOSING_PARTY")) {
      appendParty({
        role: "OPPOSING_PARTY",
        standing: undefined,
        ordinal: cur.length + 1,
        partyType: "NATURAL_PERSON",
        name: "",
        idNumber: "",
        enterpriseSocialCode: "",
        enterpriseName: "",
        phone: "",
        address: "",
        legalRep: "",
        contactName: "",
        notes: ""
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Đặt owner mặc định
  useEffect(() => {
    if (!ownerUserId && session?.user?.id) {
      setValue("ownerUserId", session.user.id);
    }
  }, [ownerUserId, session, setValue]);

  // Khi đổi thủ tục thì tự điền cơ quan gợi ý (chỉ khi rỗng)
  function handleProcedureChange(p: ProcedureType) {
    setValue("firstProcedureType", p, { shouldDirty: true });
    setValue("ourStanding", undefined);
    const currentAgency = watchedFirstAgency;
    if (!currentAgency || currentAgency.length === 0) {
      setValue("firstAgency", suggestHandlingAgency(p));
    }
  }

  async function performSubmit(values: IntakeCreateInput) {
    try {
      const res = await createIntake(values);
      if (contracts.length > 0 && res.id) {
        for (const file of contracts) {
          const fd = new FormData();
          fd.set("intakeId", res.id);
          fd.set("name", file.name);
          fd.set("category", "CONTRACT");
          fd.set("encrypted", "true");
          fd.set("file", file);
          await uploadDocument(fd);
        }
      }
      toast.success(
        contracts.length > 0
          ? `Đã gửi tiếp nhận chờ duyệt, tải lên ${contracts.length} hợp đồng`
          : "Đã gửi tiếp nhận chờ duyệt"
      );
      reset({ ...defaults, ownerUserId: session?.user?.id ?? "" });
      setTitleTouched(false);
      setCauseName("");
      setContracts([]);
      onOpenChange(false);
      if (res.id) router.push(`/intakes/${res.id}`);
    } catch (err) {
      toast.error("Tạo thất bại", {
        description: err instanceof Error ? err.message : ""
      });
    }
  }

  function onSubmit(values: IntakeCreateInput) {
    // Bên ủy quyền luôn là parties[0] (role=CLIENT_PARTY): tách về trường client* tầng cao, phần còn lại vào parties.
    // Tên + số giấy tờ bắt buộc do zodResolver(partyInputSchema) kiểm tra thống nhất mỗi dòng.
    const all = values.parties ?? [];
    const client = all.find((p) => p.role === "CLIENT_PARTY");
    if (!client || !client.name?.trim()) {
      toast.warning("Vui lòng nhập khách hàng", { description: "Tên khách hàng bắt buộc" });
      return;
    }
    const isOrg = client.partyType === "ORGANIZATION";
    const payload: IntakeCreateInput = {
      ...values,
      clientName: client.name.trim(),
      clientType: isOrg ? "COMPANY" : "INDIVIDUAL",
      clientIdNumber: (isOrg ? client.enterpriseSocialCode : client.idNumber) ?? "",
      clientAddress: client.address ?? "",
      clientLegalRep: client.legalRep ?? "",
      contactName: client.contactName ?? "",
      contactPhone: client.phone ?? "",
      parties: all.filter((p) => p.role !== "CLIENT_PARTY")
    };
    startTransition(() => performSubmit(payload));
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length) toast.warning("Đã bỏ qua tệp vượt 20MB");
    setContracts((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePleadingFile(file: File) {
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await parsePleading(fd);
      let added = 0;
      for (const p of res.plaintiffs) {
        // Khi OCR, đoán loại chủ thể theo độ dài idNumber / việc có người đại diện: 18 ký tự có chữ thường là mã số thuế → công ty
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (p.legalRep && p.legalRep.trim()) || (p.idNumber && p.idNumber.length === 18 && /[A-Z]/.test(p.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "OPPOSING_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "OPPOSING_PARTY").length + 1 + added,
          partyType: guessed,
          name: p.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? p.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? p.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? p.name ?? "" : "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          legalRep: p.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        added++;
      }
      let thirdAdded = 0;
      for (const tp of res.thirdParties) {
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (tp.legalRep && tp.legalRep.trim()) || (tp.idNumber && tp.idNumber.length === 18 && /[A-Z]/.test(tp.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "THIRD_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "THIRD_PARTY").length + 1 + thirdAdded,
          partyType: guessed,
          name: tp.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? tp.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? tp.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? tp.name ?? "" : "",
          phone: tp.phone ?? "",
          address: tp.address ?? "",
          legalRep: tp.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        thirdAdded++;
      }
      if (res.cause && !watchedCauseFree) {
        setValue("causeFreeText", res.cause, { shouldDirty: true });
      }
      if (typeof res.claimAmount === "number" && !watchedClaimAmount) {
        setValue("claimAmount", res.claimAmount, { shouldDirty: true });
      }
      if (res.claimDescription && !watchedClaimDescription) {
        setValue("claimDescription", res.claimDescription, { shouldDirty: true });
      }
      if (res.court && !watchedFirstAgency) {
        setValue("firstAgency", res.court, { shouldDirty: true });
      }
      toast.success(
        `Đã nhận diện ${res.plaintiffs.length} nguyên đơn / ${res.thirdParties.length} người thứ ba`,
        { description: "Vui lòng kiểm tra lại các trường có chính xác" }
      );

      // Sau OCR thì gọi AI gợi ý nguyên nhân (chỉ khi OCR trích được cause / claimDescription)
      const situationParts: string[] = [];
      if (res.cause) situationParts.push(`Nguyên nhân nhận diện OCR: ${res.cause}`);
      if (res.claimDescription) situationParts.push(`Yêu cầu khởi kiện: ${res.claimDescription}`);
      const oppPartyNames = res.plaintiffs.map((p) => p.name).filter(Boolean).join("、");
      if (oppPartyNames) situationParts.push(`Các bên đối phương: ${oppPartyNames}`);
      if (res.court) situationParts.push(`Địa giới: ${res.court}`);
      const situationText = situationParts.join("\n");
      if (situationText && !watchedCauseId) {
        triggerCauseRecommendation(category, situationText);
      }
    } catch (err) {
      toast.error("Nhận diện thất bại", {
        description: err instanceof Error ? err.message : ""
      });
    } finally {
      setOcrPending(false);
      if (pleadingRef.current) pleadingRef.current.value = "";
    }
  }

  async function triggerCauseRecommendation(
    cat: MatterCategory,
    situation: string
  ) {
    setAiRecSituation({ category: cat, text: situation });
    setAiRecOpen(true);
    setAiRecLoading(true);
    setAiRecError(null);
    setAiRecCandidates([]);
    try {
      const list = await recommendCause({ category: cat, situation });
      setAiRecCandidates(list);
    } catch (err) {
      setAiRecError(err instanceof Error ? err.message : "Gợi ý AI thất bại");
    } finally {
      setAiRecLoading(false);
    }
  }

  function handleAiRecSelect(causeId: string, causeNm: string) {
    setValue("causeId", causeId, { shouldDirty: true });
    setCauseName(causeNm);
    setAiRecOpen(false);
    toast.success("Đã chọn nguyên nhân do AI gợi ý", { description: causeNm });
  }

  function handleAiRecRetry() {
    if (aiRecSituation) {
      triggerCauseRecommendation(aiRecSituation.category, aiRecSituation.text);
    }
  }

  function toggleCo(uid: string) {
    const next = coUserIds.includes(uid)
      ? coUserIds.filter((id) => id !== uid)
      : [...coUserIds, uid];
    setValue("coUserIds", next, { shouldDirty: true });
  }

  async function handlePickYuandian(candidate: EnterpriseSearchItem) {
    // Dòng bên ủy quyền luôn là parties[0]
    setValue("clientId", "", { shouldDirty: true });
    setValue("parties.0.partyType", "ORGANIZATION", { shouldDirty: true });
    setValue("parties.0.name", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseName", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseSocialCode", candidate.creditCode, {
      shouldDirty: true,
      shouldValidate: true
    });

    const tid = toast.loading("Đang lấy thông tin chi tiết doanh nghiệp...", { duration: 10_000 });
    try {
      const res = await getEnterpriseDetail(candidate.id);
      if (res.info) {
        setValue("parties.0.address", res.info.address, { shouldDirty: true });
        setValue("parties.0.legalRep", res.info.legalRep, { shouldDirty: true });
        if (res.info.legalRep && !(watchedParties[0]?.contactName)) {
          setValue("parties.0.contactName", res.info.legalRep, { shouldDirty: true });
        }
        toast.success(
          res.info.legalRep
            ? `Đã điền: Người đại diện ${res.info.legalRep}`
            : "Đã điền thông tin doanh nghiệp",
          { id: tid }
        );
      } else {
        toast.info("Không tìm thấy thông tin chi tiết, đã điền thông tin cơ bản", { id: tid });
      }
    } catch {
      toast.error("Lấy thông tin doanh nghiệp thất bại, vui lòng bổ sung tay", { id: tid });
    }
  }

  // Trường Luật sư chủ trì / Cộng tác viên / Ghi nhận Hiệp hội / Phản tố (dùng lại nhiều nơi)
  function leadField() {
    return (
      <Field label="Luật sư chủ trì" required>
        <Select
          value={ownerUserId ?? ""}
          onValueChange={(v) => setValue("ownerUserId", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Chọn luật sư chủ trì" />
          </SelectTrigger>
          <SelectContent>
            {colleagues.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  function coLeadField() {
    return (
      <Field label="Cộng tác viên (chọn nhiều)">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between rounded-sm bg-background font-normal"
            >
              <span className="truncate">
                {coUserIds.length === 0 ? (
                  <span className="text-muted-foreground">Chọn cộng tác viên</span>
                ) : (
                  colleagues
                    .filter((u) => coUserIds.includes(u.id))
                    .map((u) => u.name)
                    .join("、")
                )}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            portalled={false}
            className="w-[--radix-popover-trigger-width] p-1.5"
          >
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {colleagues.filter((u) => u.id !== ownerUserId).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Chưa có cộng tác viên nào</p>
              ) : (
                colleagues
                  .filter((u) => u.id !== ownerUserId)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={coUserIds.includes(u.id)}
                        onCheckedChange={() => toggleCo(u.id)}
                      />
                      <span>{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {userRoleLabel[u.role]}
                      </span>
                    </label>
                  ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </Field>
    );
  }

  function barFilingField() {
    return (
      <Field label="Có cần ghi nhận với Hiệp hội luật sư">
        <Select
          value={barFiling ?? ""}
          onValueChange={(v) => setValue("barFiling", v as BarFilingType, { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Chọn" />
          </SelectTrigger>
          <SelectContent>
            {BAR_FILING_OPTIONS.map((b) => (
              <SelectItem key={b} value={b}>
                {barFilingLabel[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  function counterclaimField() {
    return (
      <Field label="Có phản tố">
        <Select
          value={counterclaim ? "yes" : "no"}
          onValueChange={(v) => setValue("counterclaim", v === "yes", { shouldDirty: true })}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">Không</SelectItem>
            <SelectItem value="yes">Có</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  }

  // Bảng nhập các bên/liên quan (dùng lại theo loại, tố tụng/trọng tài có cột lập trường)
  function renderParties(mode: CategoryKind) {
    return (
      <PartiesSection
        mode={mode}
        parties={parties}
        watchedParties={watchedParties}
        ourStanding={ourStanding}
        ourStandingOptions={ourStandingOptions}
        oppositeStandingOptions={oppositeStandingOptions}
        setValue={setValue}
        errors={errors}
        onRemove={removeParty}
        clientId={clientId}
        clientOptions={clientOptions}
        onPickYuandian={handlePickYuandian}
      />
    );
  }
  const addPartyBtn = (label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      onClick={() =>
        appendParty({
          role: "OPPOSING_PARTY",
          standing: undefined,
          ordinal: parties.length + 1,
          partyType: "NATURAL_PERSON",
          name: "",
          idNumber: "",
          enterpriseSocialCode: "",
          enterpriseName: "",
          phone: "",
          address: "",
          legalRep: "",
          contactName: "",
          notes: ""
        })
      }
    >
      <Plus className="h-3 w-3" />
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[92vw] max-w-[780px] flex-col gap-0 overflow-hidden border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-card px-6 py-4">
          <div className="pr-8">
            {/* Tiêu đề căn hàng với 「Chờ duyệt」 */}
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl">Tạo tiếp nhận mới</DialogTitle>
              <span className="rounded-sm border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Chờ duyệt
              </span>
            </div>
            <DialogDescription className="mt-1 text-sm">
              Sau khi gửi sẽ vào&ldquo;Chờ duyệt&rdquo;, do quản trị / luật sư chủ nhiệm xác nhận rồi chuyển thành vụ án chính thức
            </DialogDescription>
          </div>
        </DialogHeader>

        <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/35 px-6 py-5">
            {/* ① Thông tin cơ bản (dùng chung: loại / tên / tiếp nhận / phụ trách)*/}
            <Section title="Thông tin cơ bản" required>
              {/* Loại vụ | Thời gian tiếp nhận (bằng loại) | Tên vụ (phần còn lại)*/}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
                <Field label="Loại vụ án" required>
                  <Select
                    value={category}
                    onValueChange={(v) => setValue("category", v as MatterCategory)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {matterCategoryLabel[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Thời gian nhận vụ án">
                  <div className="relative">
                    <Input
                      type="date"
                      className="h-10"
                      value={
                        receivedAt ? new Date(receivedAt).toISOString().split("T")[0] : ""
                      }
                      onChange={(e) =>
                        setValue("receivedAt", new Date(e.target.value), { shouldDirty: true })
                      }
                    />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field label={nameLabel} error={errors.title?.message}>
                  {(() => {
                    const titleReg = register("title");
                    return (
                      <Input
                        placeholder="Để trống sẽ tự sinh"
                        className="h-10"
                        {...titleReg}
                        onChange={(e) => {
                          titleReg.onChange(e);
                          setTitleTouched(true);
                        }}
                      />
                    );
                  })()}
                </Field>
              </div>

              {/* Tố tụng/Trọng tài: thông tin tình huống (gộp vào thông tin cơ bản)*/}
              {kind === "litigation" && (
                <>
                {/* Nguyên nhân | Thủ tục hiện tại | Địa giới | Cơ quan giải quyết tranh chấp */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Nguyên nhân vụ án" required>
                    <CauseCombobox
                      category={category}
                      value={watchedCauseId || ""}
                      onChange={(id, name) => {
                        setValue("causeId", id, { shouldDirty: true });
                        setCauseName(name);
                      }}
                    />
                  </Field>
                  <Field label="Thủ tục hiện tại" required error={errors.firstProcedureType?.message}>
                    <Select
                      value={firstProcedureType ?? ""}
                      onValueChange={(v) => handleProcedureChange(v as ProcedureType)}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Chọn thủ tục hiện tại" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedureOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {procedureTypeLabel[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Địa giới">
                    <JurisdictionSelect
                      value={jurisdiction}
                      onChange={(v) => {
                        setValue("jurisdiction", v, { shouldDirty: true });
                        const cur = watchedFirstAgency;
                        if (cur && !agencyOptions(v).includes(cur)) {
                          setValue("firstAgency", "", { shouldDirty: true });
                        }
                      }}
                    />
                  </Field>
                  <Field label="Cơ quan giải quyết tranh chấp">
                    <Select
                      value={watchedFirstAgency || ""}
                      onValueChange={(v) => setValue("firstAgency", v, { shouldDirty: true })}
                      disabled={agencyOpts.length === 0}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder={jurisdiction ? "Chọn cơ quan" : "Chọn địa giới trước"} />
                      </SelectTrigger>
                      <SelectContent>
                        {agencyOpts.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <ClaimSection register={register} />

                {/* Luật sư chủ trì | Cộng tác viên | Có cần ghi nhận với Hiệp hội luật sư | Có phản tố(mỗi ô 1/4)*/}
                <LawyerSection
                  ownerUserId={ownerUserId}
                  coUserIds={coUserIds}
                  barFiling={barFiling}
                  counterclaim={counterclaim ?? false}
                  setValue={setValue}
                  errors={errors}
                  colleagues={colleagues}
                />
              </>
            )}

            {/* Phi tố tụng/Chuyên đề: thông tin dự án (gộp vào thông tin cơ bản)*/}
            {kind === "project" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Loại nghiệp vụ">
                    <Select
                      value={businessType || ""}
                      onValueChange={(v) => setValue("businessType", v, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Chọn loại nghiệp vụ" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Số tiền dự án">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("claimAmount", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Thời gian bắt đầu">
                    <Input
                      type="date"
                      value={
                        serviceStart
                          ? new Date(serviceStart!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceStart",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Thời gian kết thúc">
                    <Input
                      type="date"
                      value={
                        serviceEnd
                          ? new Date(serviceEnd!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceEnd",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Phạm vi / Nội dung dịch vụ" className="sm:col-span-3">
                    <Input
                      placeholder="vd: phạm vi thẩm định, danh mục rà soát hợp đồng, thiết kế cấu trúc giao dịch..."
                      {...register("serviceScope")}
                    />
                  </Field>
                  <Field label="Sản phẩm bàn giao">
                    <Input placeholder="vd: ý kiến pháp lý / báo cáo thẩm định" {...register("deliverables")} />
                  </Field>
                </div>
                {/* Luật sư chủ trì | Cộng tác viên (mỗi ô 1/2)*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {leadField()}
                  {coLeadField()}
                </div>
              </>
            )}

            {/* Tư vấn: thông tin tư vấn (gộp vào thông tin cơ bản)*/}
            {kind === "counsel" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Loại tư vấn">
                    <Select
                      value={counselType || ""}
                      onValueChange={(v) => setValue("counselType", v, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Chọn loại tư vấn" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNSEL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Hạn tư vấn · từ">
                    <Input
                      type="date"
                      value={
                        serviceStart
                          ? new Date(serviceStart!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceStart",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Hạn tư vấn · đến">
                    <Input
                      type="date"
                      value={
                        serviceEnd
                          ? new Date(serviceEnd!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceEnd",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Điện thoại đầu mối">
                    <Input className="font-mono" placeholder="SĐT người đầu mối" {...register("contactPhone")} />
                  </Field>
                </div>
                <Field label="Phạm vi / Nội dung dịch vụ">
                  <Input
                    placeholder="vd: tư vấn pháp lý thường xuyên, rà soát hợp đồng, ý kiến pháp lý chuyên đề..."
                    {...register("serviceScope")}
                  />
                </Field>
                {/* Luật sư chủ trì | Cộng tác viên (mỗi ô 1/2)*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {leadField()}
                  {coLeadField()}
                </div>
              </>
            )}
            </Section>

            {/* ③ Các bên / liên quan (theo loại)*/}
            {kind === "litigation" && (
            <Section
              title="Bên liên quan vụ án"
              required
              headerAction={addPartyBtn("Thêm bên tham gia")}
            >
              {ourStanding && RECEIVING_STANDINGS.has(ourStanding!) && (
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        <ScanLine className="mr-1 inline h-3 w-3 text-primary" />
                        Nhận diện đơn khởi kiện / đơn yêu cầu
                      </div>
                      <p className="mt-0.5">
                        Phía ta là bên bị động, có thể tải đơn khởi kiện/đơn yêu cầu của bên đối phương (JPG / PNG / WebP / PDF, ≤ 20MB), AI tự trích chủ thể và yêu cầu của bên đối phương
                      </p>
                    </div>
                    <input
                      ref={pleadingRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePleadingFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => pleadingRef.current?.click()}
                      disabled={ocrPending}
                      className="h-7 shrink-0 gap-1"
                    >
                      {ocrPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ScanLine className="h-3 w-3" />
                      )}
                      Tải lên nhận diện
                    </Button>
                  </div>
                </div>
              )}

              {renderParties("litigation")}
            </Section>
            )}

            {/* ③ Phi tố tụng/Chuyên đề: bên ủy quyền và bên đối phương (không có lập trường)*/}
            {kind === "project" && (
              <Section title="② Bên ủy quyền và bên đối phương" headerAction={addPartyBtn("Thêm bên đối phương")}>
                {renderParties("project")}
              </Section>
            )}

            {/* ③ Tư vấn: Đơn vị tư vấn */}
            {kind === "counsel" && (
              <Section title="② Đơn vị tư vấn" required>
                {renderParties("counsel")}
              </Section>
            )}

            {/* 3. Phí luật sư */}
            <Section title={kind === "counsel" ? "Phí tư vấn" : "Phí luật sư"}>
              <FeeSection
                kind={kind}
                feeType={feeType}
                register={register}
                setValue={setValue}
                errors={errors}
              />
            </Section>

            <DocumentsSection
              contracts={contracts}
              onContractsChange={setContracts}
              ocrPending={ocrPending}
              onOcrPendingChange={setOcrPending}
              onPleadingFile={handlePleadingFile}
            />
          </div>

          <DialogFooter className="border-t border-border bg-card px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5 px-5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi xét duyệt
            </Button>
          </DialogFooter>
        </form>
        </FormProvider>
      </DialogContent>
      <CauseRecommendationDialog
        open={aiRecOpen}
        loading={aiRecLoading}
        candidates={aiRecCandidates}
        errorMessage={aiRecError}
        onSelect={handleAiRecSelect}
        onOpenChange={setAiRecOpen}
        onRetry={handleAiRecRetry}
      />
      <CauseAiManualDialog
        open={aiManualOpen}
        onOpenChange={setAiManualOpen}
        category={category}
        contextHints={(() => {
          const lines: string[] = [];
          const cf = watchedCauseFree;
          if (cf) lines.push(`Nguyên nhân nhận diện OCR: ${cf}`);
          const cd = watchedClaimDescription;
          if (cd) lines.push(`Yêu cầu khởi kiện: ${cd}`);
          const opp = parties
            .filter((p) => p.role === "OPPOSING_PARTY")
            .map((p) => p.name)
            .filter(Boolean);
          if (opp.length) lines.push(`Các bên đối phương: ${opp.join("、")}`);
          return lines.join("\n");
        })()}
        onSelect={handleAiRecSelect}
      />
    </Dialog>
  );
}

function Section({
  title,
  required,
  headerAction,
  children
}: {
  title: string;
  required?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Tách dạng "① Loại vụ án" thành số La Mã + tiêu đề
  const match = title.match(/^([①-⑨])\s+(.+)$/);
  const map: Record<string, string> = {
    "①": "I",
    "②": "II",
    "③": "III",
    "④": "IV",
    "⑤": "V",
    "⑥": "VI",
    "⑦": "VII",
    "⑧": "VIII",
    "⑨": "IX"
  };
  const roman = match ? map[match[1]] : null;
  const text = match ? match[2] : title;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-ll-low">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5">
          {roman && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-primary/10 px-1.5 text-[0.68rem] font-semibold text-primary">
              {roman}
            </span>
          )}
          <span className="text-base font-semibold tracking-tight">
            {text}
            {required && <span className="ml-1 text-destructive">*</span>}
          </span>
        </h3>
        {headerAction}
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}


