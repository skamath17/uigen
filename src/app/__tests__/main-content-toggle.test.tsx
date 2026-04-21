import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainContent } from "../main-content";

// Mock providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    fileSystem: { getNode: () => null },
    refreshTrigger: 0,
    selectedFile: null,
    setSelectedFile: vi.fn(),
    getAllFiles: vi.fn(() => new Map()),
    getFileContent: vi.fn(),
    updateFile: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

// Mock resizable layout
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">PreviewFrame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("defaults to Preview tab on initial render", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
});

test("switches to Code view when Code button is clicked", () => {
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  fireEvent.click(codeButton);

  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
  expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
});

test("switches back to Preview view when Preview button is clicked after Code", () => {
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  fireEvent.click(codeButton);
  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();

  const previewButton = screen.getByRole("button", { name: "Preview" });
  fireEvent.click(previewButton);

  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("Preview button has active styling when preview view is active", () => {
  render(<MainContent />);

  const previewButton = screen.getByRole("button", { name: "Preview" });
  const codeButton = screen.getByRole("button", { name: "Code" });

  expect(previewButton.className).toContain("bg-white");
  expect(previewButton.className).toContain("text-neutral-900");
  expect(codeButton.className).toContain("text-neutral-600");
  expect(codeButton.className).not.toContain("text-neutral-900");
});

test("Code button has active styling when code view is active", () => {
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  fireEvent.click(codeButton);

  const previewButton = screen.getByRole("button", { name: "Preview" });

  expect(codeButton.className).toContain("bg-white");
  expect(codeButton.className).toContain("text-neutral-900");
  expect(previewButton.className).toContain("text-neutral-600");
  expect(previewButton.className).not.toContain("text-neutral-900");
});

test("both Preview and Code buttons are always rendered", () => {
  render(<MainContent />);

  expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
});
