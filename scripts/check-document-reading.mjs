import "dotenv/config";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import {PrismaClient} from "@prisma/client";
const original=new URL(process.env.DATABASE_URL||"postgresql://invalid/");
if(!["localhost","127.0.0.1","[::1]"].includes(original.hostname)||!["postgresql:","postgres:"].includes(original.protocol)||original.pathname==="/")throw new Error("Loopback PostgreSQL only.");
const schema=`document_reading_it_${randomUUID().replaceAll("-","")}`;
if(!/^document_reading_it_[a-f0-9]{32}$/.test(schema))throw new Error("Invalid isolated schema.");
const url=new URL(original);url.searchParams.set("schema",schema);
const env={...process.env,DATABASE_URL:url.toString(),RUN_DOCUMENT_READING_DATABASE:"1"};
const admin=new PrismaClient(),isolated=new PrismaClient({datasources:{db:{url:url.toString()}}}),baseline=`work/${schema}.prisma`;
let created=false;
try{
 await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);created=true;
 let source=readFileSync("prisma/schema.prisma","utf8").replace(/model DocumentReading(?:Job|Page|Event) \{[\s\S]*?\n\}/g,"").replace(/^.*readingJobs\s+DocumentReadingJob\[\].*\r?\n/gm,"");
 mkdirSync("work",{recursive:true});writeFileSync(baseline,source);
 const setup=spawnSync(process.execPath,["node_modules/prisma/build/index.js","db","push","--skip-generate","--schema",baseline],{env,encoding:"utf8"});
 if(setup.status!==0)throw new Error(`Isolated setup failed: ${setup.stderr}`);
 const sql=readFileSync("prisma/migrations/20261107200000_resumable_document_reading/migration.sql","utf8");
 await isolated.$transaction(async tx=>{await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);for(const statement of sql.split(";").map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);},{timeout:60000});
 console.log("Applied actual saved-reading migration in isolated schema.");
 const result=spawnSync(process.execPath,["node_modules/vitest/vitest.mjs","run","src/tests/integration/document-reading-jobs.test.ts"],{env,stdio:"inherit"});process.exitCode=result.status??1;
}finally{
 await isolated.$disconnect();if(created)await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await admin.$disconnect();rmSync(baseline,{force:true});console.log("Removed isolated test schema; existing records were not changed.");
}
