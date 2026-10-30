import type { ReactNode } from "react";
import { componentFor } from "@/lib/autobody-estimating/catalog";

export const CAMRY_VIEWS = ["front", "left", "right", "rear", "top"] as const;
export type CamryView = typeof CAMRY_VIEWS[number];
export const CAMRY_VISIBLE_COMPONENTS: Record<CamryView, string[]> = {
  front: ["hood", "windshield", "front-cover", "grille", "left-headlamp", "right-headlamp", "left-mirror", "right-mirror"],
  rear: ["back-glass", "decklid", "tail-lamp", "rear-cover"],
  left: ["left-fender", "left-front-door", "left-rear-door", "left-quarter", "left-rocker", "left-mirror", "door-glass"],
  right: ["right-fender", "right-front-door", "right-rear-door", "right-quarter", "right-rocker", "right-mirror", "door-glass"],
  top: ["hood", "windshield", "roof-panel", "back-glass", "decklid"],
};

/** Original exterior navigation artwork. Paths describe visual regions, never service boundaries. */
export function CamryIllustration({ view, selectedId, onSelect }: { view: CamryView; selectedId: string; onSelect: (id: string) => void }) {
  function panel(id: string, shape: ReactNode, fill = "#dfe7ef") {
    const label = componentFor(id)?.label ?? id;
    return <g key={id} data-component={id} role="button" tabIndex={0} aria-label={`Select ${label}`} aria-pressed={selectedId === id}
      onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); onSelect(id); } }}
      fill={selectedId === id ? "#9fbfff" : fill} stroke={selectedId === id ? "#224bc2" : "#52677d"} strokeWidth={selectedId === id ? 3 : 1.8} strokeLinejoin="round"><title>{label}</title>{shape}</g>;
  }
  const wheel = (cx: number) => <g key={cx} fill="none" stroke="#a0adbd"><circle cx={cx} cy="330" r="48" fill="#202c3c" stroke="#182231" strokeWidth="5" /><circle cx={cx} cy="330" r="34" fill="#364354" strokeWidth="2" />{Array.from({length: 10}, (_, i) => <path key={i} d={`M${cx - 3} 303L${cx + 4} 324L${cx + 1} 330`} transform={`rotate(${i * 36} ${cx} 330)`} strokeWidth="3" />)}<circle cx={cx} cy="330" r="7" fill="#718096" /></g>;
  const side = view === "left" || view === "right", sideId = view === "right" ? "right" : "left";
  return <>
    <text x="38" y="39" fontSize="21" fontWeight="700" fill="#17314e">2025 Toyota Camry SE</text>
    <text x="38" y="63" fontSize="13" fill="#536b86">{side ? `Vehicle ${sideId} · front at left` : `${view === "top" ? "Upper panels" : view === "front" ? "Front exterior · vehicle left at screen right" : "Rear exterior"}`} · original visual study</text>
    <ellipse cx="450" cy="393" rx="340" ry="18" fill="#e2e8f0" />
    {side ? <>
      <path d="M80 302L96 260L139 240L273 221L356 157Q371 145 409 145L516 148Q549 152 585 185L633 220L740 238L790 266L805 321L780 342H748Q741 276 690 276Q635 276 632 347H287Q283 276 231 276Q173 276 173 343L100 333Z" fill="#e8eef5" stroke="#425b77" strokeWidth="2.5" />
      {wheel(231)}{wheel(690)}
      {panel(`${sideId}-fender`, <path d="M96 260L139 240L291 222L308 264L288 330Q281 276 231 276Q177 276 173 326L89 318Z" />)}
      {panel(`${sideId}-front-door`, <path d="M314 223L377 164L438 161L456 331H302L309 264Z" />)}
      {panel(`${sideId}-rear-door`, <path d="M447 162L515 164Q546 170 578 199L612 229L621 331H464Z" />)}
      {panel(`${sideId}-quarter`, <path d="M621 227L740 241L780 268L792 320L751 331Q743 276 690 276Q650 276 632 312Z" />)}
      {panel("door-glass", <><path d="M328 221L384 169L434 169L440 220Z" /><path d="M453 169L513 171Q544 178 577 208L591 220H458Z" /></>, "#a9becf")}
      {panel(`${sideId}-rocker`, <path d="M296 334H625L632 349H289Z" />, "#35485e")}
      {panel(`${sideId}-mirror`, <path d="M328 211L301 201Q286 203 290 219L317 225Z" />, "#364b62")}
      <g fill="none" stroke="#647b94" strokeWidth="2" pointerEvents="none"><path d="M110 254L289 237M326 244H584L620 254M106 321H165M755 322H788" /><path d="M407 239H429M558 239H580" strokeWidth="5" /><path d="M627 224L730 239M98 274L144 266" /></g>
      <path d="M96 265L141 253L155 261L102 278Z" fill="#bce5f6" stroke="#4c667e" /><path d="M744 246L780 264L783 277L747 264Z" fill="#b64b55" />
    </> : view === "front" ? <>
      {panel("windshield", <path d="M312 111Q450 89 588 111L634 190H266Z" />, "#a9becf")}
      {panel("hood", <path d="M264 195L636 195L693 253Q450 293 207 253Z" />)}
      {panel("front-cover", <path d="M208 254Q450 289 692 254L722 291L716 363L669 390H231L184 363L178 291Z" />)}
      {panel("grille", <path d="M289 288Q450 309 611 288L653 360L624 375H276L247 360Z" />, "#25384c")}
      <g stroke="#52677d" strokeWidth="1" opacity=".7" pointerEvents="none">{Array.from({length: 11}, (_, i) => <path key={i} d={`M${272+i*30} 306l35 58m-35 0l35-58`} />)}</g>
      {panel("right-headlamp", <path d="M204 234L316 254L340 273L236 263L207 252Z" />, "#d5eff9")}
      {panel("left-headlamp", <path d="M696 234L584 254L560 273L664 263L693 252Z" />, "#d5eff9")}
      {panel("right-mirror", <path d="M264 175L226 167Q205 172 214 188L259 194Z" />, "#35485e")}
      {panel("left-mirror", <path d="M636 175L674 167Q695 172 686 188L641 194Z" />, "#35485e")}
      <g fill="none" stroke="#596e87" strokeWidth="2" pointerEvents="none"><path d="M307 201L338 249M593 201L562 249M218 292L246 307L221 344L201 344M682 292L654 307L679 344L699 344" /><path d="M217 375H683" strokeWidth="5" /><ellipse cx="450" cy="280" rx="12" ry="7" /></g>
    </> : view === "rear" ? <>
      {panel("back-glass", <path d="M315 118Q450 97 585 118L622 200H278Z" />, "#a9becf")}
      {panel("decklid", <path d="M271 203H629L691 243L667 308H233L209 243Z" />)}
      {panel("rear-cover", <path d="M217 294L683 294L712 322L704 371L663 392H237L196 371L188 322Z" />)}
      {panel("tail-lamp", <><path d="M210 237L329 247L354 272L244 263L222 253Z" /><path d="M690 237L571 247L546 272L656 263L678 253Z" /></>, "#b84c59")}
      <g fill="none" stroke="#536a82" strokeWidth="2" pointerEvents="none"><path d="M250 212H650M287 280H613M229 345H671" /><path d="M233 363L282 378H618L667 363" strokeWidth="8" /></g><rect x="395" y="299" width="110" height="35" rx="4" fill="#f5f8fc" stroke="#73849a" /><text x="450" y="323" textAnchor="middle" fontSize="16" letterSpacing="3" fill="#4a6077">CAMRY</text>
    </> : <g transform="translate(0 -15)">
      <path d="M339 104Q450 75 561 104L596 188V330L561 406Q450 430 339 406L304 330V188Z" fill="#e7edf4" stroke="#4e657f" strokeWidth="2" />
      {panel("hood", <path d="M341 110Q450 86 559 110L578 177H322Z" />)}
      {panel("windshield", <path d="M325 184H575L552 234H348Z" />, "#a9becf")}
      {panel("roof-panel", <path d="M352 241H548V318H352Z" />)}
      {panel("back-glass", <path d="M348 326H552L574 371H326Z" />, "#a9becf")}
      {panel("decklid", <path d="M329 378H571L554 403Q450 423 346 403Z" />)}
    </g>}
    <text x="450" y="452" textAnchor="middle" fontSize="14" fill="#435d7a">Select a visible panel to choose its operation · illustration is not a repair procedure</text>
  </>;
}
