import { afterEach, describe, expect, it, vi } from "vitest";
import { openPrintablePdfDocument } from "@/lib/printable-pdf";
afterEach(() => vi.unstubAllGlobals());
describe("printable PDF", () => {
 function setup(blocked=false) {
  const create=vi.fn(()=>"blob:printable-agreement"), revoke=vi.fn(), open=vi.fn(()=>blocked?null:{opener:{}}), timer=vi.fn();
  vi.stubGlobal("URL",{createObjectURL:create,revokeObjectURL:revoke});vi.stubGlobal("window",{open,setTimeout:timer});
  return {create,revoke,open,timer};
 }
 it("opens PDF bytes in the viewer instead of a blocked data URL",async()=>{
  const {create,open,timer}=setup();
  expect(openPrintablePdfDocument({contentType:"application/pdf",contentBase64:btoa("%PDF-1.7\nprintable agreement")})).toBe(true);
  expect(open).toHaveBeenCalledWith("blob:printable-agreement","_blank");
  expect(await (create.mock.calls as unknown as [[Blob]])[0][0].text()).toContain("%PDF-1.7");
  expect(timer).toHaveBeenCalledWith(expect.any(Function),300000);
 });
 it("reports blocked popups and releases the unused URL",()=>{
  const {revoke}=setup(true);
  expect(openPrintablePdfDocument({contentType:"application/pdf",contentBase64:btoa("%PDF-1.7")})).toBe(false);
  expect(revoke).toHaveBeenCalledWith("blob:printable-agreement");
 });
 it.each(["not pdf","%%%"])("rejects invalid document bytes: %s",value=>{
  const {open}=setup();expect(openPrintablePdfDocument({contentType:"application/pdf",contentBase64:value})).toBe(false);expect(open).not.toHaveBeenCalled();
 });
});
