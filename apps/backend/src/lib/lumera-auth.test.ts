import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { authorizeOps } from "./lumera-auth";

/**
 * authorizeOps gate (cockpit ops APIs):
 *  - dev with no COCKPIT_KEY → allow (developer convenience)
 *  - production with no COCKPIT_KEY → 401 (never expose ops APIs unkeyed in prod)
 *  - key set but header missing/wrong → 401
 *  - key set and header matches → allow
 */

type ResCapture = {
  res: MedusaResponse;
  get statusCode(): number | undefined;
  get body(): unknown;
};

function makeReq(headers: Record<string, string> = {}): MedusaRequest {
  return { headers } as unknown as MedusaRequest;
}

function makeRes(): ResCapture {
  let statusCode: number | undefined;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
  } as unknown as MedusaResponse;
  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

describe("authorizeOps", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedCockpitKey = process.env.COCKPIT_KEY;

  beforeEach(() => {
    delete process.env.COCKPIT_KEY;
  });

  afterEach(() => {
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    if (savedCockpitKey === undefined) delete process.env.COCKPIT_KEY;
    else process.env.COCKPIT_KEY = savedCockpitKey;
  });

  it("allows in dev when no COCKPIT_KEY is set", () => {
    process.env.NODE_ENV = "development";
    delete process.env.COCKPIT_KEY;
    const req = makeReq();
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(true);
    expect(cap.statusCode).toBeUndefined();
  });

  it("returns 401 in production when COCKPIT_KEY is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COCKPIT_KEY;
    const req = makeReq();
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(false);
    expect(cap.statusCode).toBe(401);
    expect((cap.body as { error: string }).error).toMatch(/unauthorized/i);
  });

  it("returns 401 when provided header does not match the required key", () => {
    process.env.NODE_ENV = "production";
    process.env.COCKPIT_KEY = "secret-key";
    const req = makeReq({ "x-cockpit-key": "wrong-key" });
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(false);
    expect(cap.statusCode).toBe(401);
    expect((cap.body as { error: string }).error).toMatch(/unauthorized/i);
  });

  it("returns 401 when key is required but no header is provided", () => {
    process.env.NODE_ENV = "production";
    process.env.COCKPIT_KEY = "secret-key";
    const req = makeReq();
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(false);
    expect(cap.statusCode).toBe(401);
  });

  it("allows when the provided header matches the required key", () => {
    process.env.NODE_ENV = "production";
    process.env.COCKPIT_KEY = "secret-key";
    const req = makeReq({ "x-cockpit-key": "secret-key" });
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(true);
    expect(cap.statusCode).toBeUndefined();
  });

  it("fails closed in non-production when COCKPIT_REQUIRE_KEY=true and no key is set (staging guard)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.COCKPIT_KEY;
    process.env.COCKPIT_REQUIRE_KEY = "true";
    const req = makeReq();
    const cap = makeRes();
    try {
      expect(authorizeOps(req, cap.res)).toBe(false);
      expect(cap.statusCode).toBe(401);
    } finally {
      delete process.env.COCKPIT_REQUIRE_KEY;
    }
  });

  it("does not accept the key via query string (header-only)", () => {
    process.env.NODE_ENV = "production";
    process.env.COCKPIT_KEY = "secret-key";
    // query param present but no matching header → must still 401
    const req = { headers: {}, query: { "x-cockpit-key": "secret-key" } } as unknown as MedusaRequest;
    const cap = makeRes();
    expect(authorizeOps(req, cap.res)).toBe(false);
    expect(cap.statusCode).toBe(401);
  });
});
