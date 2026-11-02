import fs from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import esbuild from "esbuild";
import {chromium,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root=fileURLToPath(new URL("..",import.meta.url)),out=fs.mkdtempSync(join(tmpdir(),"task-intake-resolution-"));
const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {EnterpriseTaskIntakePrototype} from './src/features/prototype/enterprise-task-intake-prototype';createRoot(document.getElementById('root')).render(<EnterpriseTaskIntakePrototype {...window.__props}/>);`,resolveDir:root,loader:"tsx"},bundle:true,write:false,jsx:"automatic",loader:{".png":"dataurl"},plugins:[{name:"next-browser-fixture",setup(build){build.onResolve({filter:/^next\/(navigation|link|image)$/},args=>({path:args.path,namespace:"fixture"}));build.onLoad({filter:/.*/,namespace:"fixture"},args=>({contents:args.path==="next/navigation"?`export const useRouter=()=>({push:path=>window.__navigation.push(path)});`:args.path==="next/link"?`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`:`import React from 'react';export default function Image({alt,src,width,height,className}){return <img alt={alt} src={typeof src==='string'?src:src.src} width={width} height={height} className={className}/>}`,loader:"tsx",resolveDir:root}));}}]});
const css=fs.readFileSync(join(root,"src/app/globals.css"),"utf8");
const browser=await chromium.launch({channel:process.platform==="win32"?"msedge":undefined,headless:true});
try{
 for(const width of [1440,390])for(const scenario of ["restored-planning","linked-customer","completion-details","quick-task","operations-plan","inventory-plan","restored-operations"]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),calls=[],errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const base={title:"November 2026 action plans",brief:"Review and assign the main operating goals for November.",dueDate:"2026-11-02",dueTime:"16:30"};
  const props={currentUserId:"manager",canAssignOthers:true,defaultDueDate:"2026-11-02",staff:[{id:"manager",name:"Synthetic Manager",roles:["General Manager"],dutyPreview:[]}]};
  if(!scenario.startsWith("restored-"))props.initialDraft={...base,intakeType:scenario==="linked-customer"?"Customer Issue":scenario==="operations-plan"?"Operations / Action Plan":scenario==="inventory-plan"?"Inventory Movement":"Quick Task",...(scenario==="completion-details"?{brief:"Review team plans."}:{})};
  await page.addInitScript(({props,scenario,base})=>{
   window.__props=props;window.__navigation=[];
   if(scenario==="restored-planning")localStorage.setItem("dispatch-board.task-intake-draft.v1",JSON.stringify({...base,intakeType:"Manager Decision",requiresManagerApproval:false,contextOmitted:false,priority:"MEDIUM",workflowArea:"GENERAL_MANAGER",assignedUserId:"manager"}));
   if(scenario==="restored-operations")localStorage.setItem("dispatch-board.task-intake-draft.v1",JSON.stringify({...base,intakeType:"Operations / Action Plan",contextScope:"OPERATIONS",contextDetails:"All November operations including inventory management.",contextAreas:["INVENTORY","SERVICE"],contextOmitted:false,assignedUserId:"manager"}));
  },{props,scenario,base});
  let rejectOnce=scenario==="restored-planning";
  await page.route("https://task-intake.test/**",async route=>{
   const request=route.request();
   if(request.url().includes("/api/tasks")){
    calls.push(request.postDataJSON());
    if(rejectOnce){rejectOnce=false;return route.fulfill({status:503,json:{error:"Saving is temporarily unavailable. Retry this same task."}});}
    return route.fulfill({json:{task:{id:"synthetic-created-task"}}});
   }
   const asset=new URL(request.url()).pathname;
   if(asset.endsWith(".svg")||asset.endsWith(".png")){const file=join(root,"public",asset);if(fs.existsSync(file))return route.fulfill({contentType:asset.endsWith(".svg")?"image/svg+xml":"image/png",body:fs.readFileSync(file)});}
   return route.fulfill({contentType:"text/html",body:'<!doctype html><html lang="en"><head><title>Task intake regression review</title></head><body><main id="root"></main></body></html>'});
  });
  await page.goto("https://task-intake.test/");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
  const create=page.getByRole("button",{name:"Create Task",exact:true});
  if(["operations-plan","inventory-plan","restored-operations"].includes(scenario)){
   const scope=page.getByRole("combobox",{name:"This task covers",exact:true});
   await expect(scope).toBeVisible();
   if(scenario==="inventory-plan"){
    await page.getByRole("textbox",{name:"Vehicle / stock",exact:true}).fill("Previously selected vehicle");
    await scope.selectOption("INVENTORY");
    await page.getByRole("textbox",{name:"Scope details (optional)",exact:true}).fill("All active inventory, aging units, reconditioning and sales readiness.");
   }else{
    await expect(scope).toHaveValue("OPERATIONS");
    if(scenario==="restored-operations")await expect(page.getByRole("textbox",{name:"Scope details (optional)",exact:true})).toHaveValue("All November operations including inventory management.");
    await page.getByText(/Operating areas \(optional\)/).click();
    await page.getByRole("checkbox",{name:"Inventory management",exact:true}).check();
    await page.getByRole("checkbox",{name:"Service and reconditioning",exact:true}).check();
    await page.getByRole("combobox",{name:/^Task tools/}).selectOption("subtasks");
    await page.getByRole("textbox",{name:"Add subtask",exact:true}).fill("Inventory management");await page.getByRole("button",{name:"Add subtask",exact:true}).click();
   }
   await expect(page.getByRole("checkbox",{name:"No customer or vehicle is needed for this task"})).toHaveCount(0);
   await page.getByRole("button",{name:"Save Draft",exact:true}).click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("dispatch-board.task-intake-draft.v1")));expect(saved.contextOmitted).toBe(false);
   await page.screenshot({path:join(out,`${scenario}-${width}.png`),fullPage:true});
   await create.click();expect(calls[0].intakeMetadata.contextOmitted).toBe(false);expect(calls[0].intakeMetadata.contextScope).toBe(scenario==="inventory-plan"?"INVENTORY":"OPERATIONS");expect(calls[0].vehicleReference).toBeUndefined();
   if(scenario!=="inventory-plan"){expect(calls[0].intakeMetadata.contextAreas).toContain("INVENTORY");expect(calls[0].intakeMetadata.taskTools.subtaskTemplates).toContain("Inventory management");}
  }else if(scenario==="restored-planning"){
   await expect(page.getByRole("group",{name:"Task scope and context"})).toBeVisible();
   await create.click();
   const notice=page.getByRole("alert",{name:"Complete task requirements"});
   await expect(notice.getByRole("button",{name:"Review manager approval"})).toBeVisible();expect(calls).toHaveLength(0);
   await expect(page.locator("#task-intake-manager-approval")).toBeFocused();await page.getByRole("checkbox",{name:"Require manager approval before completion"}).check();
   await expect(notice.getByRole("button",{name:"Review manager approval"})).toHaveCount(0);
   await notice.getByRole("button",{name:"Choose task context"}).click();await expect(page.locator("#task-intake-context")).toBeFocused();
   await page.getByRole("checkbox",{name:"No customer or vehicle is needed for this task"}).check();
   await expect(notice).toHaveCount(0);await expect(page.getByText("Required details are complete. You can create this task.")).toBeVisible();
   await expect(page.locator("#task-intake-title")).toHaveValue(base.title);await expect(page.locator("#task-intake-description")).toHaveValue(base.brief);
   await page.screenshot({path:join(out,`planning-ready-${width}.png`),fullPage:true});
   await create.click();await expect(page.getByRole("alert")).toContainText("Saving is temporarily unavailable");await expect(page.locator("#task-intake-title")).toHaveValue(base.title);await create.click();
   expect(calls).toHaveLength(2);expect(calls[1].intakeMetadata.contextOmitted).toBe(true);expect(calls[1].requiresManagerApproval).toBe(true);
  }else if(scenario==="linked-customer"){
   await create.click();await expect(page.locator("#task-intake-context")).toBeFocused();
   await page.getByRole("textbox",{name:"Customer / concern",exact:true}).fill("Synthetic customer: confirm the appointment");
   await expect(page.getByRole("alert",{name:"Complete task requirements"})).toHaveCount(0);await create.click();
   expect(calls[0].intakeMetadata.contextOmitted).toBe(false);expect(calls[0].customerReference).toContain("Synthetic customer");
  }else if(scenario==="completion-details"){
   await page.getByRole("combobox",{name:/^Task tools/}).selectOption("requirements");
   await page.getByRole("checkbox",{name:"Next step",exact:true}).uncheck();await page.getByRole("checkbox",{name:"Final note",exact:true}).uncheck();
   await create.click();await expect(page.locator("#task-intake-outcome")).toBeFocused();
   await page.getByRole("textbox",{name:"Expected outcome"}).fill("Every team member has an assigned, dated November action plan.");
   await page.getByRole("button",{name:"Choose required updates",exact:true}).click();await expect(page.locator("#task-intake-required-updates")).toBeFocused();
   await page.getByRole("checkbox",{name:"Next step",exact:true}).check();await create.click();expect(calls[0].intakeMetadata.requiredUpdates).toEqual(["Next step"]);
  }else{
   await expect(page.getByRole("checkbox",{name:"No customer or vehicle is needed for this task"})).toHaveCount(0);await create.click();expect(calls[0].intakeMetadata.intakeType).toBe("Quick Task");
  }
  await expect.poll(()=>page.evaluate(()=>window.__navigation.length)).toBe(1);
  expect(await page.evaluate(()=>window.__navigation[0])).toContain("/tasks/synthetic-created-task");
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(scenario==="restored-planning"){
   const results=await new AxeBuilder({page}).include("#task-intake-context").withTags(["wcag2a","wcag2aa"]).analyze();expect(results.violations.map(v=>v.id)).toEqual([]);
  }
  console.log(`Task intake ${scenario} passed at ${width}px`);await context.close();
 }
 console.log(`Task intake review screenshots: ${out}`);
}finally{await browser.close();}
