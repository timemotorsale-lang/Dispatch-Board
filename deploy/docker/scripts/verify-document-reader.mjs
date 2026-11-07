import {access} from "node:fs/promises";
import {constants} from "node:fs";
import {PrismaClient} from "@prisma/client";
const database=new PrismaClient();
try{
 const root=process.env.DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT;
 if(!root)throw new Error("Private document storage is not configured.");
 await access(root,constants.R_OK|constants.W_OK);
 await database.documentReadingJob.findFirst({select:{id:true}});
 console.log("Document reader can access its saved queue and private originals.");
}catch{
 console.error("Document reader verification failed; check queue schema and private storage permissions.");
 process.exitCode=1;
}finally{await database.$disconnect();}
