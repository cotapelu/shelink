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
'use client';

import React from 'react';
import { WorkTask } from '@/types';

interface TaskListProps {
  tasks: WorkTask[];
  onEdit?: (task: WorkTask) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-gray-500">No tasks found.</p>;
  }

  return (
    <ul className="space-y-2" data-testid="task-list">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="rounded border p-3 hover:bg-gray-50"
          data-testid="task-item"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-gray-600">{task.description}</p>
              <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs">
                {task.status}
              </span>
            </div>
            <div className="space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="rounded bg-yellow-500 px-3 py-1 text-white"
                  aria-label={`Edit ${task.title}`}
                  data-testid="edit-button"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="rounded bg-red-500 px-3 py-1 text-white"
                  aria-label={`Delete ${task.title}`}
                  data-testid="delete-button"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}