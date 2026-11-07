import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),process:vi.fn()}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:mocks.user}));
vi.mock("@/server/vendors/invoice-batch-service",()=>({processVendorInvoicePacket:mocks.process}));
import { POST, PUT } from "@/app/api/vendors/[vendorId]/invoice-batch/route";
import { VendorBillingError } from "@/lib/vendor-billing";
const context={params:Promise.resolve({vendorId:"vendor-1"})};
const request=(raw:unknown,method="POST",headers:Record<string,string>={})=>new Request("http://localhost/api/vendors/vendor-1/invoice-batch",{method,headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(raw)});
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue({id:"staff"});mocks.process.mockResolvedValue({pages:[],saved:true});});
describe("uploaded invoice batch route",()=>{
 it("rejects cross-site and malformed origins before processing",async()=>{for(const headers of [{origin:"https://foreign.test"},{origin:"not a URL"},{"sec-fetch-site":"cross-site"}])expect((await POST(request({},"POST",headers),context)).status).toBe(403);expect(mocks.process).not.toHaveBeenCalled();});
 it("requires authentication",async()=>{mocks.user.mockResolvedValue(null);expect((await POST(request({}),context)).status).toBe(401);expect(mocks.process).not.toHaveBeenCalled();});
 it("keeps preview separate from apply, with private responses",async()=>{const raw={documentId:"document-1",batchId:"batch-1"};const response=await POST(request(raw),context);expect(mocks.process).toHaveBeenLastCalledWith({id:"staff"},"vendor-1",raw,false);expect(response.headers.get("cache-control")).toBe("private, no-store");await PUT(request({...raw,reviewed:true},"PUT"),context);expect(mocks.process).toHaveBeenLastCalledWith({id:"staff"},"vendor-1",{...raw,reviewed:true},true);});
 it("returns actionable conflicts and sanitizes unexpected errors",async()=>{mocks.process.mockRejectedValue(new VendorBillingError("Original pages already imported.",409));expect((await PUT(request({},"PUT"),context)).status).toBe(409);mocks.process.mockRejectedValue(new Error("private-engine-path"));const response=await POST(request({}),context);expect(response.status).toBe(503);expect(await response.text()).not.toContain("private-engine-path");});
 it("rejects oversized reviews before processing",async()=>{expect((await POST(request({value:"x".repeat(129000)}),context)).status).toBe(413);expect(mocks.process).not.toHaveBeenCalled();});
});
