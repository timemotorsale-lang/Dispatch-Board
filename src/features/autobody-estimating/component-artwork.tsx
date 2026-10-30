import { useId } from "react";
import type { AssemblyItem } from "@/lib/autobody-estimating/assemblies";

/** Visual classification only. Never establishes fitment, serviceability or labor. */
export function componentArtworkKind(item: AssemblyItem) {
  const label = item.label.toLowerCase(), door = /door|lfd|rfd|lrd|rrd|lsd|rsd|lcd|rcd/.test(item.id);
  if (/speaker/.test(label)) return "speaker";
  if (/trim panel|interior trim|armrest/.test(label)) return "door-trim";
  if (/inner shell|intrusion/.test(label)) return "door-shell";
  if (/outer skin/.test(label) || (door && /outer panel/.test(label))) return "door-skin";
  if (/glass & window/.test(label)) return "window-assembly";
  if (/regulator/.test(label)) return "regulator";
  if (/actuator/.test(label)) return "actuator";
  if (/motor/.test(label)) return "motor";
  if (/switch/.test(label)) return "switch";
  if (/exterior handle/.test(label)) return "exterior-handle";
  if (/interior release|pull handle/.test(label)) return "interior-handle";
  if (/handles, latch|latch|lock assembly|lock cylinder/.test(label)) return "latch";
  if (/striker/.test(label)) return "striker";
  if (/hinge|door check|limiter/.test(label)) return "hinge";
  if (/roller|track/.test(label)) return "roller";
  if (/connector|terminal/.test(label)) return "connector";
  if (/boot|grommet/.test(label)) return "boot";
  if (/harness|electrical connections/.test(label)) return "harness";
  if (/barrier|adhesive/.test(label)) return "barrier";
  if (/clip|retainer|fastener|screw|mounting hardware|mounts/.test(label)) return "hardware";
  if (/grille|mesh/.test(label)) return "grille";
  if (/belt molding|molding|air guide/.test(label)) return "molding";
  if (/cable|linkage|coupling/.test(label)) return "cable";
  if (/fender|wheelhouse liner|splash shield/.test(label)) return /liner|shield/.test(label) ? "liner" : "fender";
  if (/fascia|outer cover|bumper cover/.test(label)) return "bumper";
  if (/mirror/.test(label) || (/outer cap/.test(label) && /mirror/.test(item.id))) return "mirror";
  if (/lens|housing|reflector|lamp|bulb/.test(label)) return "lamp";
  if (/damper|support cable/.test(label)) return "strut";
  if (/drain|plug|stop|bumper/.test(label)) return "plugs";
  if (/sensor|camera|interlock|anti-pinch/.test(label)) return "sensor";
  if (/hood|bonnet/.test(label) && item.geometry === "hood") return "hood";
  if (/decklid|trunk lid|tailgate/.test(label)) return "tailgate";
  if (/roof panel|outer roof/.test(label)) return "roof";
  if (/seal|weatherstrip|channel/.test(label) || item.geometry === "seal") return "weatherstrip";
  if (item.geometry === "glass") return "glass";
  if (item.geometry === "door") return "door-shell";
  if (item.geometry === "cover") return "bumper";
  if (item.geometry === "lamp") return "lamp";
  if (item.geometry === "rail" || item.geometry === "beam") return "bracket";
  if (item.geometry === "tube") return "harness";
  if (item.geometry === "sensor") return "module";
  if (item.geometry === "seat") return "seat";
  if (item.geometry === "wheel") return "wheel";
  if (item.geometry === "battery") return "battery";
  return "formed-panel";
}

/** Original, generic material illustrations in a 160 × 112 drawing space. */
export function ComponentArtwork({ item }: { item: AssemblyItem }) {
  const uid = useId().replace(/:/g, ""), metalId = `${uid}-metal`, darkId = `${uid}-dark`, glassId = `${uid}-glass`;
  const metal = `url(#${metalId})`, dark = `url(#${darkId})`, glass = `url(#${glassId})`;
  const kind = componentArtworkKind(item);
  const screw = (x: number, y: number) => <g key={`${x}:${y}`} fill="#8795a3" stroke="#354555" strokeWidth=".8"><circle cx={x} cy={y} r="2.7" /><path d={`M${x-1.5} ${y}h3m-1.5-1.5v3`} /></g>;
  const plate = (x: number, y: number) => <g key={`${x}:${y}`} fill={metal} stroke="#46596b" strokeWidth="1"><path d={`M${x} ${y}l17-5 6 14-15 7Z`} /><circle cx={x+11} cy={y+5} r="2.5" fill="#26384a" /></g>;
  let drawing;
  switch (kind) {
    case "speaker": drawing = <>
      <path d="M46 30L40 69Q80 105 121 69L113 30Z" fill={dark} /><ellipse cx="80" cy="40" rx="53" ry="33" fill="#25303b" stroke="#111d29" strokeWidth="2" />
      <path d="M29 40L22 32 30 21 42 23M118 24L131 21 139 33 130 40M42 64L34 72 45 81 56 75M104 75L118 81 129 72 121 63" fill="#46525e" />
      <ellipse cx="80" cy="40" rx="43" ry="27" fill="#151f2a" stroke="#6a7683" strokeWidth="2.5" /><ellipse cx="80" cy="40" rx="36" ry="22" fill="#4c5663" /><ellipse cx="80" cy="40" rx="28" ry="18" fill="#303d4b" />
      <path d="M52 40Q80 65 108 40Q80 28 52 40Z" fill="#1c2937" /><ellipse cx="80" cy="40" rx="14" ry="9" fill="#8994a1" stroke="#202f3f" />
      <path d="M49 65L57 86M70 72L72 94M91 72L89 94M112 65L104 86" fill="none" stroke="#788390" strokeWidth="3" /><path d="M112 77L128 77V85H116" fill="#c7a562" />
      {[ [29,31],[132,31],[43,73],[119,73] ].map(([x,y]) => screw(x,y))}
    </>; break;
    case "door-trim": drawing = <>
      <path d="M12 22L105 14 146 43 143 93 30 104 13 85Z" fill={dark} stroke="#26394b" strokeWidth="1.6" /><path d="M17 25L103 19 139 43 22 54Z" fill="#596775" />
      <path d="M24 52L115 42 127 55 36 66Z" fill="#9cabb8" /><path d="M48 43L98 36 110 42 59 50Z" fill="#172531" stroke="#a1aeba" />
      <path d="M48 58L114 51 117 64 52 73Z" fill="#394c5d" /><path d="M35 78L124 68 126 88 45 97Z" fill="#14232f" /><path d="M43 83L116 75M48 89L117 81" stroke="#556575" fill="none" />
      <ellipse cx="31" cy="68" rx="13" ry="17" fill="#1b2936" stroke="#617180" /><g fill="#788593">{Array.from({length:18},(_,i)=><circle key={i} cx={23+i%4*4} cy={57+Math.floor(i/4)*5} r=".8" />)}</g>
      <path d="M94 29L115 27 124 35 104 38Z" fill="#273644" /><path d="M101 30L107 34M111 29L117 33" stroke="#c4d0d9" />
    </>; break;
    case "door-skin": drawing = <><path d="M16 23L109 13 145 43 142 92 26 104 13 80Z" fill={metal} stroke="#4e6275" strokeWidth="1.7" /><path d="M27 28L104 20 128 43 24 53Z" fill="#e6edf2" stroke="#677d90" /><path d="M27 60L131 49M29 88L129 78" fill="none" stroke="#a9b7c5" strokeWidth="2" /><path d="M104 55L122 53 121 59 103 61Z" fill="#43596c" /><path d="M20 79L28 99 138 88" fill="none" stroke="#fff" strokeWidth="1.5" /></>; break;
    case "door-shell": drawing = <>
      <path d="M17 24L107 12 145 44 140 95 24 105 13 77Z" fill={metal} stroke="#415a70" strokeWidth="1.7" /><path d="M28 29L103 21 128 43 25 53Z" fill="#f6f9fc" stroke="#5a7287" />
      <path d="M33 62L69 58 73 83 37 89ZM88 57L122 53 126 78 94 83Z" fill="#4f6578" stroke="#d0dbe3" strokeWidth="3" /><path d="M25 93L135 66" stroke="#8a9eaf" strokeWidth="7" />
      <path d="M25 93L135 66" stroke="#d9e4eb" strokeWidth="2" /><ellipse cx="25" cy="69" rx="8" ry="10" fill="#364d60" />{[[23,48],[36,99],[134,48],[131,88],[80,57]].map(([x,y])=>screw(x,y))}
    </>; break;
    case "window-assembly": drawing = <><path d="M24 15L108 10 137 44 20 51Z" fill={glass} stroke="#5a8299" strokeWidth="1.3" /><path d="M39 51V100M119 43V92M39 96L119 49M42 54L119 91" stroke="#71899c" strokeWidth="5" fill="none" /><path d="M50 22L35 39M64 20L49 37" stroke="#fff" strokeWidth="3" opacity=".7" /><circle cx="80" cy="75" r="11" fill="#4b6175" /><rect x="77" y="79" width="30" height="16" rx="5" fill="#344c5e" />{screw(40,54)}{screw(119,48)}</>; break;
    case "regulator": drawing = <><path d="M37 14L42 99M121 9L124 95" stroke="#526b7f" strokeWidth="8" /><path d="M37 14L42 99M121 9L124 95" stroke="#c4d4df" strokeWidth="3" /><path d="M42 25L122 87M42 91L121 20" stroke="#71899c" strokeWidth="6" /><path d="M43 26L121 88M43 91L120 20" stroke="#d2dde6" strokeWidth="2" /><circle cx="81" cy="58" r="12" fill={metal} stroke="#344c61" /><path d="M70 69L100 66 113 78 107 95 76 97 66 84Z" fill="#253c50" />{[[37,14],[42,99],[121,9],[124,95],[81,58]].map(([x,y])=>screw(x,y))}</>; break;
    case "motor": drawing = <><path d="M30 47Q26 34 40 30L85 22 95 60 48 72Q33 73 30 59Z" fill={metal} stroke="#435b70" strokeWidth="1.5" /><ellipse cx="86" cy="42" rx="11" ry="21" fill="#879aa9" stroke="#425b70" /><path d="M83 28L109 23 134 40 129 67 102 79 80 60Z" fill="#344e63" stroke="#1e3448" strokeWidth="2" /><ellipse cx="108" cy="50" rx="18" ry="20" fill={metal} stroke="#425b70" /><circle cx="108" cy="50" r="8" fill="#526c82" /><path d="M111 39V21M34 42L23 40 20 51 30 56" stroke="#34495c" strokeWidth="7" /><path d="M122 73L138 70 144 80 130 85Z" fill="#243d50" />{[[109,28],[126,60],[94,65]].map(([x,y])=>screw(x,y))}</>; break;
    case "actuator": case "latch": drawing = <><path d="M43 14L107 11 129 30 123 82 91 99 43 83 32 46Z" fill={kind==="latch"?metal:dark} stroke="#344d62" strokeWidth="1.6" /><path d="M54 29L97 23 111 34 106 67 77 83 50 70Z" fill="#263e53" /><path d="M85 32Q114 39 94 59L86 68 75 58 87 49 78 41Z" fill="#a3b3c1" stroke="#415c73" /><path d="M42 77L23 90M115 29L139 17" stroke="#859dae" strokeWidth="5" /><path d="M41 41L22 42V60H39" fill="#223a4e" />{[[47,23],[117,33],[111,78],[52,75]].map(([x,y])=>screw(x,y))}</>; break;
    case "switch": drawing = <><path d="M29 24L109 15 136 40 126 83 44 95 20 72Z" fill={dark} stroke="#2c4256" strokeWidth="1.6" /><path d="M38 30L105 23 124 41 116 73 48 84 30 66Z" fill="#465c70" />{[[45,39],[78,34],[42,59],[75,54]].map(([x,y])=><g key={x+":"+y}><path d={`M${x} ${y}l23-3 5 14-23 4Z`} fill="#142c40" stroke="#7e93a5" /><path d={`M${x+8} ${y+5}h7`} stroke="#e1eaf1" /></g>)}<circle cx="110" cy="45" r="7" fill="#1c3448" stroke="#8499aa" /></>; break;
    case "exterior-handle": drawing = <><path d="M20 48Q77 23 141 39L136 63Q78 54 26 75Z" fill="#263e52" /><path d="M28 45Q80 29 133 40L130 51Q81 43 32 60Z" fill={metal} stroke="#526b80" strokeWidth="1.4" /><path d="M32 46Q82 32 129 41" stroke="#fff" fill="none" /><path d="M33 64L34 89H44L49 58M117 52V79L127 76V53" fill="#637e94" /><ellipse cx="119" cy="44" rx="5" ry="3" fill="#283f53" /></>; break;
    case "interior-handle": drawing = <><path d="M24 26L120 20 143 46 128 90 36 98 17 70Z" fill={dark} stroke="#2c4358" /><path d="M39 40L111 33 124 49 112 74 45 82 33 67Z" fill="#122b40" /><path d="M47 52Q82 32 113 43L107 54Q76 49 55 67Z" fill={metal} stroke="#859bab" /><circle cx="47" cy="57" r="4" fill="#a6b8c6" /></>; break;
    case "striker": drawing = <><path d="M35 41L92 25 119 52 60 73Z" fill={metal} stroke="#536c7f" /><path d="M56 48V28Q57 14 73 17L89 23Q98 27 97 39V46" fill="none" stroke="#405a70" strokeWidth="10" /><path d="M56 48V28Q57 17 73 20L89 26Q94 28 94 39V46" fill="none" stroke="#d1dde6" strokeWidth="5" />{screw(47,48)}{screw(99,49)}</>; break;
    case "hinge": drawing = <><path d="M26 29L67 18 79 43 37 58Z" fill={metal} stroke="#526b80" /><path d="M79 42L127 31 141 63 93 79Z" fill={metal} stroke="#526b80" /><path d="M69 26L85 77" stroke="#374f65" strokeWidth="17" /><path d="M69 26L85 77" stroke="#b8c9d7" strokeWidth="9" /><ellipse cx="69" cy="25" rx="9" ry="5" fill="#e0e8ef" stroke="#526b80" />{screw(42,37)}{screw(58,31)}{screw(107,50)}{screw(124,47)}</>; break;
    case "roller": drawing = <><path d="M16 32L134 15 145 33 24 53Z" fill={metal} stroke="#5a7388" /><path d="M23 39L138 22" stroke="#334d63" strokeWidth="6" /><path d="M60 45L95 40 118 79 82 91Z" fill={metal} stroke="#526b80" /><ellipse cx="80" cy="46" rx="13" ry="9" fill="#334b5e" stroke="#93a8b9" strokeWidth="3" /><circle cx="108" cy="81" r="13" fill="#334b5e" stroke="#93a8b9" strokeWidth="3" /></>; break;
    case "harness": drawing = <><g fill="none" strokeLinecap="round"><path d="M15 75Q43 45 80 54T143 25M78 54Q90 88 136 87M53 53L51 20M106 48L122 57" stroke="#273d50" strokeWidth="7" /><path d="M17 73Q43 43 80 52T143 23M79 54Q90 86 136 85" stroke="#9d7d46" strokeWidth="1.2" /><path d="M19 76Q43 47 80 56T143 27" stroke="#58809b" strokeWidth="1.2" /></g>{[[7,68],[43,10],[135,14],[132,79],[119,51]].map(([x,y])=><g key={x+":"+y}><path d={`M${x} ${y}h16v15h-16Z`} fill="#93a5b4" stroke="#3d576c" /><path d={`M${x+4} ${y+4}v7m4-7v7m4-7v7`} stroke="#d9b86c" /></g>)}</>; break;
    case "connector": drawing = <><path d="M27 31L94 20 129 45 120 82 53 94 21 68Z" fill="#8a9dad" stroke="#3c566c" strokeWidth="1.5" /><path d="M94 20L129 45 120 82 84 57Z" fill="#304a60" /><path d="M26 32L84 58 120 82M84 58L94 21" fill="none" stroke="#bacbd6" /><path d="M47 29L74 24 85 34 58 40Z" fill="#495f73" />{Array.from({length:6},(_,i)=><path key={i} d={`M${95+i%2*13} ${42+Math.floor(i/2)*10}l7 5-2 7-7-5Z`} fill="#c5a461" stroke="#1e374b" />)}</>; break;
    case "boot": drawing = <><path d="M25 36Q77 16 130 35L135 73Q77 91 21 76Z" fill={dark} stroke="#2f465a" /><g stroke="#7c8d9c" strokeWidth="4" fill="none">{[35,48,61,74,87,100,113].map(x=><path key={x} d={`M${x} 32q-9 23 1 46`} />)}</g><ellipse cx="24" cy="56" rx="8" ry="21" fill="#162d40" stroke="#7a8e9f" /><ellipse cx="133" cy="54" rx="8" ry="20" fill="#162d40" stroke="#7a8e9f" /></>; break;
    case "hardware": drawing = <><g fill={dark} stroke="#385167"><ellipse cx="40" cy="27" rx="15" ry="6" /><path d="M33 29L35 64 40 76 45 64 47 29Z" /><ellipse cx="40" cy="35" rx="11" ry="4" /><path d="M71 29H93V53L86 66H76L69 53Z" fill="#b5c4d0" /><path d="M77 34V53H87V34" fill="#4a647a" /><path d="M114 36L124 32 137 70 127 74Z" fill={metal} /><path d="M112 37L108 29 124 23 131 30 125 37Z" fill={metal} /><path d="M122 47L132 43M124 54L134 50M126 61L136 57" /></g><ellipse cx="78" cy="87" rx="14" ry="7" fill={metal} stroke="#425d73" /><ellipse cx="78" cy="87" rx="6" ry="3" fill="#324d63" /></>; break;
    case "weatherstrip": drawing = <><path d="M31 22L110 14 140 45 133 88 35 101 17 73Z" fill="none" stroke="#22394d" strokeWidth="11" strokeLinejoin="round" /><path d="M31 20L110 12 142 45 135 90 34 103 15 73Z" fill="none" stroke="#8094a5" strokeWidth="2" strokeLinejoin="round" /><path d="M31 27L108 20 133 47 127 83 38 95 24 72Z" fill="none" stroke="#536c81" strokeWidth="2" /></>; break;
    case "molding": drawing = <><path d="M11 61L135 26 148 35 23 74Z" fill={dark} stroke="#3e586e" /><path d="M12 58L136 24 141 29 17 65Z" fill={metal} stroke="#70889b" /><path d="M36 66V79M77 55V66M119 43V55" stroke="#728a9d" strokeWidth="5" /></>; break;
    case "cable": drawing = <><path d="M22 83Q19 26 71 30T137 76" fill="none" stroke="#304b61" strokeWidth="7" /><path d="M22 81Q19 24 71 28T137 74" fill="none" stroke="#93a8b8" strokeWidth="2" /><path d="M23 82L22 99M137 75L142 94" stroke="#b5c3cf" strokeWidth="3" /><path d="M15 70H30V84H15M130 65L144 61 149 75 135 79" fill="#1e394e" stroke="#607c92" /><circle cx="22" cy="99" r="4" fill={metal} /><circle cx="143" cy="95" r="4" fill={metal} /></>; break;
    case "barrier": drawing = <><path d="M23 18L110 12 141 44 134 95 33 104 17 77Z" fill="#b6cedb" fillOpacity=".55" stroke="#8ba6ba" strokeWidth="2" /><path d="M27 24L107 18 134 46 127 89 37 97 24 74Z" fill="none" stroke="#596f80" strokeWidth="4" strokeDasharray="9 3" /><path d="M40 34Q75 64 117 38M35 81Q72 59 118 82" fill="none" stroke="#e9f3f8" strokeWidth="2" /><circle cx="105" cy="68" r="8" fill="#e9f3f8" stroke="#7895aa" /></>; break;
    case "glass": drawing = <><path d="M25 20L107 12 143 69 20 86Z" fill={glass} stroke="#527d99" strokeWidth="1.6" /><path d="M27 22L107 14 139 68 23 82" fill="none" stroke="#d7edf7" /><path d="M48 27L32 62M65 25L49 60M119 50L106 74" stroke="#effaff" strokeWidth="3" opacity=".7" /></>; break;
    case "fender": case "liner": drawing = <><path d="M12 34L65 17 136 24 147 50 142 92 114 97Q114 55 83 58Q52 61 51 99L20 96Z" fill={kind==="liner"?dark:metal} stroke="#4c677d" strokeWidth="1.6" /><path d="M25 39L67 25 129 30M24 84L41 87M123 85L137 81" fill="none" stroke={kind==="liner"?"#7a8c9c":"#f5f8fc"} strokeWidth="2" /><path d="M48 96Q47 51 82 49Q124 48 123 94" fill="none" stroke="#7c94a8" strokeWidth="3" />{[[23,39],[64,24],[134,36],[138,85],[28,90]].map(([x,y])=>screw(x,y))}</>; break;
    case "hood": drawing = <><path d="M30 17Q80 4 130 17L148 84Q80 110 12 84Z" fill={metal} stroke="#546e83" strokeWidth="1.6" /><path d="M48 21L30 78M112 21L130 78" stroke="#829bad" strokeWidth="2.5" fill="none" /><path d="M51 22L34 77M109 22L126 77M26 84Q80 99 136 84" stroke="#f4f8fc" strokeWidth="2" fill="none" /><path d="M61 20Q80 15 99 20" stroke="#a1b5c5" fill="none" /></>; break;
    case "roof": drawing = <><path d="M30 17Q80 1 130 17L143 88Q80 111 17 88Z" fill={metal} stroke="#526e84" strokeWidth="1.6" /><path d="M37 23L28 83M122 23L133 83" stroke="#f0f7fc" strokeWidth="3" /><path d="M33 91Q80 105 126 91" fill="none" stroke="#849fb3" strokeWidth="2" /></>; break;
    case "tailgate": drawing = <><path d="M16 23L134 14 146 82 27 98Z" fill={metal} stroke="#526e83" strokeWidth="1.6" /><path d="M28 35L123 27 132 73 37 86Z" fill="#aec1cf" stroke="#e8f0f6" strokeWidth="2" /><path d="M60 34L96 31 98 42 62 46Z" fill="#304c63" /><path d="M34 58L125 47M37 70L127 59" stroke="#8ea8bb" strokeWidth="2" /><path d="M23 97V105M136 84V93" stroke="#56748b" strokeWidth="5" /></>; break;
    case "bumper": drawing = <><path d="M9 38Q78 7 151 35L141 88Q80 69 20 95Z" fill={metal} stroke="#4b657b" strokeWidth="1.6" /><path d="M44 47Q81 34 121 44L112 70Q80 58 48 74Z" fill="#233d52" /><path d="M20 48L36 45 39 73 25 80ZM132 44L143 44 137 71 125 69Z" fill="#405a70" /><path d="M23 86Q80 64 137 80" fill="none" stroke="#607b90" strokeWidth="4" /><path d="M17 36Q80 17 145 34" fill="none" stroke="#f9fcff" strokeWidth="2" /></>; break;
    case "grille": drawing = <><path d="M20 28Q80 12 141 26L127 87Q80 71 33 93Z" fill="#243b50" stroke="#7c93a6" strokeWidth="4" /><g fill="none" stroke="#698195" strokeWidth="1.3">{[37,52,67,82,97,112].map(x=><path key={x} d={`M${x} 31l20 47m-20 0l20-47`} />)}</g><ellipse cx="80" cy="51" rx="13" ry="9" fill="#93a6b6" stroke="#1c3449" /></>; break;
    case "lamp": drawing = <><path d="M13 29L111 15 147 48 129 85 23 99Z" fill="#3d566c" stroke="#263e54" strokeWidth="2" /><path d="M17 29L108 19 137 49 120 78 25 90Z" fill={glass} stroke="#b6d1e1" strokeWidth="2" /><ellipse cx="56" cy="56" rx="21" ry="23" fill="#b6d0df" stroke="#3e5e76" strokeWidth="3" /><ellipse cx="56" cy="56" rx="13" ry="15" fill="#506d83" /><ellipse cx="101" cy="49" rx="15" ry="17" fill="#d5e5ef" stroke="#506d83" /><path d="M29 80L120 68" stroke="#edf9ff" strokeWidth="4" />{plate(17,96)}{plate(118,13)}</>; break;
    case "mirror": drawing = <><path d="M22 30Q77 5 137 27L146 61 113 82 27 68Z" fill={dark} stroke="#263e54" strokeWidth="2" /><path d="M30 29Q81 12 131 31L135 56 111 72 34 60Z" fill={glass} stroke="#bacbd8" strokeWidth="2" /><path d="M47 35L37 52M62 30L50 54" stroke="#e6f7ff" strokeWidth="3" /><path d="M109 81L119 102 139 97 133 68" fill="#334e64" /></>; break;
    case "strut": drawing = <><path d="M29 91L113 23" stroke="#405a70" strokeWidth="11" /><path d="M35 85L112 23" stroke="#9eafbc" strokeWidth="4" /><path d="M39 82L71 56" stroke="#172f44" strokeWidth="15" /><circle cx="26" cy="94" r="7" fill={metal} stroke="#344d63" /><circle cx="117" cy="20" r="7" fill={metal} stroke="#344d63" /></>; break;
    case "plugs": drawing = <><ellipse cx="48" cy="33" rx="19" ry="9" fill="#4e667a" stroke="#233d52" /><path d="M32 34L37 74Q48 84 59 74L64 34" fill={dark} /><ellipse cx="48" cy="73" rx="11" ry="5" fill="#263f54" /><path d="M91 45L121 39 136 66 110 76 88 64Z" fill={dark} stroke="#233d52" /><ellipse cx="111" cy="46" rx="13" ry="7" fill="#688093" /></>; break;
    case "sensor": case "module": drawing = <><path d="M36 30L100 15 128 33 124 78 60 95 30 74Z" fill={dark} stroke="#243e54" strokeWidth="2" /><path d="M42 35L100 22 117 34 61 50Z" fill="#667e92" /><path d="M61 50V84M37 69L60 84 117 71" stroke="#7e96a9" fill="none" /><circle cx="82" cy="58" r="17" fill="#142e43" stroke="#8ba4b9" strokeWidth="3" /><circle cx="82" cy="58" r="9" fill={glass} /><path d="M122 46L144 41V63L123 70" fill="#9aaebb" stroke="#304d65" />{screw(46,39)}{screw(111,70)}</>; break;
    case "seat": drawing = <><path d="M48 15Q80 3 112 15L115 66H44Z" fill={dark} stroke="#3d576c" /><path d="M38 62H121L143 87Q80 111 19 89Z" fill="#526a7d" stroke="#263f55" /><path d="M59 24H100L104 57H54ZM43 72H115" fill="none" stroke="#9badbb" /><path d="M45 98V108M120 98V108" stroke="#8197a9" strokeWidth="5" /></>; break;
    case "wheel": drawing = <><circle cx="80" cy="53" r="46" fill="#20384c" /><circle cx="80" cy="53" r="34" fill={metal} stroke="#0f293e" strokeWidth="3" />{Array.from({length:8},(_,i)=><path key={i} d="M77 22L83 22 87 47 80 53 73 47Z" transform={`rotate(${i*45} 80 53)`} fill="#607d92" stroke="#c8d6df" />)}<circle cx="80" cy="53" r="9" fill="#a4b7c5" stroke="#314e65" /></>; break;
    case "battery": drawing = <><path d="M20 27L117 13 143 33V85L45 102 20 80Z" fill={metal} stroke="#3e5b73" /><path d="M20 27L45 47 143 33M45 47V102" fill="none" stroke="#536f86" /><path d="M59 47V96M84 44V93M110 40V89" stroke="#98adbd" /><path d="M62 16V7H76V13M105 11V4H120V9" fill="#385a73" /></>; break;
    case "bracket": drawing = <><path d="M19 32L110 18 116 46 143 42V80L45 97 40 67 25 70Z" fill={metal} stroke="#4d6a82" strokeWidth="1.6" /><path d="M29 39L103 28 107 53 133 50V72L52 86 48 57 32 60Z" fill="#7893a8" stroke="#c7d7e2" /><circle cx="62" cy="41" r="6" fill="#f4f8fc" /><circle cx="117" cy="66" r="6" fill="#f4f8fc" /></>; break;
    default: drawing = <><path d="M18 30L111 13 146 43 130 95 29 102 13 72Z" fill={metal} stroke="#526e85" strokeWidth="1.7" /><path d="M30 37L103 24 130 47 117 81 37 88Z" fill="#a1b7c8" stroke="#deebf3" strokeWidth="2" /><path d="M43 47L99 36M40 67L104 54" stroke="#718fa6" strokeWidth="4" /></>;
  }
  return <g data-artwork={kind} strokeLinejoin="round" strokeLinecap="round">
    <defs><linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f1f6fa" /><stop offset=".38" stopColor="#b4c5d2" /><stop offset=".68" stopColor="#e1eaf0" /><stop offset="1" stopColor="#839bad" /></linearGradient><linearGradient id={darkId} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#627482" /><stop offset=".5" stopColor="#324858" /><stop offset="1" stopColor="#182f40" /></linearGradient><linearGradient id={glassId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#daeef8" stopOpacity=".8" /><stop offset=".55" stopColor="#8db4ca" stopOpacity=".65" /><stop offset="1" stopColor="#537e9a" stopOpacity=".85" /></linearGradient></defs>
    <ellipse cx="80" cy="105" rx="60" ry="4" fill="#1e405a" stroke="none" opacity=".08" />{drawing}
  </g>;
}
