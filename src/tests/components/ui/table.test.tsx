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
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TableFooter, TableCaption } from '@/components/ui/table';

describe('TableFooter', () => {
  it('renders children inside tfoot', () => {
    render(
      <table>
        <TableFooter>
          <tr>
            <td>Footer cell</td>
          </tr>
        </TableFooter>
      </table>
    );
    expect(screen.getByText('Footer cell')).toBeInTheDocument();
  });
});

describe('TableCaption', () => {
  it('renders caption text', () => {
    render(
      <table>
        <TableCaption>My caption</TableCaption>
      </table>
    );
    expect(screen.getByText('My caption')).toBeInTheDocument();
  });
});
