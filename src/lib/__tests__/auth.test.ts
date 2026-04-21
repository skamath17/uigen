// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("createSession sets an httpOnly cookie with a JWT token", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.split(".").length).toBe(3); // valid JWT format
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
});

test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  await createSession("user-123", "test@example.com");
  const token = mockCookieStore.set.mock.calls[0][1];
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
  expect(session?.expiresAt).toBeDefined();
});

test("getSession returns null for a tampered token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "invalid.jwt.token" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns null when no cookie is on the request", async () => {
  const request = new NextRequest("http://localhost/api/test");

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid request cookie", async () => {
  await createSession("user-456", "other@example.com");
  const token = mockCookieStore.set.mock.calls[0][1];

  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-456");
  expect(session?.email).toBe("other@example.com");
});

test("verifySession returns null for a tampered request cookie", async () => {
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: "auth-token=bad.token.here" },
  });

  const session = await verifySession(request);

  expect(session).toBeNull();
});
