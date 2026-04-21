import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallMessage } from "../ToolCallMessage";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "call",
  result?: unknown
): ToolInvocation {
  return { toolCallId: "test", toolName, args, state, result } as ToolInvocation;
}

test("shows 'Creating' label with spinner when str_replace_editor create is in progress", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "src/App.tsx" })} />);
  expect(screen.getByText("Creating App.tsx")).toBeDefined();
});

test("shows 'Creating' label with green dot when str_replace_editor create is done", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "src/App.tsx" }, "result", "ok")} />);
  expect(screen.getByText("Creating App.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace command", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "src/utils.ts" })} />);
  expect(screen.getByText("Editing utils.ts")).toBeDefined();
});

test("shows 'Editing' for insert command", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "src/utils.ts" })} />);
  expect(screen.getByText("Editing utils.ts")).toBeDefined();
});

test("shows 'Viewing' for view command", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "src/index.tsx" })} />);
  expect(screen.getByText("Viewing index.tsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("file_manager", { command: "rename", path: "src/Button.tsx", new_path: "src/Btn.tsx" })} />);
  expect(screen.getByText("Renaming Button.tsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("file_manager", { command: "delete", path: "src/old.tsx" })} />);
  expect(screen.getByText("Deleting old.tsx")).toBeDefined();
});

test("falls back to raw toolName for unknown tools", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("some_other_tool", {})} />);
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("shows only the basename for nested paths", () => {
  render(<ToolCallMessage toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "a/b/c/Deep.tsx" })} />);
  expect(screen.getByText("Creating Deep.tsx")).toBeDefined();
});
