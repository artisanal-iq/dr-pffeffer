import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { createAuthMiddleware } from "../../middleware";

describe("middleware", () => {
  it("redirects unauthorized requests and logs audit events", async () => {
    const requests: NextRequest[] = [];
    const logCalls: unknown[] = [];
    const applyCalls: NextResponse[] = [];

    const middleware = createAuthMiddleware({
      createClient: (req) => {
        requests.push(req);
        return {
          supabase: {
            auth: {
              getUser: async () => ({ data: { user: null }, error: null }),
            },
          },
          applyCookies: (res: NextResponse) => {
            applyCalls.push(res);
            return res;
          },
        };
      },
      logUnauthorized: async (_supabase, payload) => {
        logCalls.push(payload);
      },
    });

    const request = new NextRequest(
      new Request("http://localhost/dashboard", {
        headers: { "x-forwarded-for": "203.0.113.5" },
      })
    );

    const response = await middleware(request);

    assert.equal(requests.length, 1);
    assert.equal(applyCalls.length, 1);
    assert.equal(logCalls.length, 1);
    assert.deepEqual(logCalls[0], {
      requestPath: "/dashboard",
      ipAddress: "203.0.113.5",
      metadata: { method: "GET" },
    });
    assert.equal(response.headers.get("location"), "http://localhost/login?redirect=%2Fdashboard");
  });

  it("allows authenticated users to continue", async () => {
    let logCalled = false;
    const applyCalls: NextResponse[] = [];

    const middleware = createAuthMiddleware({
      createClient: () => ({
        supabase: {
          auth: {
            getUser: async () => ({ data: { user: { id: "abc" } }, error: null }),
          },
        },
        applyCookies: (res: NextResponse) => {
          applyCalls.push(res);
          return res;
        },
      }),
      logUnauthorized: async () => {
        logCalled = true;
      },
    });

    const request = new NextRequest("http://localhost/dashboard");
    const response = await middleware(request);

    assert.equal(logCalled, false);
    assert.equal(applyCalls.length, 1);
    assert.equal(response.headers.get("location"), null);
  });
});
