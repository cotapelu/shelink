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

import { useRef, useState, useTransition } from "react";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  parseMatterImportAction,
  commitMatterImportAction,
  type ImportPreview,
  type ImportResult
} from "@/server/imports/actions";

export function MatterImportView() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, startParse] = useTransition();
  const [importing, startImport] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startParse(async () => {
      try {
        const p = await parseMatterImportAction(fd);
        setPreview(p);
      } catch (e) {
        setPreview(null);
        toast.error(e instanceof Error ? e.message : "Phân tích thất bại");
      }
    });
  };

  const doImport = () => {
    if (!preview) return;
    const valid = preview.rows.filter((r) => r.valid).map((r) => ({ rowNo: r.rowNo, raw: r.raw }));
    if (valid.length === 0) {
      toast.error("Không có dòng hợp lệ nào để import");
      return;
    }
    startImport(async () => {
      try {
        const res = await commitMatterImportAction({ rows: valid });
        setResult(res);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        toast.success(`Import xong: thành công ${res.succeeded.length}, thất bại ${res.failed.length}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import thất bại");
      }
    });
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Import hàng loạt vụ án</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Tải mẫu Excel, điền rồi tải lên → xem trước kiểm tra (dòng lỗi sẽ tô đỏ, chỉ import dòng không lỗi) → xác nhận import.
          Mỗi dòng sẽ tạo khách hàng (tra trùng theo tên+số giấy tờ), vụ án (tự mã + mã nội bộ + chủ trì), các bên (điều khiển kiểm tra xung đột lợi ích),
          vụ án「đang xử lý」tự sinh thủ tục đầu theo loại.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/imports/matters/template" download>
            <Button variant="outline" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Tải mẫu
            </Button>
          </a>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-1.5">
            {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Tải lên và xem trước
          </Button>
          {fileName && <span className="text-[12px] text-muted-foreground">{fileName}</span>}
        </div>
      </section>

      {/* —— Xem trước —— */}
      {preview && (
        <section className="ll-surface rounded-lg border border-border p-5">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">
              Xem trước
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                Tổng {preview.total} dòng · Import được{" "}
                <span className="text-emerald-700">{preview.validCount}</span> · Lỗi{" "}
                <span className={preview.total - preview.validCount > 0 ? "text-destructive" : ""}>
                  {preview.total - preview.validCount}
                </span>
              </span>
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Huỷ
              </Button>
              <Button size="sm" onClick={doImport} disabled={importing || preview.validCount === 0} className="gap-1.5">
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Xác nhận import {preview.validCount} dòng
              </Button>
            </div>
          </header>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="whitespace-nowrap px-2 py-1.5 font-medium">Dòng</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-medium">Kiểm tra</th>
                  {preview.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-2 py-1.5 font-medium">
                      {c.header}
                      {c.required && <span className="text-destructive">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr
                    key={r.rowNo}
                    className={r.valid ? "border-b border-border" : "border-b border-border bg-destructive/5"}
                  >
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.rowNo}</td>
                    <td className="px-2 py-1.5">
                      {r.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-destructive"
                          title={r.errors.join("；")}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="max-w-[220px] truncate">{r.errors.join("；")}</span>
                        </span>
                      )}
                    </td>
                    {preview.columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-2 py-1.5">
                        {r.raw[c.key] || <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* —— Kết quả —— */}
      {result && (
        <section className="ll-surface rounded-lg border border-border p-5">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">
              Kết quả import · Thành công <span className="text-emerald-700">{result.succeeded.length}</span> · Thất bại{" "}
              <span className={result.failed.length > 0 ? "text-destructive" : ""}>{result.failed.length}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={reset}>
              Import một lô nữa
            </Button>
          </header>

          {result.succeeded.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[12px] text-muted-foreground">Đã tạo thành công:</p>
              <ul className="space-y-0.5 text-[12px]">
                {result.succeeded.map((s) => (
                  <li key={s.rowNo} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span className="font-mono text-muted-foreground">dòng {s.rowNo}</span>
                    <span className="font-mono">{s.internalCode}</span>
                    {s.firmCaseNo && <span className="font-mono text-muted-foreground">{s.firmCaseNo}</span>}
                    <span className="truncate">{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.failed.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] text-destructive">Dòng lỗi:</p>
              <ul className="space-y-0.5 text-[12px]">
                {result.failed.map((f) => (
                  <li key={f.rowNo} className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="font-mono">dòng {f.rowNo}</span>
                    <span>{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
