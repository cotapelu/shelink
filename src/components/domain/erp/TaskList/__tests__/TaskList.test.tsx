import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TaskList from '../TaskList';
import { Task } from '@/lib/types';

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'todo',
    priority: 'medium',
    creatorId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'in-progress',
    priority: 'high',
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