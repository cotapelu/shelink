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
/// <reference types="vitest/globals" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import TaskList from '../TaskList';
import { WorkTask, TaskStatus, TaskPriority } from '@/types';

const mockTasks: WorkTask[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    creatorId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    creatorId: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('TaskList', () => {
  it('renders empty state when no tasks', () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });

  it('renders list of tasks', () => {
    render(<TaskList tasks={mockTasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<TaskList tasks={mockTasks} onEdit={onEdit} />);
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<TaskList tasks={mockTasks} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByTestId('delete-button');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(mockTasks[0].id);
  });

  it('does not render edit/delete buttons when handlers not provided', () => {
    render(<TaskList tasks={mockTasks} />);
    expect(screen.queryAllByTestId('edit-button')).toHaveLength(0);
    expect(screen.queryAllByTestId('delete-button')).toHaveLength(0);
  });
});