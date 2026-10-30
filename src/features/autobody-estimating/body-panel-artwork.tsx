import { useId } from "react";

export type BodyPanelArtworkKind = "bumper" | "grille" | "fender" | "quarter" | "absorber" | "reinforcement";

/** Original visual identification study; contours are not OEM dimensional or installation data. */
export function BodyPanelArtwork({ kind, rear = false }: { kind: BodyPanelArtworkKind; rear?: boolean }) {
  const id = useId().replace(/:/g, ""), paint = `${id}-paint`, edge = `${id}-edge`, cavity = `${id}-cavity`, mesh = `${id}-mesh`;
  const painted = `url(#${paint})`, rim = `url(#${edge})`, inside = `url(#${cavity})`;
  const bolt = (x: number, y: number) => <g key={`${x}:${y}`}><ellipse cx={x} cy={y} rx="5" ry="3.5" fill="#f3f6f8" stroke="#647a8d" strokeWidth="1.2" /><ellipse cx={x} cy={y} rx="2" ry="1.4" fill="#3d5263" /></g>;
  return <svg x="0" y="0" width="160" height="112" viewBox="0 0 800 480" aria-hidden="true" data-panel-artwork={rear && kind === "bumper" ? "rear-bumper" : kind === "bumper" ? "front-bumper" : kind}>
    <defs>
      <linearGradient id={paint} x1="0" y1="0" x2=".25" y2="1"><stop stopColor="#f6f8fa" /><stop offset=".24" stopColor="#d4dce2" /><stop offset=".48" stopColor="#f2f5f7" /><stop offset=".7" stopColor="#a6b5c1" /><stop offset="1" stopColor="#dfe6eb" /></linearGradient>
      <linearGradient id={edge} x1="0" y1="0" x2="1" y2=".4"><stop stopColor="#597080" /><stop offset=".35" stopColor="#c3cfd8" /><stop offset=".65" stopColor="#e2e9ee" /><stop offset="1" stopColor="#4f6576" /></linearGradient>
      <linearGradient id={cavity} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0c1b29" /><stop offset="1" stopColor="#405563" /></linearGradient>
      <pattern id={mesh} width="24" height="16" patternUnits="userSpaceOnUse"><path d="M0 8L12 0 24 8 12 16Z" fill="#172a37" stroke="#788d9c" strokeWidth="1.4" /></pattern>
    </defs>
    <ellipse cx="400" cy="407" rx="330" ry="15" fill="#233e52" opacity=".09" />
    {kind === "bumper" && (rear ? <g strokeLinejoin="round">
      <path d="M53 164Q77 122 146 112Q400 155 654 112Q723 122 747 164L762 285Q737 347 674 361L603 340Q400 364 197 340L126 361Q63 347 38 285Z" fill={painted} stroke="#5a6c7a" strokeWidth="3" />
      <path d="M75 151Q400 207 725 151L714 182Q400 229 86 182Z" fill="#879aa8" stroke="#526b7d" strokeWidth="2" /><path d="M90 152Q400 201 710 152" fill="none" stroke="#f5fafc" strokeWidth="4" />
      <path d="M98 286Q400 326 702 286L674 347 603 329Q400 350 197 329L126 347Z" fill="#263b4a" stroke="#526b7a" strokeWidth="3" />
      <path d="M150 302Q400 335 650 302M216 326L224 308M292 337L295 316M400 342V322M505 337L502 316M584 326L576 308" fill="none" stroke="#748793" strokeWidth="4" />
      <path d="M100 234L168 247 164 268 108 258ZM700 234L632 247 636 268 692 258Z" fill="#8c2738" stroke="#d2a5ac" strokeWidth="2" />
      <path d="M65 173L66 272 111 328M735 173L734 272 689 328" fill="none" stroke="#6f8392" strokeWidth="3" /><path d="M89 211Q400 265 711 211" fill="none" stroke="#fbfdff" strokeWidth="5" />
    </g> : <g strokeLinejoin="round">
      <path d="M48 169Q61 126 126 117L223 129Q269 159 400 159Q531 159 577 129L674 117Q739 126 752 169L768 288Q749 344 702 362L610 340Q400 368 190 340L98 362Q51 344 32 288Z" fill={painted} stroke="#526b7c" strokeWidth="3" />
      <path d="M51 172L71 173 83 278Q91 313 112 329L99 349Q53 322 43 283Z" fill={rim} /><path d="M749 172L729 173 717 278Q709 313 688 329L701 349Q747 322 757 283Z" fill={rim} />
      <path d="M244 175Q400 197 556 175L540 204Q400 226 260 204Z" fill={inside} stroke="#6b808f" strokeWidth="3" /><path d="M264 180Q400 196 536 180" fill="none" stroke="#c0cfd8" strokeWidth="3" />
      <path d="M241 241Q400 261 559 241L600 319Q400 356 200 319Z" fill={inside} stroke="#6a7e8c" strokeWidth="5" />
      <path d="M252 254Q400 272 548 254L572 304Q400 332 228 304Z" fill="#162b39" /><path d="M249 275Q400 293 551 275M239 294Q400 316 561 294" fill="none" stroke="#435b6b" strokeWidth="3" />
      <path d="M85 183L172 202 184 286 108 310Q83 266 85 183Z" fill={inside} stroke="#758b9a" strokeWidth="4" /><path d="M715 183L628 202 616 286 692 310Q717 266 715 183Z" fill={inside} stroke="#758b9a" strokeWidth="4" />
      <path d="M102 210L154 220 158 264 116 281ZM698 210L646 220 642 264 684 281Z" fill="#243c4b" stroke="#102330" strokeWidth="3" /><path d="M110 237L156 246M644 246L690 237" stroke="#697f8f" strokeWidth="5" />
      <path d="M97 327L190 321Q400 351 610 321L703 327L694 347 608 335Q400 365 192 335L106 347Z" fill="#435b6c" stroke="#293f50" strokeWidth="2" />
      <path d="M90 152L214 151Q400 191 586 151L710 152M189 216Q400 246 611 216" fill="none" stroke="#fbfdff" strokeWidth="5" />
      <path d="M202 171L218 222M598 171L582 222" fill="none" stroke="#869da9" strokeWidth="2" />
    </g>)}
    {kind === "grille" && <g strokeLinejoin="round">
      <path d="M69 154Q400 80 731 154L671 345Q400 413 129 345Z" fill="#172c3a" stroke="#5a7080" strokeWidth="8" /><path d="M90 166Q400 100 710 166L654 328Q400 391 146 328Z" fill={`url(#${mesh})`} stroke="#a2b3bf" strokeWidth="4" />
      <path d="M82 154Q400 92 718 154M145 346Q400 398 655 346" fill="none" stroke="#e3ecf2" strokeWidth="4" /><path d="M400 124V365" stroke="#475f70" strokeWidth="8" /><ellipse cx="400" cy="238" rx="46" ry="30" fill={rim} stroke="#213b4e" strokeWidth="4" />
    </g>}
    {(kind === "fender" || kind === "quarter") && <g strokeLinejoin="round">
      <path d={kind === "quarter" ? "M84 166L230 77 538 69 687 143 729 325 601 364Q597 213 438 222Q311 225 310 386L113 374 61 285Z" : "M70 192L205 93 514 71 690 139 730 302 605 347Q594 202 447 213Q315 222 310 387L96 372 49 287Z"} fill={painted} stroke="#526d80" strokeWidth="3" />
      <path d="M309 381Q303 203 447 193Q609 184 624 345" fill="none" stroke="#7c94a6" strokeWidth="12" /><path d="M313 377Q310 211 447 201Q602 192 617 341" fill="none" stroke="#e0eaf0" strokeWidth="4" />
      <path d="M102 202L225 117 506 95 662 152M103 312L274 322M627 287L704 272" fill="none" stroke="#fbfdff" strokeWidth="5" /><path d="M97 238L270 211M541 121L563 175" fill="none" stroke="#94aabb" strokeWidth="3" />
      <path d="M105 372L120 385 286 396 310 387M690 143L709 140 751 299 730 302" fill={rim} stroke="#657f92" strokeWidth="2" />
      {[[106,202],[223,111],[509,89],[681,146],[714,292],[118,366]].map(([x,y])=>bolt(x,y))}
    </g>}
    {kind === "reinforcement" && <g strokeLinejoin="round">
      <path d="M59 180Q400 82 741 180L726 280Q400 179 74 280Z" fill={painted} stroke="#536d80" strokeWidth="4" /><path d="M77 192Q400 111 723 192L713 246Q400 160 87 246Z" fill="#7f98aa" stroke="#e2ecf3" strokeWidth="4" />
      <path d="M210 247L211 354 277 374 282 236M518 236L523 374 589 354 590 247" fill={rim} stroke="#4c687e" strokeWidth="4" /><path d="M222 277L267 288M222 305L267 316M533 288L578 277M533 316L578 305" stroke="#637f93" strokeWidth="5" />
      {[[117,211],[201,190],[310,169],[490,169],[599,190],[683,211]].map(([x,y])=>bolt(x,y))}
    </g>}
    {kind === "absorber" && <g strokeLinejoin="round">
      <path d="M59 176Q400 85 741 176L721 292Q400 202 79 292Z" fill="#445460" stroke="#253b4c" strokeWidth="4" /><path d="M76 181Q400 105 724 181L713 237Q400 155 87 237Z" fill="#687883" stroke="#98a9b5" strokeWidth="2" />
      {[150,260,370,480,590].map((x,i)=><g key={x}><path d={`M${x} ${175-Math.sin(i/4*Math.PI)*30}v84l34 8v-84Z`} fill="#2c4252" /><path d={`M${x+6} ${184-Math.sin(i/4*Math.PI)*30}v59`} stroke="#8b9aa5" strokeWidth="3" /></g>)}
    </g>}
  </svg>;
}
