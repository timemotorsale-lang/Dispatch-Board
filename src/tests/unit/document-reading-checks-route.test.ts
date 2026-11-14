import {beforeEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({user:vi.fn(),check:vi.fn()}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:mock.user}));
vi.mock("@/server/document-library/reading-checks",()=>({checkReadingReferences:mock.check}));
import {POST} from "@/app/api/document-library/read/jobs/[jobId]/checks/route";
import {MoneyError} from "@/lib/money-resources";
const context={params:Promise.resolve({jobId:"private-job"})};
const request=()=>new Request("http://localhost/api/document-library/read/jobs/private-job/checks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant:"Fictional Business"})});
beforeEach(()=>{vi.resetAllMocks();mock.user.mockResolvedValue({id:"staff",isActive:true});mock.check.mockResolvedValue({matches:[],duplicates:[],notes:[]});});
describe("OCR matching boundary",()=>{
 it("enforces origin and bounded payloads before accessing records",async()=>{const foreign=request();foreign.headers.set("origin","https://foreign.test");expect((await POST(foreign,context)).status).toBe(403);const large=request();large.headers.set("content-length","65537");expect((await POST(large,context)).status).toBe(413);expect(mock.check).not.toHaveBeenCalled();});
 it("passes authenticated actor and scoped job to the checker and disables caching",async()=>{const response=await POST(request(),context);expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");expect(mock.check).toHaveBeenCalledWith({id:"staff",isActive:true},"private-job",{merchant:"Fictional Business"});});
 it("returns authorization failures and hides internal errors",async()=>{mock.check.mockRejectedValueOnce(new MoneyError("Sign in",401));expect((await POST(request(),context)).status).toBe(401);mock.check.mockRejectedValueOnce(new Error("private-path"));expect(await (await POST(request(),context)).text()).not.toContain("private-path");});
});
