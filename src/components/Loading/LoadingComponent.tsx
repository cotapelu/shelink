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
import { Loader2 } from "lucide-react";

export default function LoadingComponent() {
  return (
    <main className="max-w-5xl mx-auto flex-1 overflow-auto bg-stone-50/50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-200/50 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
            <Loader2 className="size-8 text-amber-600 animate-spin" />
          </div>
        </div>
        <p className="text-stone-500 font-medium animate-pulse">
          Đang tải dữ liệu gia phả...
        </p>
      </div>
    </main>
  );
}
