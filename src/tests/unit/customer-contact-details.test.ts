import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {AuthenticatedUser} from "@/server/auth/store";
const mocks=vi.hoisted(()=>({findFirst:vi.fn(),organizations:vi.fn(),actor:vi.fn()}));
vi.mock("@/server/db/client",()=>({prisma:{customer:{findFirst:mocks.findFirst}}}));
vi.mock("@/server/repositories/unified-crm-customer-read-repository",()=>({createUnifiedCrmCustomerReadRepository:()=>({listActiveOrganizationIds:mocks.organizations})}));
vi.mock("@/server/auth/current-user",()=>({getCurrentUser:mocks.actor}));
import {getCustomerContactDetails} from "@/server/services/customer-contact-details-service";
import {GET} from "@/app/api/crm/v1/customers/[customerId]/contact-details/route";
import {GET as crmNextGET} from "@/app/api/crm-next/customers/[customerId]/contact-details/route";
const manager:AuthenticatedUser={id:"manager-a",name:"Manager",email:"manager@test.local",isActive:true,roles:["General Manager"],duties:{direct:[],roleDefaults:[],all:[]}};
const options={nodeEnv:"development",readMode:"REVIEW",shellMode:"REVIEW"};
describe("customer contact reveal",()=>{
 afterEach(()=>vi.unstubAllEnvs());
 beforeEach(()=>{vi.resetAllMocks();mocks.organizations.mockResolvedValue(["org-a"]);mocks.findFirst.mockResolvedValue({phoneNumber:"+16125550100",email:"staff@example.test",contactPoints:[]});});
 it("returns only phone and email after enforcing organization and customer scope",async()=>{
  expect(await getCustomerContactDetails(manager,"customer-a",options)).toEqual({customerId:"customer-a",contacts:[{type:"PHONE",value:"+16125550100"},{type:"EMAIL",value:"staff@example.test"}]});
  expect(mocks.findFirst.mock.calls[0][0].where).toMatchObject({id:"customer-a",organizationId:"org-a",archivedAt:null,mergedIntoCustomerId:null});
  expect(Object.keys(mocks.findFirst.mock.calls[0][0].select).sort()).toEqual(["contactPoints","email","phoneNumber"]);
 });
 it("keeps sales staff restricted to owned customers",async()=>{
  await getCustomerContactDetails({...manager,id:"sales-a",roles:["Salesperson"]},"customer-a",options);
  expect(mocks.findFirst.mock.calls[0][0].where.ownerUserId).toBe("sales-a");
 });
 it("denies unavailable customers without leaking their contact data",async()=>{
  mocks.findFirst.mockResolvedValue(null);await expect(getCustomerContactDetails(manager,"other-customer",options)).rejects.toMatchObject({httpStatus:404});
 });
 it("requires authentication before reading contact data",async()=>{
  await expect(getCustomerContactDetails(null,"customer-a",options)).rejects.toMatchObject({httpStatus:401});expect(mocks.findFirst).not.toHaveBeenCalled();
 });
 it("denies inactive accounts and ambiguous organizations",async()=>{
  await expect(getCustomerContactDetails({...manager,isActive:false},"customer-a",options)).rejects.toMatchObject({httpStatus:403});
  mocks.organizations.mockResolvedValue(["org-a","org-b"]);await expect(getCustomerContactDetails(manager,"customer-a",options)).rejects.toMatchObject({httpStatus:409});expect(mocks.findFirst).not.toHaveBeenCalled();
 });
 it("uses primary contact points without returning private handles or duplicate values",async()=>{
  mocks.findFirst.mockResolvedValue({phoneNumber:"legacy",email:"legacy@example.test",contactPoints:[{type:"PHONE",value:"+16125550101"},{type:"PHONE",value:"+16125550101"},{type:"EMAIL",value:"contact@example.test"},{type:"PRIVATE_HANDLE",value:"secret"}]});
  const result=await getCustomerContactDetails(manager,"customer-a",options);expect(result.contacts).toHaveLength(2);expect(JSON.stringify(result)).not.toMatch(/legacy|secret/);
 });
 it("does not allow browsers or intermediaries to cache contact responses",async()=>{
  mocks.actor.mockResolvedValue(null);const result=await GET(new Request("http://localhost/contact"),{params:Promise.resolve({customerId:"customer-a"})});
  expect(result.status).toBe(401);expect(result.headers.get("cache-control")).toBe("private, no-store");
 });
 it("serves enabled CRM Next contacts in production independently of legacy rollout flags",async()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("CRM_NEXT","REVIEW");vi.stubEnv("UNIFIED_CRM_CUSTOMER_READ_MODE","OFF");vi.stubEnv("UNIFIED_CRM_SHELL_MODE","OFF");mocks.actor.mockResolvedValue(manager);
  const result=await crmNextGET(new Request("http://localhost/api/crm-next/customers/customer-a/contact-details"),{params:Promise.resolve({customerId:"customer-a"})});
  expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toBe("private, no-store");expect(result.headers.get("vary")).toBe("Cookie");
  expect(await result.json()).toEqual({customerId:"customer-a",contacts:[{type:"PHONE",value:"+16125550100"},{type:"EMAIL",value:"staff@example.test"}]});
  expect((await GET(new Request("http://localhost/legacy"),{params:Promise.resolve({customerId:"customer-a"})})).status).toBe(503);
 });
 it("does not bypass disabled CRM Next or unauthenticated access",async()=>{
  vi.stubEnv("CRM_NEXT","OFF");mocks.actor.mockResolvedValue(manager);
  expect((await crmNextGET(new Request("http://localhost/contact"),{params:Promise.resolve({customerId:"customer-a"})})).status).toBe(403);
  mocks.actor.mockResolvedValue(null);
  expect((await crmNextGET(new Request("http://localhost/contact"),{params:Promise.resolve({customerId:"customer-a"})})).status).toBe(401);
  expect(mocks.findFirst).not.toHaveBeenCalled();
 });
 it("keeps CRM Next sales contact requests restricted to owned customers",async()=>{
  vi.stubEnv("CRM_NEXT","REVIEW");mocks.actor.mockResolvedValue({...manager,id:"sales-a",roles:["Salesperson"]});mocks.findFirst.mockResolvedValue(null);
  const response=await crmNextGET(new Request("http://localhost/contact"),{params:Promise.resolve({customerId:"other-owner"})});
  expect(response.status).toBe(404);expect(mocks.findFirst.mock.calls[0][0].where).toMatchObject({organizationId:"org-a",ownerUserId:"sales-a"});
  expect(JSON.stringify(await response.json())).not.toContain("staff@example.test");
 });
});
