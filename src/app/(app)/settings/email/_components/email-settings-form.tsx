"use client";

/**
 * Giao diện cấu hình Email giao dịch (TD-F1). Cấu hình đọc từ biến môi trường (không sửa từ UI);
 * chỉ xem trạng thái + gửi email kiểm tra. Không bao giờ hiển thị SMTP_PASS/USER.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { sendTestEmail } from "@/server/settings/email-actions";

export type EmailConfig = {
  configured: boolean;
  host: string | null;
  port: string | null;
  from: string | null;
  secure: boolean;
  hasAuth: boolean;
};

export function EmailSettingsForm({ config }: { config: EmailConfig }) {
  const [to, setTo] = useState("");
  const [pending, startTransition] = useTransition();

  function sendTest() {
    if (!to.trim()) {
      toast.error("Nhập email nhận thử");
      return;
    }
    startTransition(async () => {
      try {
        const res = await sendTestEmail({ to: to.trim() });
        if (res.skipped) {
          toast.info("Chưa cấu hình SMTP — bỏ qua gửi (chỉ gửi thật khi có SMTP_HOST/FROM).");
        } else {
          toast.success(`Đã gửi email kiểm tra tới ${to.trim()}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gửi thất bại");
      }
    });
  }

  return (
    <div className="space-y-4">
      <ConfigPanel config={config} />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-medium">Gửi email kiểm tra</div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Gửi một thư thử tới địa chỉ bạn chọn để xác nhận SMTP hoạt động.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email nhận thử</Label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ban@congty.vn" />
          </div>
          <Button size="sm" className="gap-1.5" onClick={sendTest} disabled={pending}>
            <Mail className="h-3.5 w-3.5" />
            {pending ? "Đang gửi…" : "Gửi thử"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfigPanel({ config }: { config: EmailConfig }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Trạng thái cấu hình SMTP</span>
        {config.configured ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Đã cấu hình
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Chưa cấu hình
          </Badge>
        )}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Cấu hình qua biến môi trường trên máy chủ (không nhập trong giao diện). Mật khẩu/tài khoản SMTP không bao giờ hiển thị.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
        <ConfigItem label="SMTP_HOST" value={config.host} />
        <ConfigItem label="SMTP_PORT" value={config.port} />
        <ConfigItem label="SMTP_FROM" value={config.from} />
        <ConfigItem label="SMTP_SECURE" value={config.secure ? "true" : "mặc định"} />
        <ConfigItem label="Xác thực (SMTP_USER)" value={config.hasAuth ? "có" : "không"} />
        <ConfigItem label="Mật khẩu" value={"•••••• (ẩn)"} />
      </dl>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-[12px] text-foreground">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
