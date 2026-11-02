import { beforeEach, describe, expect, it, vi } from "vitest";
const services=vi.hoisted(()=>({user:vi.fn(),read:vi.fn(),command:vi.fn(),print:vi.fn()}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:services.user}));
vi.mock("@/server/vendors/vendor-billing-service",()=>({readVendorBilling:services.read,commandVendorBilling:services.command}));
vi.mock("@/server/vendors/vendor-billing-print",()=>({vendorBillingPrint:services.print}));
import { GET, POST } from "@/app/api/vendors/[vendorId]/billing/route";
import { VendorBillingError } from "@/lib/vendor-billing";
const context={params:Promise.resolve({vendorId:"vendor-1"})};
beforeEach(()=>{vi.resetAllMocks();services.user.mockResolvedValue({id:"manager"});services.read.mockResolvedValue({vendor:{id:"vendor-1"}});services.command.mockResolvedValue({saved:true});});
describe("vendor billing route",()=>{
 it("allows the same public origin behind a reverse proxy",async()=>{
  const response=await POST(new Request("http://127.0.0.1:3000/api/vendors/vendor-1/billing",{method:"POST",headers:{host:"dispatch.example.test",origin:"https://dispatch.example.test","Content-Type":"application/json"},body:JSON.stringify({action:"POST_DOCUMENT"})}),context);
  expect(response.status).toBe(200);expect(services.command).toHaveBeenCalled();
 });
 it("rejects cross-site requests before financial commands",async()=>{
  const response=await POST(new Request("https://dispatch.example.test/api/vendors/vendor-1/billing",{method:"POST",headers:{origin:"https://attacker.test","sec-fetch-site":"cross-site"},body:"{}"}),context);
  expect(response.status).toBe(403);expect(services.command).not.toHaveBeenCalled();
 });
 it("returns actionable business errors without replacing them",async()=>{
  services.command.mockRejectedValue(new VendorBillingError("The allocation exceeds the invoice balance.",409));
  const response=await POST(new Request("http://localhost/api/vendors/vendor-1/billing",{method:"POST",body:"{}"}),context);
  expect(response.status).toBe(409);expect((await response.json()).error).toContain("exceeds");
 });
 it("serves saved print documents privately with scripts disabled",async()=>{
  services.print.mockReturnValue("<!doctype html><h1>Invoice</h1>");const response=await GET(new Request("http://localhost/api/vendors/vendor-1/billing?print=1"),context);
  expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");expect(await response.text()).toContain("Invoice");
 });
});
