/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Scale, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "登录 — LawLink"
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-0 lg:grid-cols-2">
      {/* 左侧：品牌区 */}
      <div className="hidden flex-col justify-between rounded-l-lg border border-r-0 border-border bg-muted/30 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">LawLink</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">律师工作台</div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-xs text-primary">{new Date().getFullYear()}</div>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight">
              把精力放在案件本身，
              <br />
              而不是表格里。
            </h2>
            <div className="h-[2px] w-8 bg-primary rounded-full" />
          </div>

          <ul className="space-y-3.5 text-sm text-muted-foreground">
            <Feature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              数据自托管，附件可选加密，不依赖第三方 SaaS
            </Feature>
            <Feature icon={<Sparkles className="h-3.5 w-3.5" />}>
              覆盖收案、冲突检索、多程序串接、财务分成、归档全流程
            </Feature>
            <Feature icon={<Scale className="h-3.5 w-3.5" />}>
              规范案由库（民商事 / 刑事 / 行政）从源头消除字符串歧义
            </Feature>
          </ul>
        </div>

        <div className="text-[11px] text-muted-foreground/70">
          MIT 协议 · 自主部署
        </div>
      </div>

      {/* 右侧：登录卡 */}
      <div className="flex flex-col justify-center rounded-lg border border-border bg-card p-10 lg:rounded-l-none">
        <div className="mb-8">
          <div className="text-xs text-muted-foreground">登录</div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            用您的工作邮箱登录
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
