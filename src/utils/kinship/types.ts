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
export interface KinshipResult {
  /** Person A gọi Person B là gì */
  aCallsB: string;
  /** Person B gọi Person A là gì */
  bCallsA: string;
  /** Mô tả chi tiết nhánh quan hệ */
  description: string;
  /** Số bậc cách nhau */
  distance: number;
  /** Các bước quan hệ chi tiết */
  pathLabels: string[];
}

export interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

interface RelEdge {
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
}

// Re-export internal types if needed for compute
export type { RelEdge };
