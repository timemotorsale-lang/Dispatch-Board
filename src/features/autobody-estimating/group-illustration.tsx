import { componentFor } from "@/lib/autobody-estimating/catalog";
import { groupComponents, type GroupView, type VehicleGroup } from "@/lib/autobody-estimating/vehicle-groups";

export function GroupIllustration({ group, view, selectedId, onSelect }: { group: VehicleGroup; view: GroupView; selectedId: string; onSelect: (id: string) => void }) {
  const ids = groupComponents(group, view), roof = group.roof, end = group.length;
  const tall = ["van", "bus", "truck"].includes(group.body);
  const panel = (id: string, d: string, fill = "#dfe8f2") => <g key={id} data-component={id} role="button" tabIndex={0} aria-pressed={selectedId === id} aria-label={`Select ${componentFor(id)?.label}`} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); onSelect(id); } }}><title>{componentFor(id)?.label}</title><path d={d} fill={id === selectedId ? "#a0bfff" : fill} stroke={id === selectedId ? "#214ac0" : "#58708c"} strokeWidth={id === selectedId ? 3 : 2} strokeLinejoin="round" /></g>;
  const wheel = (x: number) => <g key={x} stroke="#253b53"><circle cx={x} cy="334" r="43" fill="#2c3b4d" /><circle cx={x} cy="334" r="28" fill="#a3b3c3" /><circle cx={x} cy="334" r="9" fill="#526a83" /><path d={`M${x} 310v48m-24-24h48m-41-17l34 34m0-34l-34 34`} /></g>;
  const sidePath = (id: string) => {
    if (id === "front-cover") return "M62 259H129V320H62Z";
    if (id === "rear-cover") return `M${end-55} 285H${end}V324H${end-55}Z`;
    if (id === "bus-entry") return `M120 ${roof+62}H212V324H120Z`;
    if (id === "bus-side") return `M224 ${roof+36}H${end-24}V315H224Z`;
    if (id === "roof-panel") return `M101 ${roof}H${end-29}V${roof+24}H101Z`;
    if (id === "cargo-box") return `M351 ${roof}H${end-10}V313H351Z`;
    if (id === "truck-bed") return `M550 209H${end-15}V315H748Q728 264 681 283Q650 293 642 315H550Z`;
    if (id === "tailgate") return `M${end-24} 209H${end-7}V314H${end-24}Z`;
    if (id.endsWith("-fender")) return "M71 254L272 218L296 278L284 316Q270 277 227 280Q182 284 174 316H66Z";
    if (id.endsWith("-front-door")) return `M284 223L${tall ? 228 : 350} ${roof+17}H${group.body === "pickup" ? 436 : 451}V317H291Z`;
    if (id.endsWith("-rear-door") || id.endsWith("-sliding-door")) return `M460 ${roof+18}H${group.body === "pickup" ? 535 : 601}L624 225V318H460Z`;
    if (id.endsWith("-quarter")) return `M633 ${group.body === "sedan" || group.body === "coupe" ? 224 : roof+30}L${end-36} 237L${end-13} 282V318H744Q733 277 690 280Q650 280 636 318Z`;
    if (id.endsWith("-rocker")) return "M297 322H628V338H297Z";
    return "M291 220L268 207L252 212V229L281 233Z";
  };
  function pathFor(id: string): string {
    if (view === "left" || view === "right") return sidePath(id);
    if (view === "front") {
      if (id === "windshield") return `M302 ${tall ? 112 : 136}H598L${tall ? 623 : 636} 215H264Z`;
      if (id === "hood") return "M264 222H636L677 271H223Z";
      if (id === "front-cover") return "M217 274H683L707 302V370H193V302Z";
      if (id === "grille") return "M309 294H591L615 355H285Z";
      if (id === "left-headlamp") return "M604 258L685 268L674 291H601Z";
      return "M296 258L215 268L226 291H299Z";
    }
    if (view === "rear") {
      if (id === "rear-cover") return "M216 308H684L706 338V375H194V338Z";
      if (id === "tail-lamp") return "M213 246H257V298H213ZM643 246H687V298H643Z";
      if (id === "left-cargo-door") return "M262 129H447V302H262Z";
      if (id === "right-cargo-door") return "M453 129H638V302H453Z";
      if (id === "decklid") return "M280 231H620L646 267V303H254V267Z";
      if (id === "tailgate") return "M265 233H635V304H265Z";
      return `M266 ${tall ? 114 : 156}H634L648 304H252Z`;
    }
    if (id === "hood") return "M344 114H556L575 186H325Z";
    if (id === "windshield") return "M329 192H571L550 233H350Z";
    if (id === "roof-panel") return `M350 241H550V${group.rear === "decklid" || group.body === "pickup" ? 310 : 385}H350Z`;
    if (id === "back-glass") return "M350 319H550L571 360H329Z";
    if (id === "truck-bed") return "M340 320H560V410H340Z";
    return "M331 370H569L555 411H345Z";
  }
  return <>
    <text x="36" y="38" fontSize="22" fontWeight="700" fill="#193450">{group.label}</text><text x="36" y="63" fontSize="13" fill="#526c89">{view === "left" || view === "right" ? `Vehicle ${view} · front at left` : view === "top" ? "Upper body" : `${view} exterior`} · generic body-group illustration</text>
    <ellipse cx="450" cy="393" rx="344" ry="16" fill="#e1e8f1" />
    {view === "left" || view === "right" ? <>
      <path d={tall ? `M65 324V216L128 ${roof}H${end-24}L${end} ${roof+38}V324Z` : group.body === "pickup" ? `M67 321V263L248 224L335 ${roof}H483L550 218H${end-7}V325Z` : group.body === "sedan" || group.body === "coupe" ? `M65 323L83 260L267 222L354 ${roof}H522L636 224L${end-32} 249L${end} 289V325Z` : `M65 323L83 257L253 216L337 ${roof}H${end-89}L${end-20} 221L${end} 291V325Z`} fill="#e8eff7" stroke="#425f7c" strokeWidth="3" />
      {ids.map(id => panel(id, pathFor(id), id.includes("mirror") ? "#59738d" : undefined))}
      <g fill="#a3bdce" stroke="#5d778f" strokeWidth="1.5" pointerEvents="none">{tall ? Array.from({length: group.body === "bus" ? 7 : 3}, (_, index) => <rect key={index} x={group.body === "bus" ? 238 + index * 77 : 256 + index * 150} y={roof + 40} width={group.body === "bus" ? 64 : 121} height={group.body === "bus" ? 78 : 87} rx="4" />) : <><path d={`M303 217L359 ${roof+24}H433V217Z`} /><path d={`M471 ${roof+24}H${group.body === "pickup" ? 505 : 547}L595 217H471Z`} /></>}</g>
      {wheel(228)}{wheel(tall ? end-122 : 689)}
    </> : <>{view === "rear" && <path d="M298 136Q450 105 602 136L639 226H261Z" fill="#aec3d3" stroke="#57718d" />}{view === "top" && <path d="M338 103Q450 78 562 103L599 190V340L571 421H329L301 340V190Z" fill="#e5ecf4" stroke="#58708c" />}{ids.map(id => panel(id, pathFor(id), id.includes("glass") || id === "windshield" ? "#a3bdce" : id.includes("lamp") ? "#b9d8ed" : id === "grille" ? "#344c65" : undefined))}</>}
    <text x="450" y="455" textAnchor="middle" fontSize="14" fill="#435e7c">Select a panel, then explore its components below. Equipment and serviceability vary.</text>
  </>;
}
