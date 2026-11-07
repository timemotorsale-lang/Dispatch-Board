type Word={text:string;bbox:{x0:number;y0:number;x1:number;y1:number}};
// OCR block order often reads the entire right-hand amount column last. Restore visual rows.
export function visualOcrLines(words:Word[]) {
  const rows:Array<{center:number;height:number;words:Word[]}>=[];
  for(const word of [...words].filter(w=>w.text.trim()).sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1))){
    const center=(word.bbox.y0+word.bbox.y1)/2,height=Math.max(1,word.bbox.y1-word.bbox.y0);
    const row=rows.find(r=>Math.abs(r.center-center)<=Math.max(4,Math.min(r.height,height)*0.6));
    if(row)row.words.push(word);else rows.push({center,height,words:[word]});
  }
  return rows.sort((a,b)=>a.center-b.center).map(row=>row.words.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(w=>w.text).join(" ")).join("\n");
}
