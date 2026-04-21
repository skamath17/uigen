import { test, expect, vi, beforeEach, describe } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});

describe("signIn", () => {
  test("returns failure result without navigating when credentials are wrong", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("bad@example.com", "wrongpass");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading after failure", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("bad@example.com", "wrongpass");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("navigates to existing project when user has projects and no anon work", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
      { id: "proj-2", name: "Old Design", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test("creates new project and navigates when user has no projects and no anon work", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({
      id: "new-proj",
      name: "New Design #12345",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/new-proj");
  });

  test("saves anon work as project when messages exist", async () => {
    const anonMessages = [{ role: "user", content: "make a button" }];
    const anonFileData = { "/App.jsx": { type: "file", content: "..." } };

    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFileData,
    });
    vi.mocked(createProject).mockResolvedValue({
      id: "anon-proj",
      name: "Design from 12:00:00 PM",
      userId: "user-1",
      messages: JSON.stringify(anonMessages),
      data: JSON.stringify(anonFileData),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonMessages,
        data: anonFileData,
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("does not use anon work when messages array is empty", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("resets isLoading after successful sign-in", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading even when signInAction throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from the action", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });
});

describe("signUp", () => {
  test("returns failure result without navigating on validation error", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading after failure", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("navigates to existing project on successful sign-up", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", name: "First Design", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("creates new project when newly signed-up user has no projects", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({
      id: "brand-new",
      name: "New Design #99",
      userId: "user-new",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("migrates anon work to new account on sign-up", async () => {
    const anonMessages = [{ role: "user", content: "make a form" }];
    const anonFileData = { "/App.jsx": { type: "file", content: "<Form />" } };

    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFileData,
    });
    vi.mocked(createProject).mockResolvedValue({
      id: "migrated-proj",
      name: "Design from 3:00:00 PM",
      userId: "user-new",
      messages: JSON.stringify(anonMessages),
      data: JSON.stringify(anonFileData),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: anonMessages, data: anonFileData })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
  });

  test("resets isLoading even when signUpAction throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
