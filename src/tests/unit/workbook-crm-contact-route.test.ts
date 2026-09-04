import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), findMany: vi.fn(), findAudit: vi.fn(), transaction: vi.fn(), createCustomer: vi.fn(), createNote: vi.fn(), createAudit: vi.fn(), createPoint: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/db/client", () => ({ prisma: { customer: { findMany: mocks.findMany }, enterpriseAuditEvent: { findFirst: mocks.findAudit, create: mocks.createAudit }, customerNote: { create: mocks.createNote }, $transaction: mocks.transaction } }));
import { POST } from "@/app/api/coo-workbook/crm-contacts/route";
const manager = { id:"manager-1",name:"Manager",email:"manager@test.com",isActive:true,roles:["General Manager"],duties:{direct:[],roleDefaults:[],all:[]} };
const body = { displayName:"Alex Smith",phoneNumber:"612 555 1212",email:"",company:"Example",sourceId:"update-1",sourceKind:"Quick Update",sourceText:"Alex requested a call." };
describe("workbook CRM contact import",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue(manager);mocks.findMany.mockResolvedValue([]);mocks.findAudit.mockResolvedValue(null)});
 it("stops before writing and prompts when a possible duplicate is found",async()=>{
  mocks.findMany.mockResolvedValue([{id:"customer-1",customerNumber:"CUS-1",displayName:"Alex Smith",phoneNumber:"+16125551212",email:null}]);
  const response=await POST(new Request("http://localhost/api/coo-workbook/crm-contacts",{method:"POST",body:JSON.stringify(body)}));
  expect(response.status).toBe(409); expect((await response.json()).code).toBe("POSSIBLE_DUPLICATE"); expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.createNote).not.toHaveBeenCalled();
 });
 it("checks normalized phone, email, and name within the organization",async()=>{
  await POST(new Request("http://localhost/api/coo-workbook/crm-contacts",{method:"POST",body:JSON.stringify(body)}));
  expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({take:5,where:expect.objectContaining({organizationId:"org-time-motor-sales",OR:expect.arrayContaining([{displayName:{equals:"Alex Smith",mode:"insensitive"}},{contactPoints:{some:{type:"PHONE",normalizedValue:"+16125551212"}}}])})}));
 });
 it("requires CRM authorization",async()=>{mocks.user.mockResolvedValue({...manager,roles:["Technician"]});const response=await POST(new Request("http://localhost/api/coo-workbook/crm-contacts",{method:"POST",body:JSON.stringify(body)}));expect(response.status).toBe(403);expect(mocks.findMany).not.toHaveBeenCalled()});
});
