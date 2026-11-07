import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {checkReadingRequest} from "@/server/document-library/reading-http";
describe("production document reading",()=>{
 it("accepts the HTTPS browser host behind the private HTTP app proxy",()=>{
  expect(()=>checkReadingRequest(new Request("http://localhost:3000/api/document-library/read/jobs",{headers:{host:"dispatch-board.tail0d2437.ts.net",origin:"https://dispatch-board.tail0d2437.ts.net","sec-fetch-site":"same-origin"}}))).not.toThrow();
 });
 it("rejects foreign origins, wrong ports, malformed origins and cross-site metadata",()=>{
  for(const headers of [{origin:"https://foreign.test"},{origin:"http://localhost:3001"},{origin:"null"},{origin:"https://user:pass@localhost:3000"},{"sec-fetch-site":"cross-site"}])expect(()=>checkReadingRequest(new Request("http://localhost:3000/read",{headers}))).toThrow();
 });
 it("uses the private tooling worker with the same retained originals and no published port",()=>{
  const compose=readFileSync("deploy/docker/compose.yaml","utf8").replaceAll("\r\n","\n"),worker=compose.split("  document-reader:\n")[1]?.split("\n  backup:")[0];
  expect(worker).toBeDefined();for(const value of ['user: node','target: tooling','restart: unless-stopped','"documents:worker"','document_library_data:/app/data/document-library','DOCUMENT_TEXT_PDF_RENDERER_PATH: /usr/bin/pdftoppm','condition: service_healthy','- backend','- no-new-privileges:true'])expect(worker).toContain(value);expect(worker).not.toContain("ports:");
  expect(readFileSync(".github/workflows/deploy-production.yml","utf8")).toContain("compose exec -T document-reader node deploy/docker/scripts/verify-document-reader.mjs");
 });
 it("ships only the signing-library PDF directory required by runtime form generation",()=>{
  const ignore=readFileSync("deploy/docker/Dockerfile.dockerignore","utf8"),docker=readFileSync("deploy/docker/Dockerfile","utf8");
  expect(ignore).toContain("docs/*");expect(ignore).toContain("!docs/sales-signing-package/final/forms/*.pdf");
  expect(docker).toContain("COPY --from=builder --chown=node:node /app/docs/sales-signing-package/final/forms ./docs/sales-signing-package/final/forms");
 });
});
