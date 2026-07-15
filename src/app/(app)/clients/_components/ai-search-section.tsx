"use client";

import { useState, useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./client-form-ui";
import { searchEnterpriseCandidates, getEnterpriseDetail, type EnterpriseSearchItem } from "@/server/yuandian/enterprise";
import { toast } from "sonner";
import { Loader2, Sparkles, Search } from "lucide-react";
import { cooperationStatusLabel } from "@/lib/enums";

export function ClientAISearchSection() {
  const { register, setValue } = useFormContext();
  const watchedName = useWatch({ name: "name" }) ?? "";
  const watchedType = useWatch({ name: "type" });

  const [candidates, setCandidates] = useState<EnterpriseSearchItem[] | null>(null);
  const [aiSearching, startAiSearch] = useTransition();
  const [aiFilling, startAiFill] = useTransition();

  function handleAILookup() {
    const name = watchedName.trim();
    if (!name) {
      toast.warning("Vui lòng nhập tên khách hàng trước khi tìm kiếm AI");
      return;
    }
    startAiSearch(async () => {
      try {
        const r = await searchEnterpriseCandidates(name);
        if (!r.configured) {
          toast.error("Chưa cấu hình API Yuandian", {
            description: "Vui lòng cấu hình API Key trong Cài đặt → AI 请在 设置 → AI 与元典 中配置 API Key Yuandian"
          });
          return;
        }
        if (r.items.length === 0) {
          toast.info("Không tìm thấy doanh nghiệp phù hợp", { description: "Thử tên đầy đủ hơn hoặc tên viết tắt" });
          return;
        }
        setCandidates(r.items);
      } catch (err) {
        toast.error("Tìm kiếm thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handlePickCandidate(item: EnterpriseSearchItem) {
    startAiFill(async () => {
      setValue("idNumber", item.creditCode, { shouldDirty: true, shouldValidate: true });
      setValue("name", item.name, { shouldDirty: true });
      setCandidates(null);
      try {
        const r = await getEnterpriseDetail(item.id);
        if (r.configured && r.info) {
          if (r.info.legalRep) setValue("legalRep", r.info.legalRep, { shouldDirty: true });
          if (r.info.address) setValue("address", r.info.address, { shouldDirty: true });
          toast.success(`Đã điền: ${item.name}`);
        }
      } catch (err) {
        toast.warning("Tự động điền pháp lý / địa chỉ thất bại, có thể bổ sung thủ công", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const label = watchedType === "INDIVIDUAL" ? "Số CMND/CCCD" : "Mã số doanh nghiệp";
  const placeholder = watchedType === "INDIVIDUAL" ? "18 位Số CMND/CCCD" : "18 số mã doanh nghiệp";

  return (
    <Field label={label}>
      <div className="space-y-1">
        <div className="flex gap-1">
          <Input
            className="flex-1 font-mono"
            placeholder={placeholder}
            {...register("idNumber")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAILookup}
            disabled={aiSearching || aiFilling}
            className="h-9 shrink-0 gap-1"
            title="Tìm kiếm theo tên khách hàng trên Yuandian, tự động điền mã số / đại diện pháp lý / địa chỉ đăng ký"
          >
            {aiSearching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Tìm kiếm AI
          </Button>
        </div>
        {candidates && candidates.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-1.5">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Search className="h-3 w-3" />共 {candidates.length} 条候选，点击回填
            </div>
            <ul className="space-y-1">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handlePickCandidate(c)}
                    disabled={aiFilling}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary disabled:opacity-50"
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {c.creditCode}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setCandidates(null)}
              className="mt-1 w-full text-[10px] text-muted-foreground hover:text-foreground"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}
