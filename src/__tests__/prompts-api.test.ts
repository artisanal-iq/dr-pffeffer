import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as listPrompts, POST as createPrompt } from "@/app/api/prompts/route";
import {
  DELETE as deletePrompt,
  GET as getPrompt,
  PATCH as updatePrompt,
} from "@/app/api/prompts/[promptId]/route";
import { GET as getPromptAudits } from "@/app/api/prompts/[promptId]/audits/route";
import type { Prompt, PromptAuditEvent } from "@/types/models";

vi.mock("@/lib/supabase-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase-server")>("@/lib/supabase-server");
  return {
    ...actual,
    createSupabaseRouteHandlerClient: vi.fn(),
  };
});

import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
const mockedCreateClient = vi.mocked(createSupabaseRouteHandlerClient);

type SupabaseMock = {
  auth: { getUser: ReturnType<typeof vi.fn> };
  rpc: ReturnType<typeof vi.fn>;
};

type MockUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
};

function buildPrompt(overrides: Partial<Prompt> = {}): Prompt {
  const base: Prompt = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "morning-focus",
    title: "Morning focus prompt",
    body: "What outcome will create momentum today?",
    category: "ritual",
    is_active: true,
    created_by: "admin-id",
    updated_by: "admin-id",
    archived_by: null,
    created_at: new Date("2024-01-01T10:00:00Z").toISOString(),
    updated_at: new Date("2024-01-02T10:00:00Z").toISOString(),
    archived_at: null,
  };
  return { ...base, ...overrides };
}

function buildSupabaseMock(user: MockUser | null): SupabaseMock {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    rpc: vi.fn(),
  };
}

function setupClient(user: MockUser | null) {
  const supabase = buildSupabaseMock(user);
  mockedCreateClient.mockResolvedValue({
    supabase,
    applyCookies: <T extends Response>(response: T) => response,
  });
  return supabase;
}

describe("prompt API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies non-admin access", async () => {
    const supabase = setupClient({ id: "user-1", app_metadata: { role: "member" } });
    const request = new NextRequest(new Request("http://localhost/api/prompts"));

    const response = await listPrompts(request);
    const payload = await response.json();

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("forbidden");
  });

  it("lists prompts for admins", async () => {
    const supabase = setupClient({ id: "admin-1", app_metadata: { roles: ["admin"] } });
    const prompt = buildPrompt();
    supabase.rpc.mockResolvedValue({ data: [prompt], error: null });

    const request = new NextRequest(new Request("http://localhost/api/prompts?includeArchived=true"));
    const response = await listPrompts(request);
    const payload = await response.json();

    expect(supabase.rpc).toHaveBeenCalledWith("list_prompts", { p_include_archived: true });
    expect(response.status).toBe(200);
    expect(payload.items).toEqual([prompt]);
  });

  it("creates prompts with audit metadata", async () => {
    const supabase = setupClient({ id: "admin-2", email: "admin2@example.com", app_metadata: { role: "admin" } });
    const prompt = buildPrompt({ id: "new-id", slug: "evening-reset" });
    supabase.rpc.mockResolvedValue({ data: prompt, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          slug: "evening-reset",
          title: "Evening reset",
          body: "How will you close the day with intention?",
          category: "reflection",
        }),
        headers: { "content-type": "application/json" },
      })
    );

    const response = await createPrompt(request);
    const payload = await response.json();

    expect(supabase.rpc).toHaveBeenCalledWith("create_prompt", {
      p_slug: "evening-reset",
      p_title: "Evening reset",
      p_body: "How will you close the day with intention?",
      p_category: "reflection",
      p_user_id: "admin-2",
      p_user_email: "admin2@example.com",
    });
    expect(response.status).toBe(201);
    expect(payload).toEqual(prompt);
  });

  it("updates prompts and tracks active state", async () => {
    const supabase = setupClient({ id: "admin-3", email: "admin3@example.com", app_metadata: { roles: ["admin"] } });
    const prompt = buildPrompt({ title: "Updated focus" });
    supabase.rpc.mockResolvedValue({ data: prompt, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/prompts/11111111-1111-4111-8111-111111111111", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Updated focus",
          category: "ritual",
          isActive: true,
        }),
        headers: { "content-type": "application/json" },
      })
    );

    const response = await updatePrompt(request, {
      params: { promptId: "11111111-1111-4111-8111-111111111111" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("update_prompt", {
      p_id: "11111111-1111-4111-8111-111111111111",
      p_slug: null,
      p_title: "Updated focus",
      p_body: null,
      p_category: "ritual",
      p_is_active: true,
      p_user_id: "admin-3",
      p_user_email: "admin3@example.com",
    });
    expect(payload).toEqual(prompt);
  });

  it("archives prompts via delete", async () => {
    const supabase = setupClient({ id: "admin-4", email: "admin4@example.com", app_metadata: { role: "admin" } });
    const archived = buildPrompt({ is_active: false, archived_at: new Date().toISOString(), archived_by: "admin-4" });
    supabase.rpc.mockResolvedValue({ data: archived, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/prompts/11111111-1111-4111-8111-111111111111", { method: "DELETE" })
    );
    const response = await deletePrompt(request, {
      params: { promptId: "11111111-1111-4111-8111-111111111111" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("update_prompt", {
      p_id: "11111111-1111-4111-8111-111111111111",
      p_slug: null,
      p_title: null,
      p_body: null,
      p_category: null,
      p_is_active: false,
      p_user_id: "admin-4",
      p_user_email: "admin4@example.com",
    });
    expect(payload.is_active).toBe(false);
    expect(payload.archived_by).toBe("admin-4");
  });

  it("fetches individual prompts", async () => {
    const supabase = setupClient({ id: "admin-5", email: "admin5@example.com", app_metadata: { roles: ["admin"] } });
    const prompt = buildPrompt({ id: "22222222-2222-4222-8222-222222222222" });
    supabase.rpc.mockResolvedValue({ data: prompt, error: null });

    const request = new NextRequest(new Request("http://localhost/api/prompts/22222222-2222-4222-8222-222222222222"));
    const response = await getPrompt(request, {
      params: { promptId: "22222222-2222-4222-8222-222222222222" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("get_prompt", { p_id: "22222222-2222-4222-8222-222222222222" });
    expect(payload).toEqual(prompt);
  });

  it("lists prompt audits for admins", async () => {
    const supabase = setupClient({ id: "admin-6", email: "admin6@example.com", app_metadata: { roles: ["admin"] } });
    const audits: PromptAuditEvent[] = [
      {
        id: "audit-1",
        prompt_id: "11111111-1111-4111-8111-111111111111",
        action: "created",
        actor_id: "admin-6",
        actor_email: "admin6@example.com",
        changes: { after: { title: "Prompt" } },
        created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
      },
    ];
    supabase.rpc.mockResolvedValue({ data: audits, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/prompts/11111111-1111-4111-8111-111111111111/audits?limit=10")
    );
    const response = await getPromptAudits(request, {
      params: { promptId: "11111111-1111-4111-8111-111111111111" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith("list_prompt_audits", {
      p_prompt_id: "11111111-1111-4111-8111-111111111111",
      p_limit: 10,
    });
    expect(payload.items).toEqual(audits);
  });

  it("prevents non-admins from viewing audits", async () => {
    const supabase = setupClient({ id: "user-2", email: "user@example.com", app_metadata: { role: "member" } });
    const request = new NextRequest(
      new Request("http://localhost/api/prompts/11111111-1111-4111-8111-111111111111/audits")
    );

    const response = await getPromptAudits(request, {
      params: { promptId: "11111111-1111-4111-8111-111111111111" },
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("forbidden");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
