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
import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Scale, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Đăng nhập — LawLink"
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-0 lg:grid-cols-2">
      {/* Bên trái: khu vực thương hiệu */}
      <div className="hidden flex-col justify-between rounded-l-lg border border-r-0 border-border bg-muted/30 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">LawLink</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Không gian làm việc của luật sư</div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-xs text-primary">{new Date().getFullYear()}</div>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight">
              Để dồn tâm sức cho bản chất vụ việc,
              <br />
              thay vì cho những bảng biểu.
            </h2>
            <div className="h-[2px] w-8 bg-primary rounded-full" />
          </div>

          <ul className="space-y-3.5 text-sm text-muted-foreground">
            <Feature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Dữ liệu tự chủ, tệp đính kèm có thể mã hóa, không phụ thuộc SaaS bên thứ ba
            </Feature>
            <Feature icon={<Sparkles className="h-3.5 w-3.5" />}>
              Bao phủ toàn bộ quy trình: tiếp nhận vụ, tra cứu xung đột, nối tiếp nhiều chương trình, chia hoa hồng tài chính, lưu trữ
            </Feature>
            <Feature icon={<Scale className="h-3.5 w-3.5" />}>
              Kho căn cứ khởi kiện chuẩn hóa (dân sự-thương mại / hình sự / hành chính) loại bỏ mơ hồ ngay từ nguồn
            </Feature>
          </ul>
        </div>

        <div className="text-[11px] text-muted-foreground/70">
          Giấy phép MIT · Tự triển khai
        </div>
      </div>

      {/* Bên phải: thẻ đăng nhập */}
      <div className="flex flex-col justify-center rounded-lg border border-border bg-card p-10 lg:rounded-l-none">
        <div className="mb-8">
          <div className="text-xs text-muted-foreground">Đăng nhập</div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Chào mừng trở lại</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Đăng nhập bằng email công việc của bạn
          </p>
        </div>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
