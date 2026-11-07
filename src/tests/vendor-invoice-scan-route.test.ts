import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),read:vi.fn(),command:vi.fn(),extract:vi.fn(),access:vi.fn()}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:mocks.user}));
vi.mock("@/server/vendors/vendor-policy",()=>({canAddVendorNote:mocks.access}));
vi.mock("@/server/vendors/vendor-billing-service",()=>({readVendorBilling:mocks.read,commandVendorBilling:mocks.command}));
vi.mock("@/server/document-library/text-extraction",()=>({extractDocumentText:mocks.extract}));
import { POST, PUT } from "@/app/api/vendors/[vendorId]/invoice-scan/route";
const context={params:Promise.resolve({vendorId:"vendor-1"})};
function request(review?:unknown,file=new File(["%PDF-1.4\nexample"],"invoice.pdf",{type:"application/pdf"})) {
 const body=new FormData();body.set("file",file);if(review)body.set("review",JSON.stringify(review));return new Request("http://localhost/api/vendors/vendor-1/invoice-scan",{method:review?"PUT":"POST",body});
}
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue({id:"staff",isActive:true});mocks.access.mockReturnValue(true);mocks.read.mockResolvedValue({vendor:{name:"Sample Vendor"},jobs:[],documents:[]});mocks.extract.mockResolvedValue({method:"PDF_TEXT",text:"Sample Vendor\nInvoice #: INV-100\nTotal 100.00\nTax 0.00",warnings:[]});mocks.command.mockResolvedValue({saved:true});});
describe("invoice scanning route",()=>{
 it("rejects signed-out and unauthorized users before reading files",async()=>{mocks.user.mockResolvedValue(null);expect((await POST(request(),context)).status).toBe(401);expect(mocks.extract).not.toHaveBeenCalled();mocks.user.mockResolvedValue({isActive:true});mocks.access.mockReturnValue(false);expect((await POST(request(),context)).status).toBe(403);});
 it("rejects cross-site uploads",async()=>{const req=request();req.headers.set("origin","https://another.test");expect((await POST(req,context)).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();});
 it("validates file signatures rather than trusting names",async()=>{expect((await POST(request(undefined,new File(["not PDF"],"invoice.pdf")),context)).status).toBe(400);expect(mocks.extract).not.toHaveBeenCalled();});
 it("returns extracted suggestions and duplicate warnings without saving",async()=>{mocks.read.mockResolvedValue({vendor:{name:"Sample Vendor"},jobs:[],documents:[{number:"inv-100",direction:"PAYABLE",status:"DRAFT"}]});const response=await POST(request(),context);const data=await response.json();expect(data.scan.number).toBe("INV-100");expect(data.duplicates).toHaveLength(1);expect(mocks.command).not.toHaveBeenCalled();expect(response.headers.get("cache-control")).toBe("private, no-store");});
 it("saves reviewed fields through existing draft controls and includes the original",async()=>{const response=await PUT(request({reviewed:true,action:"POST_DOCUMENT",direction:"RECEIVABLE",number:"INV-100",commandKey:"stable-key"}),context);expect(response.status).toBe(200);expect(mocks.command).toHaveBeenCalledWith(expect.objectContaining({id:"staff"}),"vendor-1",expect.objectContaining({action:"CREATE_DOCUMENT",direction:"PAYABLE",number:"INV-100",commandKey:"stable-key"}),expect.objectContaining({contentType:"application/pdf",fileName:"invoice.pdf",bytes:expect.any(Uint8Array)}));});
 it("requires staff confirmation and hides engine paths",async()=>{expect((await PUT(request({reviewed:false}),context)).status).toBe(400);mocks.extract.mockRejectedValue(new Error("private-path/secret"));const response=await POST(request(),context);expect(response.status).toBe(503);expect(await response.text()).not.toContain("private-path");});
});
