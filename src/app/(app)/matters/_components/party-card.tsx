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

/**
 * Dòng bảng chủ thể tham gia của vụ án (chỉ dùng cho intake-sheet)
 *
 * Tham khảo bảng chủ thể trong biểu mẫu tạo hồ sơ kiểu “vụ án điện tử”: mỗi dòng một chủ thể, các cột canh hàng, trường phụ thu gọn.
 * Cột: vai trò | loại | tên/thương hiệu | tư cách tố tụng | số giấy tờ/mã tin dụng | thao tác
 * - Hai cột vai trò / tư cách tố tụng do bên gọi truyền vào (roleSlot / standingSlot); component này không quan tâm logic lấy giá trị
 * - Loại (cá nhân / tổ chức), giấy tờ (số CMND/CCCD / mã số thuế doanh nghiệp + tra cứu AI), mở trường phụ, xóa do component này lo
 * - Trường phụ (đại diện pháp luật / điện thoại / người liên hệ / địa chỉ / ghi chú) mặc định thu gọn, bấm “Thêm” sẽ mở bên dưới dòng
 *
 * PARTY_GRID dùng chung cho header và mỗi dòng, đảm bảo canh cột.
 *
 * Kiểm tra hợp lệ nằm ở zod superRefine (partyInputSchema); component này chỉ lo UI + liên kết trường.
 */
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { ChevronDown, Loader2, Search, Trash2 } from "lucide-react";
import type { PartyType } from "@prisma/client";
import { toast } from "sonner";
import { partyTypeLabel, PARTY_TYPE_OPTIONS } from "@/lib/enums";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  searchEnterpriseCandidates,
  getEnterpriseDetail,
  type EnterpriseSearchItem
} from "@/server/yuandian/enterprise";

/** Dùng chung cho header và mỗi dòng, đảm bảo canh cột. Loại tố tụng/trọng tài có cột “tư cách tố tụng” (đặt trước người liên hệ). Cột tên/giấy tờ thu hẹp ~15% so với v0 */
export const PARTY_GRID =
  "grid grid-cols-[78px_104px_minmax(150px,1.06fr)_minmax(178px,1.15fr)_116px_104px_126px_40px] items-center gap-2";
/** Phi tố tụng / cố vấn / chuyên đề: không có cột “tư cách tố tụng” */
export const PARTY_GRID_NO_STANDING =
  "grid grid-cols-[78px_104px_minmax(150px,1.06fr)_minmax(178px,1.15fr)_104px_126px_40px] items-center gap-2";

type Props = {
  index: number;
  fieldPrefix: string; // e.g. "parties"
  onRemove: () => void;
  errors?: FieldErrors<Record<string, unknown>>;
  /** Nội dung ô vai trò (huy hiệu bên ủy quyền / dropdown đối phương·người thứ ba) */
  roleSlot: ReactNode;
  /** Nội dung ô tư cách tố tụng (bỏ qua khi showStanding là false) */
  standingSlot?: ReactNode;
  /** Có hiển thị cột “tư cách tố tụng” không. Tố tụng/trọng tài true, phi tố tụng/cố vấn/chuyên đề false. Mặc định true */
  showStanding?: boolean;
  /** false thì ẩn nút xóa (ví dụ dòng bên ủy quyền luôn tồn tại). Mặc định true */
  removable?: boolean;
  /** Khi cung cấp thì thay ô nhập “tên/thương hiệu” mặc định (ví dụ dòng bên ủy quyền chèn bộ chọn khách hàng). */
  nameSlot?: ReactNode;
};

export function PartyCard({
  index,
  fieldPrefix,
  onRemove,
  errors,
  roleSlot,
  standingSlot,
  showStanding = true,
  removable = true,
  nameSlot
}: Props) {
  const { register, watch, setValue } = useFormContext();
  const p = `${fieldPrefix}.${index}`;
  const partyType = (watch(`${p}.partyType`) as PartyType) ?? "NATURAL_PERSON";
  const isOrg = partyType !== "NATURAL_PERSON";

  const [candidates, setCandidates] = useState<EnterpriseSearchItem[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [filling, startFill] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trường phụ đã có nội dung chưa (để hiện gợi ý nhỏ khi thu gọn)
  const secondaryFilled = [
    watch(`${p}.address`),
    watch(`${p}.notes`),
    isOrg ? watch(`${p}.legalRep`) : undefined
  ].filter((v) => typeof v === "string" && v.trim() !== "").length;

  function changeType(next: PartyType) {
    setValue(`${p}.partyType`, next, { shouldDirty: true, shouldValidate: true });
    // Khi đổi loại thì xoá các trường bắt buộc bên còn lại, tránh thông báo lẫn nhau
    if (next === "NATURAL_PERSON") {
      setValue(`${p}.enterpriseSocialCode`, "");
      setValue(`${p}.enterpriseName`, "");
    } else {
      setValue(`${p}.idNumber`, "");
    }
  }

  // v0.43: khi nhập tên tổ chức thì tự khớp doanh nghiệp 元典 (Yuandian) (chống rung), không cần nút AI
  function scheduleSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (q.length < 2) {
      setCandidates(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      startSearch(async () => {
        try {
          const r = await searchEnterpriseCandidates(q);
          // Chưa cấu hình 元典 / không có kết quả → im lặng không làm phiền (mã tin dụng vẫn nhập tay được)
          setCandidates(r.configured && r.items.length > 0 ? r.items : null);
        } catch {
          setCandidates(null);
        }
      });
    }, 400);
  }

  function handlePickCandidate(item: EnterpriseSearchItem) {
    startFill(async () => {
      // Trước tiên điền lại mã tin dụng xã hội + tên doanh nghiệp (kết quả tìm kiếm đã có)
      setValue(`${p}.enterpriseSocialCode`, item.creditCode, { shouldDirty: true, shouldValidate: true });
      setValue(`${p}.enterpriseName`, item.name, { shouldDirty: true });
      setValue(`${p}.name`, item.name, { shouldDirty: true });
      setCandidates(null);

      // Rồi gọi API chi tiết lấy đại diện pháp luật + địa chỉ (10 POINT/lần)
      try {
        const r = await getEnterpriseDetail(item.id);
        if (r.configured && r.info) {
          if (r.info.legalRep) setValue(`${p}.legalRep`, r.info.legalRep, { shouldDirty: true });
          if (r.info.address) setValue(`${p}.address`, r.info.address, { shouldDirty: true });
          setExpanded(true); // Mở ra để người dùng kiểm tra đại diện pháp luật / địa chỉ đã điền
          toast.success(`Đã điền lại: ${item.name}`);
        }
      } catch (err) {
        // Lỗi ở bước chi tiết không chặn; mã tin dụng xã hội đã nhập vẫn có hiệu lực
        toast.warning("Tự động điền đại diện pháp luật / địa chỉ thất bại, có thể bổ sung tay", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const fieldErr = (errors as any)?.[fieldPrefix]?.[index] ?? {};
  const idErr = partyType === "NATURAL_PERSON" ? fieldErr.idNumber : fieldErr.enterpriseSocialCode;
  const nameReg = register(`${p}.name`);

  const grid = showStanding ? PARTY_GRID : PARTY_GRID_NO_STANDING;

  return (
    <div className="rounded-md border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-input">
      <div className={cn(grid, "px-2.5 py-2")}>
        {/* Vai trò */}
        <div className="min-w-0">{roleSlot}</div>

        {/* Loại chủ thể */}
        <Select value={partyType} onValueChange={(v) => changeType(v as PartyType)}>
          <SelectTrigger className="h-9 bg-background px-2.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTY_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {partyTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tên / Thương hiệu (loại tổ chức: nhập vào tự khớp doanh nghiệp 元典) */}
        <div className="min-w-0">
          {nameSlot ?? (
            !isOrg ? (
              <Input
                className="h-9 text-xs"
                placeholder="Họ và tên"
                {...register(`${p}.name`)}
              />
            ) : (
              <Popover
                open={!!candidates && candidates.length > 0}
                onOpenChange={(o) => {
                  if (!o) setCandidates(null);
                }}
              >
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      className="h-9 pr-7 text-xs"
                      placeholder="Tên tổ chức / đơn vị (nhập vào tự khớp)"
                      {...nameReg}
                      onChange={(e) => {
                        nameReg.onChange(e);
                        scheduleSearch(e.target.value);
                      }}
                    />
                    {searching && (
                      <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  portalled={false}
                  className="w-72 p-1.5"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="mb-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                    <Search className="h-3 w-3" />Khớp 元典, bấm để điền lại tên + mã tin dụng
                  </div>
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {candidates?.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handlePickCandidate(c)}
                          disabled={filling}
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary disabled:opacity-50"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{c.creditCode}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            )
          )}
        </div>

        {/* Số giấy tờ / mã tin dụng (tự điền sau khi khớp, cũng nhập tay được) */}
        <div className="min-w-0">
          {!isOrg ? (
            <Input
              placeholder="Số CMND/CCCD (bắt buộc)"
              className={cn("h-9 font-mono text-xs", idErr && "border-destructive")}
              {...register(`${p}.idNumber`)}
            />
          ) : (
            <Input
              placeholder="Mã số thuế doanh nghiệp (bắt buộc)"
              className={cn("h-9 font-mono text-xs", idErr && "border-destructive")}
              {...register(`${p}.enterpriseSocialCode`)}
            />
          )}
        </div>

        {/* Tư cách tố tụng (chỉ loại tố tụng / trọng tài) —— chuyển lên trước người liên hệ */}
        {showStanding && <div className="min-w-0">{standingSlot}</div>}

        {/* Người liên hệ */}
        <Input
          className="h-9 text-xs"
          placeholder="Người liên hệ"
          {...register(`${p}.contactName`)}
        />

        {/* Điện thoại liên hệ */}
        <Input
          className="h-9 font-mono text-xs"
          placeholder="Điện thoại liên hệ"
          {...register(`${p}.phone`)}
        />

        {/* Thao tác: Thêm + Xóa */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Thu gọn" : "Thêm (đại diện pháp luật / địa chỉ / ghi chú)"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              !expanded && secondaryFilled > 0 && "text-primary"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
          {removable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 shrink-0 p-0 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Lỗi các mục bắt buộc (khi thu gọn vẫn phải thấy) */}
      {idErr && (
        <p className="px-2 pb-1.5 text-[10px] text-destructive">{idErr.message as string}</p>
      )}

      {/* Trường phụ (mở rộng) */}
      {expanded && (
        <div className="grid grid-cols-1 gap-2 border-t border-border bg-muted/25 px-2.5 py-2.5 sm:grid-cols-2">
          {isOrg && (
            <Input
              className="h-9 text-sm"
              placeholder="Đại diện pháp luật / người đứng đầu (tùy chọn)"
              {...register(`${p}.legalRep`)}
            />
          )}
          <div className="sm:col-span-2">
            <Input
              className="h-9 text-sm"
              placeholder={isOrg ? "Địa chỉ đăng ký (tùy chọn)" : "Nơi cư trú (tùy chọn)"}
              {...register(`${p}.address`)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input className="h-9 text-sm" placeholder="Ghi chú (tùy chọn)" {...register(`${p}.notes`)} />
          </div>
        </div>
      )}
    </div>
  );
}
