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
 * v0.27: Mở rộng từ "sửa đội ngũ" thành "sửa vụ án".
 *
 * - Thông tin cơ bản: title / nguyên nhân / giá trị tranh chấp / lập trường phía ta (mã hệ thống + ngày tiếp nhận readonly)
 * - Đội ngũ: chủ trì / cộng tác / trợ lý (tiếp tục dùng hiện thực v0.22)
 *
 * Khi lưu sẽ kích hoạt hai server action theo nhu cầu (thông tin cơ bản + đội ngũ).
 */
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { LitigationStanding, MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  userRoleLabel,
  litigationStandingLabel,
  matterCategoryLabel
} from "@/lib/enums";
import {
  standingsByCategory
} from "@/lib/procedures-by-category";
import {
  updateMatterTeam,
  updateMatterBasicInfo
} from "@/server/matters/actions";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";
import { formatDate } from "@/lib/utils";

type UserOption = { id: string; name: string; role: string };

type MatterMeta = {
  internalCode: string;
  intakeDate: Date | null;
  category: MatterCategory;
  title: string;
  causeId: string | null;
  causeFreeText: string | null;
  claimAmount: number | null;
  ourStanding: LitigationStanding | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  matterMeta: MatterMeta;
  currentOwnerId: string;
  currentMembers: { userId: string; role: "LEAD" | "CO_LEAD" | "ASSISTANT"; name: string }[];
  userOptions: UserOption[];
};

export function TeamEditorDialog({
  open,
  onOpenChange,
  matterId,
  matterMeta,
  currentOwnerId,
  currentMembers,
  userOptions
}: Props) {
  // Trường thông tin cơ bản
  const [title, setTitle] = useState(matterMeta.title);
  const [causeId, setCauseId] = useState<string>(matterMeta.causeId ?? "");
  const [causeFreeText, setCauseFreeText] = useState(matterMeta.causeFreeText ?? "");
  const [claimAmount, setClaimAmount] = useState<string>(
    matterMeta.claimAmount === null ? "" : String(matterMeta.claimAmount)
  );
  const [ourStanding, setOurStanding] = useState<LitigationStanding | "">(
    matterMeta.ourStanding ?? ""
  );

  // Trường đội ngũ
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [coLeads, setCoLeads] = useState<string[]>(
    currentMembers.filter((m) => m.role === "CO_LEAD").map((m) => m.userId)
  );
  const [assistants, setAssistants] = useState<string[]>(
    currentMembers.filter((m) => m.role === "ASSISTANT").map((m) => m.userId)
  );

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(matterMeta.title);
      setCauseId(matterMeta.causeId ?? "");
      setCauseFreeText(matterMeta.causeFreeText ?? "");
      setClaimAmount(matterMeta.claimAmount === null ? "" : String(matterMeta.claimAmount));
      setOurStanding(matterMeta.ourStanding ?? "");
      setOwnerId(currentOwnerId);
      setCoLeads(currentMembers.filter((m) => m.role === "CO_LEAD").map((m) => m.userId));
      setAssistants(currentMembers.filter((m) => m.role === "ASSISTANT").map((m) => m.userId));
    }
  }, [open, matterMeta, currentOwnerId, currentMembers]);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const availableStandings = standingsByCategory[matterMeta.category];

  function handleSave() {
    startTransition(async () => {
      try {
        // Thông tin cơ bản: title bắt buộc, các trường khác có thể rỗng
        if (!title.trim()) {
          toast.error("Tên vụ án không được rỗng");
          return;
        }
        const parsedAmount = claimAmount.trim() === "" ? null : Number(claimAmount);
        if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
          toast.error("Định dạng giá trị tranh chấp không đúng");
          return;
        }

        // Nối tiếp: trước thông tin cơ bản, rồi đội ngũ (tránh ghi một phần khi một thao tác lỗi)
        await updateMatterBasicInfo({
          id: matterId,
          title,
          causeId: causeId || "",
          causeFreeText: causeFreeText || "",
          claimAmount: parsedAmount,
          ourStanding: ourStanding || null
        });

        await updateMatterTeam({
          matterId,
          ownerId,
          coLeadIds: coLeads,
          assistantIds: assistants
        });

        toast.success("Đã cập nhật thông tin vụ án");
        onOpenChange(false);
      } catch (err) {
        toast.error("Cập nhật thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sửa vụ án</DialogTitle>
          <DialogDescription className="text-xs">
            Mã hệ thống, ngày tiếp nhận, loại không sửa được; các trường khác do luật sư chủ trì hiện tại duy trì.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Hàng readonly */}
          <section className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <div>
              <div className="text-[10px] text-muted-foreground">Mã hệ thống</div>
              <div className="font-mono">{matterMeta.internalCode}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Ngày tiếp nhận</div>
              <div>{matterMeta.intakeDate ? formatDate(matterMeta.intakeDate) : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Loại</div>
              <div>{matterCategoryLabel[matterMeta.category]}</div>
            </div>
          </section>

          {/* Thông tin cơ bản */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">Thông tin cơ bản</h3>

            <div className="space-y-1.5">
              <Label className="text-xs">Tên vụ án</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên vụ án (khi lưu tự xoá khoảng trắng)"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nguyên nhân</Label>
                <CauseCombobox
                  category={matterMeta.category}
                  value={causeId}
                  onChange={(id) => setCauseId(id)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nguyên nhân text tự do (điền khi không có trong kho chuẩn)</Label>
                <Input
                  value={causeFreeText}
                  onChange={(e) => setCauseFreeText(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Giá trị tranh chấp (VNĐ)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="Giá trị không phải tiền thì để trống"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lập trường tố tụng phía ta</Label>
                <Select
                  value={ourStanding || ""}
                  onValueChange={(v) => setOurStanding(v as LitigationStanding | "")}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Chọn lập trường" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStandings.map((s) => (
                      <SelectItem key={s} value={s}>
                        {litigationStandingLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Đội ngũ */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-medium text-muted-foreground">Đội ngũ đảm nhận</h3>

            <div className="space-y-1.5">
              <Label className="text-xs">Luật sư chủ trì</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {userRoleLabel[u.role as keyof typeof userRoleLabel] ?? u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Luật sư cộng tác (chọn nhiều)</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
                {userOptions
                  .filter((u) => u.id !== ownerId)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-popover"
                    >
                      <Checkbox
                        checked={coLeads.includes(u.id)}
                        onCheckedChange={() => toggle(coLeads, setCoLeads, u.id)}
                      />
                      <span>{u.name}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Trợ lý (chọn nhiều)</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
                {userOptions
                  .filter((u) => u.id !== ownerId && !coLeads.includes(u.id))
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-popover"
                    >
                      <Checkbox
                        checked={assistants.includes(u.id)}
                        onCheckedChange={() => toggle(assistants, setAssistants, u.id)}
                      />
                      <span>{u.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
