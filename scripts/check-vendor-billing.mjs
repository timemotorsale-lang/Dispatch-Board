import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const original=new URL(process.env.DATABASE_URL||"postgresql://invalid/");
if(!["localhost","127.0.0.1","[::1]"].includes(original.hostname)||!["postgresql:","postgres:"].includes(original.protocol)||original.pathname==="/")throw new Error("This check requires loopback PostgreSQL and refuses remote databases.");
const schema=`vendor_billing_it_${randomUUID().replaceAll("-","")}`;
if(!/^vendor_billing_it_[a-f0-9]{32}$/.test(schema))throw new Error("Invalid isolated schema.");
const url=new URL(original);url.searchParams.set("schema",schema);
const env={...process.env,DATABASE_URL:url.toString(),RUN_VENDOR_BILLING_DATABASE:"1"};
const admin=new PrismaClient(),isolated=new PrismaClient({datasources:{db:{url:url.toString()}}});
const baseline=`work/${schema}.prisma`;
let created=false;
try{
 await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);created=true;
 // Build the pre-feature schema, then apply the actual additive release migration.
 let source=readFileSync("prisma/schema.prisma","utf8").replace(/model VendorBilling\w+ \{[\s\S]*?\n\}/g,"");
 source=source.replace(/model Vendor \{[\s\S]*?\n\}/,block=>block.replace(/^.*VendorBilling.*\r?\n/gm,"").replace(/^\s*@@unique\(\[organizationId, id\]\)\r?\n/m,""));
 mkdirSync("work",{recursive:true});writeFileSync(baseline,source);
 const setup=spawnSync(process.execPath,["node_modules/prisma/build/index.js","db","push","--skip-generate","--schema",baseline],{env,encoding:"utf8"});
 if(setup.status!==0)throw new Error(`Isolated baseline setup failed: ${setup.stderr}`);
 const migration=readFileSync("prisma/migrations/20261102050000_vendor_billing/migration.sql","utf8");
 await isolated.$transaction(async db=>{
  await db.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
  for(const statement of migration.split(";").map(s=>s.trim()).filter(Boolean))await db.$executeRawUnsafe(statement);
 },{timeout:60000});
 console.log("Applied the additive vendor billing migration to an isolated schema.");
 const result=spawnSync(process.execPath,["node_modules/vitest/vitest.mjs","run","src/tests/vendor-billing.test.ts","src/tests/vendor-billing-route.test.ts","src/tests/integration/vendor-billing.test.ts"],{env,stdio:"inherit"});
 process.exitCode=result.status??1;
}finally{
 await isolated.$disconnect();
 if(created)await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
 await admin.$disconnect();rmSync(baseline,{force:true});
 console.log("Removed this check's isolated schema; existing vendor records were not changed.");
}
