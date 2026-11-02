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

import { useState, useTransition } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveAiSettingsAction,
  clearAiKeyAction,
  testAiConnection
} from "@/server/settings/ai-actions";

type Initial = {
  configured: boolean;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  apiKeyMasked: string;
};

const PROVIDER_PRESETS = [
  {
    name: "通义千问（推荐）",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    text: "qwen-turbo",
    vision: "qwen-vl-max",
    apply: "Lấy key ở console Alibaba Bailian",
    link: "https://bailian.console.aliyun.com/"
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    text: "deepseek-v4-flash",
    vision: "deepseek-v4-flash",
    apply: "Lấy key trên nền tảng DeepSeek",
    link: "https://platform.deepseek.com/api_keys"
  },
  {
    name: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    text: "moonshot-v1-8k",
    vision: "moonshot-v1-8k-vision-preview",
    apply: "Lấy key trên nền tảng Moonshot",
    link: "https://platform.moonshot.cn/"
  },
  {
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    text: "glm-4-flash",
    vision: "glm-4v",
    apply: "Lấy key trên nền tảng mở 智谱",
    link: "https://open.bigmodel.cn/"
  },
  {
    name: "Ollama trên máy",
    baseUrl: "http://localhost:11434/v1",
    text: "qwen2.5:7b",
    vision: "llava:7b",
    apply: "Chạy ollama trên máy là dùng được, không cần key",
    link: "https://ollama.com/"
  }
] as const;

export function AiSettingsForm({
  initial,
  defaults
}: {
  initial: Initial;
  defaults: { baseUrl: string; textModel: string; visionModel: string };
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || defaults.baseUrl);
  const [textModel, setTextModel] = useState(initial.textModel || defaults.textModel);
  const [visionModel, setVisionModel] = useState(initial.visionModel || defaults.visionModel);
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const applyPreset = (p: (typeof PROVIDER_PRESETS)[number]) => {
    setBaseUrl(p.baseUrl);
    setTextModel(p.text);
    setVisionModel(p.vision);
    toast.info(`Đã áp cấu hình mặc định ${p.name}, hãy điền API key tương ứng`);
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveAiSettingsAction({
          apiKey,
          baseUrl,
          textModel,
          visionModel
        });
        toast.success("Đã lưu cấu hình");
        setApiKey(""); // Không lưu key ở frontend
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      }
    });
  };

  const clearKey = () => {
    if (!confirm("Xác nhận xoá API key đã lưu? Mọi chức năng phụ thuộc AI sẽ ngừng hoạt động.")) return;
    startTransition(async () => {
      try {
        await clearAiKeyAction({ confirm: true });
        toast.success("Đã xoá API key");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Thất bại");
      }
    });
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection();
      if (res.ok) {
        setTestResult({ ok: true, msg: `Kết nối thành công, model trả lời: "${res.reply}"` });
      } else {
        setTestResult({ ok: false, msg: res.message ?? "Lỗi không rõ" });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "Lỗi mạng" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <h2 className="text-lg">Tích hợp AI</h2>
          {initial.configured && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Đã cấu hình
            </span>
          )}
        </header>

        <p className="mb-4 text-[12px] text-muted-foreground">
          Đi theo giao thức tương thích OpenAI, hỗ trợ mọi endpoint tương thích. Sau khi cấu hình sẽ bật được:
          <span className="text-foreground/85"> OCR hóa đơn · Phân tích tăng cường AI cho tin nhắn toà án</span>
          (các module sau cũng dùng lại chung một bộ cấu hình này)
        </p>

        {/* Preset provider */}
        <div className="mb-4">
          <Label className="text-[11px]">Preset nhanh</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROVIDER_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">
              API Key
              {initial.configured && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  Hiện tại: {initial.apiKeyMasked} (để trống thì giữ giá trị cũ)
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initial.configured ? "Cần đổi thì dán key mới" : "Dán API key"}
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <Label className="text-[11px]">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={defaults.baseUrl}
              className="mt-1 font-mono text-[12px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Model văn bản</Label>
              <Input
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                placeholder={defaults.textModel}
                className="mt-1 font-mono text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Dùng cho phân tích AI tin nhắn toà án...</p>
            </div>
            <div>
              <Label className="text-[11px]">Model thị giác</Label>
              <Input
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                placeholder={defaults.visionModel}
                className="mt-1 font-mono text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Dùng cho OCR hóa đơn...</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={save} disabled={pending} className="gap-1.5">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu cấu hình
          </Button>
          <Button
            variant="outline"
            onClick={runTest}
            disabled={testing || !initial.configured}
            className="gap-1.5"
          >
            {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Kiểm tra kết nối
          </Button>
          {initial.configured && (
            <Button
              variant="ghost"
              onClick={clearKey}
              disabled={pending}
              className="ml-auto gap-1 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Xoá key
            </Button>
          )}
        </div>

        {testResult && (
          <div
            className={
              "mt-3 flex items-start gap-2 rounded-md border p-3 text-[12px] " +
              (testResult.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                : "border-destructive/30 bg-destructive/10 text-destructive")
            }
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{testResult.msg}</span>
          </div>
        )}
      </section>

      <section className="ll-surface rounded-lg border border-border p-5">
        <h3 className="mb-3 text-base">Lấy API key</h3>
        <ul className="space-y-2 text-[12px]">
          {PROVIDER_PRESETS.map((p) => (
            <li key={p.name} className="flex items-baseline gap-3">
              <span className="w-28 shrink-0 text-foreground/85">{p.name}</span>
              <span className="text-muted-foreground">{p.apply}</span>
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
              >
                Mở
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Khoá mã hoá AES-256-GCM lưu vào SystemSetting, dùng chung một khoá với mã hoá tài liệu (
          <span className="font-mono">STORAGE_ENCRYPTION_KEY</span>). Frontend không bao giờ hiện key plaintext.
        </p>
      </section>
    </div>
  );
}
