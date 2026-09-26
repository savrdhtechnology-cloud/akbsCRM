// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mock.rpc }),
}));
import { CrmProvider } from "../src/lib/crm";
import { CrmWorkspace } from "../src/components/CrmWorkspace";
let user: any;
let leads: any[];
let calls: any[];
beforeEach(() => {
  sessionStorage.clear();
  calls = [];
  user = {
    id: "admin",
    name: "QA Admin",
    login: "qa@example.invalid",
    role: "ADMIN",
    active: true,
    must_change_password: false,
  };
  leads = [
    {
      id: "lead-1",
      reference: "QA-001",
      name: "Test Farmer",
      phone: "9999999999",
      email: "qa@example.invalid",
      location: "Pune",
      source: "STAFF",
      stage: "NEW",
      approval: "PENDING",
      priority: "NORMAL",
      assigned_to: "employee",
      capacity: 1000,
      project_cost: 50000,
      project_type: "Broiler",
      message: "Test requirement",
      details: { state: "Maharashtra" },
      version: 1,
      created_at: "2026-09-25T08:00:00Z",
    },
  ];
  mock.rpc.mockImplementation(async (_fn, p) => {
    calls.push(p);
    const data = p.p_data;
    let out: any = { ok: true };
    if (p.p_action === "login") out = { user, token: "qa-test-token" };
    if (p.p_action === "me") out = { user };
    if (p.p_action === "snapshot")
      out = {
        user,
        leads,
        total: leads.length,
        users: [
          user,
          {
            id: "employee",
            name: "Test Employee",
            role: "EMPLOYEE",
            active: true,
          },
        ],
        workflows: [],
        activities: [],
        documents: [],
        templates: [
          {
            id: "template",
            title: "Hello",
            channel: "whatsapp",
            subject: "",
            body: "Hello {{name}}",
          },
        ],
      };
    if (p.p_action === "lead_create") {
      const lead = { ...leads[0], ...data, id: "lead-2", reference: "QA-002" };
      leads.unshift(lead);
      out = { lead };
    }
    if (p.p_action === "lead_update")
      leads = leads.map((l) =>
        l.id === data.lead_id ? { ...l, ...data, version: l.version + 1 } : l,
      );
    return { data: out, error: null };
  });
});
afterEach(() => cleanup());
async function login() {
  render(
    <CrmProvider>
      <CrmWorkspace />
    </CrmProvider>,
  );
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Email / Login"), "qa@example.invalid");
  await u.type(screen.getByLabelText("Password"), "temporary-test-password");
  await u.click(screen.getByRole("button", { name: "Sign in securely" }));
  await screen.findByRole("heading", { name: "Test Farmer" });
  return u;
}
test("login, real lead filters and persistent call action", async () => {
  const u = await login();
  await u.type(screen.getByLabelText("Search leads"), "not found");
  expect(screen.queryByRole("heading", { name: "Test Farmer" })).toBeNull();
  expect(screen.getByText("No matching leads.")).toBeTruthy();
  await u.clear(screen.getByLabelText("Search leads"));
  await u.click(screen.getByRole("button", { name: "Log a call" }));
  const dialog = screen.getByRole("dialog");
  await u.type(
    within(dialog).getByLabelText("Call outcome / next step"),
    "Discussed site visit",
  );
  await u.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(calls.find((c) => c.p_action === "note").p_data).toEqual(
    expect.objectContaining({
      lead_id: "lead-1",
      kind: "CALL",
      note: "Discussed site visit",
    }),
  );
});
test("new lead uses entered values and returns saved database record", async () => {
  const u = await login();
  await u.click(screen.getByRole("button", { name: "Add lead" }));
  const d = screen.getByRole("dialog");
  await u.type(within(d).getByLabelText("Full name"), "Second Farmer");
  await u.type(within(d).getByLabelText("Phone"), "9888888888");
  await u.type(within(d).getByLabelText("State"), "Karnataka");
  await u.click(within(d).getByRole("button", { name: "Save" }));
  await screen.findByRole("heading", { name: "Second Farmer" });
  expect(calls.find((c) => c.p_action === "lead_create").p_data).toEqual(
    expect.objectContaining({
      name: "Second Farmer",
      phone: "9888888888",
      details: expect.objectContaining({ state: "Karnataka" }),
    }),
  );
});
test("assignment saves employee id and current version", async () => {
  const u = await login();
  await u.click(screen.getByRole("button", { name: "Change employee" }));
  const d = screen.getByRole("dialog");
  await u.selectOptions(within(d).getByLabelText("Active employee"), "");
  await u.click(within(d).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(calls.find((c) => c.p_action === "lead_update").p_data).toEqual({
    lead_id: "lead-1",
    version: 1,
    assigned_to: null,
  });
});
test("follow-up creation matches database status and date contract", async () => {
  const u = await login();
  await u.click(screen.getByRole("button", { name: "Schedule follow-up" }));
  const d = screen.getByRole("dialog");
  await u.type(within(d).getByLabelText("Title"), "Visit follow-up");
  await u.type(within(d).getByLabelText("Due date & time"), "2027-01-15T10:00");
  await u.click(within(d).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(calls.some((c) => c.p_action === "workflow_create")).toBe(true),
  );
  expect(calls.find((c) => c.p_action === "workflow_create").p_data).toEqual(
    expect.objectContaining({
      kind: "followup",
      status: "SCHEDULED",
      lead_id: "lead-1",
    }),
  );
});
test("employee does not receive administrative controls", async () => {
  user = { ...user, id: "employee", role: "EMPLOYEE" };
  await login();
  expect(screen.queryByRole("button", { name: "Change employee" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Auto-assign" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Team & access" })).toBeNull();
});
