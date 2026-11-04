type PrintDocument = { formId:string; contentType?:string; contentBase64?:string; signatureStatus?:string };
export async function cashSelectedPrintPdf(documents:PrintDocument[], selectedIds:string[], duplexSafe=true) {
  const ids=[...new Set(selectedIds)];if(!ids.length)throw new Error("Choose at least one form to preview or print.");
  const selected=ids.map(id=>documents.find(doc=>doc.formId===id));
  if(selected.some(doc=>!doc?.contentBase64 || doc.contentType!=="application/pdf"))throw new Error("Generate the selected forms before previewing or printing this selection.");
  if(selected.some(doc=>doc?.signatureStatus!=="UNSIGNED"))throw new Error("Use the document archive to print signed originals without changing their signatures.");
  const {PDFDocument}=await import("pdf-lib"),combined=await PDFDocument.create();
  for(const [index,doc] of selected.entries()){
    const source=await PDFDocument.load(Uint8Array.from(atob(doc!.contentBase64!),c=>c.charCodeAt(0)));
    source.getForm().flatten();
    for(const page of await combined.copyPages(source,source.getPageIndices()))combined.addPage(page);
    if(duplexSafe && source.getPageCount()%2===1 && index<selected.length-1)combined.addPage([612,792]);
  }
  if(!combined.getPageCount())throw new Error("The selected forms did not contain printable pages.");
  return new Uint8Array(await combined.save());
}
