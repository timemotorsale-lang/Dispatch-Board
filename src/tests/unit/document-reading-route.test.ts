import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),access:vi.fn(),money:vi.fn(),manager:vi.fn(),read:vi.fn(),duplicates:vi.fn()}));
vi.mock("@/server/db/client",()=>({prisma:{moneyEntry:{findMany:mocks.duplicates}}}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:mocks.user}));
vi.mock("@/server/document-library/permission-policy",()=>({canOpenDocumentLibrary:mocks.access}));
vi.mock("@/server/money-resources/service",()=>({moneyAccess:mocks.money}));
vi.mock("@/server/policies/access",()=>({isManager:mocks.manager}));
vi.mock("@/server/document-library/read-document",()=>({readStructuredDocument:mocks.read}));
import {POST} from "@/app/api/document-library/read/route";
function request(purpose="EXPENSE"){const body=new FormData();body.set("purpose",purpose);body.set("file",new File(["Receipt"],"receipt.txt",{type:"text/plain"}));return new Request("http://localhost/api/document-library/read",{method:"POST",body});}
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue({id:"staff",isActive:true});mocks.access.mockReturnValue(true);mocks.manager.mockReturnValue(false);mocks.money.mockResolvedValue({organizationId:"org",manager:false});mocks.duplicates.mockResolvedValue([]);mocks.read.mockResolvedValue({needsReview:true,fields:[],checksum:"file-checksum",pageCount:28,pagesRead:28});});
describe("review-only document reader access",()=>{
 it("requires an active staff account",async()=>{mocks.user.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);mocks.user.mockResolvedValue({isActive:false});expect((await POST(request())).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();});
 it("rejects cross-site and oversized requests before reading",async()=>{const foreign=request();foreign.headers.set("origin","https://foreign.test");expect((await POST(foreign)).status).toBe(403);const large=request();large.headers.set("content-length",String(26*1024*1024));expect((await POST(large)).status).toBe(413);expect(mocks.read).not.toHaveBeenCalled();});
 it("enforces money access and elevated statement permission",async()=>{expect((await POST(request("STATEMENT"))).status).toBe(403);mocks.money.mockRejectedValue({status:403});expect((await POST(request())).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();});
 it("enforces document access and validates purpose",async()=>{mocks.access.mockReturnValue(false);expect((await POST(request("SALES"))).status).toBe(403);expect((await POST(request("POST_DOCUMENT"))).status).toBe(400);expect(mocks.read).not.toHaveBeenCalled();});
 it("finds identical receipt evidence only within the authorized spending scope",async()=>{mocks.duplicates.mockResolvedValue([{merchant:"Synthetic Parts",businessDate:"2026-11-07",amountCents:10800}]);const response=await POST(request());expect(mocks.duplicates).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:"org",employeeId:"staff",receiptDocument:{checksumSha256:"file-checksum"}})}));expect((await response.json()).duplicateMatches).toEqual([expect.objectContaining({label:"Synthetic Parts · 2026-11-07 · $108.00"})]);});
 it("returns non-cached review proposals and hides internal engine diagnostics",async()=>{const response=await POST(request("SALES"));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(await response.json()).toMatchObject({needsReview:true,pagesRead:28});mocks.read.mockRejectedValue(new Error("private-engine-path-secret"));const failed=await POST(request("SALES"));expect(failed.status).toBe(422);expect(await failed.text()).not.toContain("private-engine-path-secret");});
});
