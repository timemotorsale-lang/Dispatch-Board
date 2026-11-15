import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepairHistorySearch } from "@/features/repair-history/repair-history-search";
import type { RepairHistoryItem } from "@/lib/repair-history";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));

// Drive the component's event handlers and render its actual markup in the Node test environment.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useEffect: vi.fn(),
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    return hooks.slots[index] ??= { current: initial };
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value; }];
  },
}));

type Element = ReactElement<{
  children?: ReactNode;
  onChange?: (event: { target: { value: string } }) => void;
  onClick?: () => void;
  onSubmit?: (event: { preventDefault: () => void }) => void;
  onToggle?: (event: { currentTarget: { open: boolean } }) => void;
}>;

const saved: RepairHistoryItem = {
  id: "order-1",
  source: "REPAIR_ORDER",
  number: "RO-100",
  title: "Brake repair",
  customer: "Customer Name",
  vehicle: "2020 Vehicle",
  vin: "VIN123",
  stockNumber: "ST-40",
  status: "Closed",
  updatedAt: "2026-10-10T10:00:00Z",
  href: "/vehicles/repair-orders/order-1",
  documents: [{
    id: "estimate-1", kind: "ESTIMATE", number: "E-42", version: 2,
    issuedAt: "2026-10-09T12:30:00Z", href: "/repair-estimate?documentId=estimate-1&version=2",
  }],
  drafts: [{ id: "draft-1", label: "Guide draft", href: "/diagnostics/labor-guide?draftId=draft-1" }],
};

const fetchHistory = vi.fn<typeof fetch>();

function renderDirectory(linkTarget?: "_blank") {
  hooks.cursor = 0;
  const element = RepairHistorySearch({
    initialQuery: "RO-100",
    initialVehicleId: "vehicle-1",
    initialCustomerId: "customer-1",
    linkTarget,
  });
  const Component = element.type;
  return Component(element.props) as Element;
}

function findAll(node: ReactNode, type: string): Element[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Element["props"]>(child)) return [];
    return [
      ...(child.type === type ? [child] : []),
      ...findAll(child.props.children, type),
    ];
  });
}

function button(label: string) {
  const match = findAll(renderDirectory(), "button").find((element) => element.props.children === label);
  expect(match).toBeDefined();
  return match!;
}

function toggle(open: boolean) {
  renderDirectory().props.onToggle!({ currentTarget: { open } });
}

function requestParams(index = 0) {
  return Object.fromEntries(new URL(String(fetchHistory.mock.calls[index][0]), "http://localhost").searchParams);
}

function markup() {
  return renderToStaticMarkup(renderDirectory());
}

describe("RepairHistorySearch", () => {
  beforeEach(() => {
    hooks.slots = [];
    fetchHistory.mockReset();
    vi.stubGlobal("fetch", fetchHistory);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("starts collapsed, loads on expansion, and links to exact saved artifacts", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchHistory.mockReturnValueOnce(new Promise((resolve) => { resolveResponse = resolve; }));

    expect(markup()).toMatch(/<details class="[^"]+"><summary>Find saved repair work<\/summary>/);
    expect(fetchHistory).not.toHaveBeenCalled();
    toggle(true);
    expect(markup()).toContain("Loading saved repair work\u2026");
    expect(requestParams()).toEqual({
      query: "RO-100", kind: "ALL", state: "ALL", page: "1", pageSize: "20",
      vehicleId: "vehicle-1", customerId: "customer-1",
    });
    resolveResponse(Response.json({ items: [saved], page: 1, hasMore: false }));

    await vi.waitFor(() => {
      const html = markup();
      expect(html).toContain(`href="${saved.href}"`);
      expect(html).toContain('href="/repair-estimate?documentId=estimate-1&amp;version=2"');
      expect(html).toContain(`href="${saved.drafts[0].href}"`);
      expect(html).toContain("RO-100 \u00b7 Brake repair");
      expect(html).toContain("Estimate E-42 \u00b7 v2");
      expect(html).toContain("Open Guide draft");
      expect(html).not.toContain('target="_blank"');
      expect(html).toContain("VIN VIN123");
      expect(html).toContain("Stock ST-40");
      expect(html).toContain(`dateTime="${saved.updatedAt}"`);
      expect(html).toContain(`Issued <time dateTime="${saved.documents[0].issuedAt}"`);
      expect(html).not.toContain("Loading saved repair work");
    });
  });

  it("gives record, payment receipt and legacy estimate links a native new-tab target", async () => {
    const item: RepairHistoryItem = {
      ...saved,
      documents: [{ ...saved.documents[0], kind: "PAYMENT" }],
      drafts: [{ ...saved.drafts[0], label: "Legacy estimate v1" }],
    };
    fetchHistory.mockResolvedValueOnce(Response.json({ items: [item], page: 1, hasMore: false }));
    renderDirectory("_blank").props.onToggle!({ currentTarget: { open: true } });

    await vi.waitFor(() => {
      const html = renderToStaticMarkup(renderDirectory("_blank"));
      const links = html.match(/<a\b[^>]*>/g) ?? [];
      expect(links).toHaveLength(3);
      for (const link of links) {
        expect(link).toContain('target="_blank"');
        expect(link).toContain('rel="noopener noreferrer"');
      }
      expect(html).toContain("Payment receipt E-42");
      expect(html).toContain("Open Legacy estimate v1");
    });
  });

  it("renders readable labels for legacy estimates, repair orders and authorizations", async () => {
    const documents = ["LEGACY_ESTIMATE", "RO", "AUTHORIZATION"].map((kind, index) => ({
      ...saved.documents[0],
      id: `document-${index}`,
      number: `D-${index}`,
      kind,
    }));
    fetchHistory.mockResolvedValueOnce(Response.json({
      items: [{ ...saved, documents }],
      page: 1,
      hasMore: false,
    }));
    toggle(true);

    await vi.waitFor(() => {
      const html = markup();
      expect(html).toContain("Legacy estimate D-0 \u00b7 v2");
      expect(html).toContain("Repair order D-1 \u00b7 v2");
      expect(html).toContain("Authorization D-2 \u00b7 v2");
    });
  });

  it("labels invoice preparation and external reconciliation records", async () => {
    const documents = ["INVOICE_PACKAGE", "LEGACY_INVOICE", "LEGACY_RECEIPT"].map((kind, index) => ({
      ...saved.documents[0],
      id: `external-${index}`,
      number: `X-${index}`,
      kind,
    }));
    fetchHistory.mockResolvedValueOnce(Response.json({
      items: [{ ...saved, documents }],
      page: 1,
      hasMore: false,
    }));
    toggle(true);

    await vi.waitFor(() => {
      const html = markup();
      expect(html).toContain("Invoice preparation record X-0");
      expect(html).toContain("Invoice record (no archived document) X-1");
      expect(html).toContain("Payment record (no archived receipt) X-2");
      expect(html.match(/Prepared <time/g)).toHaveLength(1);
      expect(html.match(/Recorded <time/g)).toHaveLength(2);
      expect(html).not.toContain("Issued <time");
    });
  });

  it("applies edited filters only on submit and pages through submitted filters", async () => {
    fetchHistory.mockImplementation(async (url) => {
      const page = Number(new URL(String(url), "http://localhost").searchParams.get("page"));
      return Response.json({ items: [saved], page, hasMore: page === 1 });
    });
    toggle(true);
    await vi.waitFor(() => expect(markup()).toContain("Page 1"));

    findAll(renderDirectory(), "input")[0].props.onChange!({ target: { value: "truck" } });
    findAll(renderDirectory(), "select")[0].props.onChange!({ target: { value: "ESTIMATE" } });
    findAll(renderDirectory(), "select")[1].props.onChange!({ target: { value: "CLOSED" } });
    expect(fetchHistory).toHaveBeenCalledTimes(1);

    findAll(renderDirectory(), "form")[0].props.onSubmit!({ preventDefault: vi.fn() });
    expect(requestParams(1)).toMatchObject({ query: "truck", kind: "ESTIMATE", state: "CLOSED", page: "1" });
    await vi.waitFor(() => expect(markup()).not.toContain("Loading saved repair work"));

    findAll(renderDirectory(), "input")[0].props.onChange!({ target: { value: "unsubmitted" } });
    button("Next").props.onClick!();
    expect(requestParams(2)).toMatchObject({ query: "truck", kind: "ESTIMATE", state: "CLOSED", page: "2" });
    await vi.waitFor(() => expect(markup()).toContain("Page 2"));
    button("Previous").props.onClick!();
    expect(requestParams(3)).toMatchObject({ query: "truck", page: "1" });
  });

  it("shows the API denial, preserves loaded results and input, and retries the failed request", async () => {
    fetchHistory
      .mockResolvedValueOnce(Response.json({ items: [saved], page: 1, hasMore: false }))
      .mockResolvedValueOnce(Response.json({ error: "Ask your service manager for repair history access." }, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, hasMore: false }));
    toggle(true);
    await vi.waitFor(() => expect(markup()).toContain(saved.title));

    findAll(renderDirectory(), "input")[0].props.onChange!({ target: { value: "new search" } });
    findAll(renderDirectory(), "form")[0].props.onSubmit!({ preventDefault: vi.fn() });
    await vi.waitFor(() => expect(markup()).toContain("Ask your service manager for repair history access."));
    expect(markup()).toContain(saved.title);
    expect(markup()).toContain('value="new search"');

    button("Retry").props.onClick!();
    expect(requestParams(2)).toEqual(requestParams(1));
    await vi.waitFor(() => expect(markup()).toContain("No saved repair work matches these filters."));
    expect(markup()).not.toContain(saved.title);
  });

  it("aborts loading on close and resumes on reopening", async () => {
    fetchHistory
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, hasMore: false }));
    toggle(true);
    const signal = fetchHistory.mock.calls[0][1]?.signal;

    toggle(false);
    expect(signal?.aborted).toBe(true);
    expect(markup()).not.toContain("Loading saved repair work");

    toggle(true);
    expect(requestParams(1)).toEqual(requestParams());
    await vi.waitFor(() => expect(markup()).toContain("No saved repair work matches"));
  });

  it("aborts a superseded search and ignores its late response", async () => {
    let resolveOld!: (response: Response) => void;
    fetchHistory
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, hasMore: false }));
    toggle(true);
    const firstSignal = fetchHistory.mock.calls[0][1]?.signal;

    findAll(renderDirectory(), "form")[0].props.onSubmit!({ preventDefault: vi.fn() });
    expect(firstSignal?.aborted).toBe(true);
    await vi.waitFor(() => expect(markup()).toContain("No saved repair work matches"));
    resolveOld(Response.json({ items: [saved], page: 1, hasMore: false }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(markup()).not.toContain(saved.title);
  });
});
