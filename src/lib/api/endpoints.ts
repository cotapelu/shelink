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
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Persons (Members)
  PERSONS: '/persons',
  PERSONS_LIST: '/persons',
  PERSON_BY_ID: (id: string) => `/persons/${id}`,
  PERSONS_CREATE: '/persons',
  PERSONS_UPDATE: (id: string) => `/persons/${id}`,
  PERSONS_DELETE: (id: string) => `/persons/${id}`,

  // Relationships
  RELATIONSHIPS: '/relationships',
  RELATIONSHIPS_LIST: '/relationships',
  RELATIONSHIPS_CREATE: '/relationships',
  RELATIONSHIPS_DELETE: (id: string) => `/relationships/${id}`,

  // Events
  EVENTS: '/events',
  EVENTS_LIST: '/events',
  EVENTS_CREATE: '/events',
  EVENTS_UPDATE: (id: string) => `/events/${id}`,
  EVENTS_DELETE: (id: string) => `/events/${id}`,

  // Stats
  STATS: '/stats',
  STATS_OVERVIEW: '/stats/overview',
  STATS_GENERATIONS: '/stats/generations',
  STATS_AGE_DISTRIBUTION: '/stats/age-distribution',

  // Users (Admin)
  USERS: '/users',
  USERS_LIST: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_UPDATE_ROLE: (id: string) => `/users/${id}/role`,
  USER_UPDATE_STATUS: (id: string) => `/users/${id}/status`,
  USER_DELETE: (id: string) => `/users/${id}`,
  USER_CREATE: '/users',

  // Profile (alias for user detail)
  PROFILE_BY_ID: (id: string) => `/users/${id}`,

  // Import/Export
  IMPORT: '/import',
  EXPORT_JSON: '/export/json',
  EXPORT_CSV: '/export/csv',
  EXPORT_GEDCOM: '/export/gedcom',

  // Kinship
  KINSHIP: '/kinship',
  KINSHIP_RELATION: (fromId: string, toId: string) => `/kinship/relation?from=${fromId}&to=${toId}`,
  KINSHIP_CALCULATE: '/kinship/calculate',

  // Lineage
  LINEAGE: '/lineage',
  LINEAGE_TREE: '/lineage/tree',
  LINEAGE_ROOT: '/lineage/root',

  // Tasks (ERP)
  TASKS: '/tasks',
  TASKS_LIST: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  TASKS_CREATE: '/tasks',
  TASKS_UPDATE: (id: string) => `/tasks/${id}`,
  TASKS_DELETE: (id: string) => `/tasks/${id}`,
  TASK_ASSIGN: (taskId: string) => `/tasks/${taskId}/assign`,
  TASK_UNASSIGN: (taskId: string, userId: string) => `/tasks/${taskId}/unassign?userId=${userId}`,

  // Projects (ERP)
  PROJECTS: '/projects',
  PROJECTS_LIST: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  PROJECTS_CREATE: '/projects',
  PROJECTS_UPDATE: (id: string) => `/projects/${id}`,
  PROJECTS_DELETE: (id: string) => `/projects/${id}`,
  PROJECT_MEMBERS: (projectId: string) => `/projects/${projectId}/members`,
} as const;

export default API_ENDPOINTS;
