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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CreateIntakeButton } from "./intake-create-button";
import { listClients } from "@/server/clients/actions";
import { listActiveColleagues } from "@/server/users/actions";

// Cô lập: thay IntakeSheet (God Object nhiều phụ thuộc) bằng marker ghi nhận props.
vi.mock("./intake-sheet", () => ({
  IntakeSheet: (props: {
    open: boolean;
    clientOptions: unknown[];
    colleagues: unknown[];
    onOpenChange: (o: boolean) => void;
  }) =>
    props.open ? (
      <div
        data-testid="intake-sheet"
        data-clients={props.clientOptions.length}
        data-users={props.colleagues.length}
      >
        <button type="button" onClick={() => props.onOpenChange(false)}>
          Đóng
        </button>
      </div>
    ) : null
}));

vi.mock("@/server/clients/actions", () => ({ listClients: vi.fn() }));
vi.mock("@/server/users/actions", () => ({ listActiveColleagues: vi.fn() }));

const listClientsMock = listClients as unknown as ReturnType<typeof vi.fn>;
const listColleaguesMock = listActiveColleagues as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  listClientsMock.mockResolvedValue({ items: [{ id: "c1", name: "ACME", type: "COMPANY" }], total: 1 });
  listColleaguesMock.mockResolvedValue([{ id: "u1", name: "Nguyễn A", role: "STAFF" }]);
});

describe("CreateIntakeButton", () => {
  it("hiện nút mở và chưa mở sheet khi khởi tạo, cũng chưa nạp options", () => {
    render(<CreateIntakeButton />);
    expect(screen.getByRole("button", { name: /Tạo tiếp nhận/i })).toBeInTheDocument();
    expect(screen.queryByTestId("intake-sheet")).not.toBeInTheDocument();
    expect(listClientsMock).not.toHaveBeenCalled();
    expect(listColleaguesMock).not.toHaveBeenCalled();
  });

  it("nạp options một lần và mở sheet với dữ liệu khách + đồng nghiệp", async () => {
    render(<CreateIntakeButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo tiếp nhận/i }));

    const sheet = await waitFor(() => screen.getByTestId("intake-sheet"));
    expect(sheet).toHaveAttribute("data-clients", "1");
    expect(sheet).toHaveAttribute("data-users", "1");
    expect(listClientsMock).toHaveBeenCalledTimes(1);
    expect(listColleaguesMock).toHaveBeenCalledTimes(1);
  });

  it("không nạp lại options khi đóng rồi mở lại (cache per dialog)", async () => {
    render(<CreateIntakeButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo tiếp nhận/i }));
    await waitFor(() => screen.getByTestId("intake-sheet"));

    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByTestId("intake-sheet")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tạo tiếp nhận/i }));
    await waitFor(() => screen.getByTestId("intake-sheet"));
    expect(listClientsMock).toHaveBeenCalledTimes(1);
    expect(listColleaguesMock).toHaveBeenCalledTimes(1);
  });

  it("gọi onCreated khi sheet đóng (để làm mới pipeline)", async () => {
    const onCreated = vi.fn();
    render(<CreateIntakeButton onCreated={onCreated} />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo tiếp nhận/i }));
    await waitFor(() => screen.getByTestId("intake-sheet"));

    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("vẫn mở sheet khi nạp options lỗi (không chặn người dùng)", async () => {
    listClientsMock.mockRejectedValue(new Error("boom"));
    listColleaguesMock.mockRejectedValue(new Error("boom"));
    render(<CreateIntakeButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tạo tiếp nhận/i }));

    const sheet = await waitFor(() => screen.getByTestId("intake-sheet"));
    expect(sheet).toHaveAttribute("data-clients", "0");
    expect(sheet).toHaveAttribute("data-users", "0");
    cleanup();
  });
});
