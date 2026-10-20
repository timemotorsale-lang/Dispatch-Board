export type RawRepairOperation = { id: string; label: string; kind: "repair" | "diagnosis"; hours: number | null; parts: number | null; keywords: string; includes: string[]; conflictGroup?: string; aliases?: string[] };
export type RawRepairGroup = { id: string; label: string; operations: RawRepairOperation[] };
export type RawRepairSystem = { id: string; label: string; groups: RawRepairGroup[] };
type RepairOperation = RawRepairOperation;
type RepairGroup = RawRepairGroup;
type RepairSystem = RawRepairSystem;

function catalogGroup(id: string, label: string, repairs: string[], diagnostics: string[], keywords = ""): RepairGroup {
  function entry(text: string, kind: RepairOperation["kind"]): RepairOperation {
    const [title, aliases = ""] = text.split("|");
    return {
      id: `${id}-${kind}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`,
      label: title,
      kind,
      hours: null,
      parts: null,
      keywords: `${keywords} ${aliases}`,
      conflictGroup: id === "engine-assembly" && ["Replace engine assembly", "Replace engine long block", "Replace engine short block", "Overhaul engine assembly"].includes(title) ? "engine-assembly-alternatives" : undefined,
      includes: kind === "diagnosis"
        ? ["Confirm the reported concern", "Record diagnostic findings and supporting evidence", "Identify the next step before recommending repairs"]
        : ["Confirm vehicle-specific scope and procedure", "Identify required parts, fluids and supporting operations", "Document the completed work and verification"]
    };
  }
  return { id, label, operations: [...repairs.map((text) => entry(text, "repair")), ...diagnostics.map((text) => entry(text, "diagnosis"))] };
}

export const BASE_REPAIR_SYSTEMS: RepairSystem[] = [
  { id: "maintenance", label: "Maintenance", groups: [
    catalogGroup("maintenance-sample", "Oil & filters", [
      "Replace engine air filter", "Replace cabin air filter", "Replace fuel filter", "Replace diesel fuel-water separator", "Service oil filter housing", "Replace crankcase ventilation filter"
    ], ["Inspect filter condition", "Diagnose oil-service reminder concern"], "scheduled service lubrication"),
    catalogGroup("maintenance-fluids", "Fluids & scheduled service", [
      "Perform scheduled mileage service", "Exchange engine coolant", "Service power steering fluid", "Service differential oil", "Service transfer-case fluid", "Service manual transmission oil", "Service hydraulic reservoir fluid", "Reset maintenance reminder"
    ], ["Inspect fluid condition and levels", "Identify overdue maintenance"], "interval fleet preventive maintenance PM"),
    catalogGroup("maintenance-inspections", "Inspections & road tests", [
      "Perform multipoint inspection", "Perform pre-purchase inspection", "Perform fleet preventive-maintenance inspection", "Perform vehicle condition inspection", "Perform post-repair road test", "Perform seasonal readiness service"
    ], ["Assess safety concerns", "Inspect vehicle after storage", "Inspect reported fluid leak"], "inspection road test seasonal winter summer"),
    catalogGroup("maintenance-belts", "Belts, hoses & tune-up", [
      "Replace accessory drive belt", "Replace belt tensioner", "Replace idler pulley", "Replace accessible coolant hose", "Service ignition tune-up", "Clean throttle body", "Service diesel water separator"
    ], ["Inspect belts and pulleys", "Inspect coolant hoses", "Diagnose accessory belt noise"], "serpentine belt tune up service")
  ] },
  { id: "engine", label: "Engine", groups: [
    catalogGroup("engine-assembly", "Engine assembly & mounts", [
      "Replace engine assembly|complete engine motor swap remanufactured used replacement", "Replace engine long block|longblock reman rebuilt motor", "Replace engine short block|shortblock bottom end", "Remove and reinstall engine assembly|R and R access", "Overhaul engine assembly|rebuild recondition", "Replace engine mount", "Replace engine torque strut", "Replace engine support bracket", "Service engine subframe mounting"
    ], ["Assess engine replacement versus repair", "Diagnose engine mount vibration", "Diagnose internal engine knock"], "engine assembly replacement motor mount"),
    catalogGroup("engine-head", "Cylinder heads & valvetrain", [
      "Replace cylinder head assembly", "Replace cylinder head gasket", "Service cylinder head valves and seats", "Replace camshaft", "Replace rocker arm or follower", "Replace valve lifter", "Replace valve spring", "Replace valve stem seals", "Replace valve cover gasket", "Replace camshaft carrier seal"
    ], ["Perform compression test", "Perform cylinder leak-down test", "Diagnose valvetrain noise", "Diagnose combustion gas in coolant"], "top end head gasket valve train low compression"),
    catalogGroup("engine-bottom", "Block, pistons & crankshaft", [
      "Replace crankshaft", "Replace connecting rod", "Replace piston and rings", "Replace main bearings", "Replace connecting-rod bearings", "Replace engine block", "Replace rear main seal", "Replace front crankshaft seal", "Replace core plug", "Replace harmonic balancer"
    ], ["Diagnose piston or bearing noise", "Diagnose crankcase blow-by", "Inspect cylinder bore condition"], "bottom end rebuild short block oil consumption knock"),
    catalogGroup("engine-timing", "Timing & variable valve timing", [
      "Replace timing chain set", "Replace timing belt set", "Replace timing chain tensioner", "Replace timing chain guide", "Replace camshaft phaser", "Replace variable valve timing solenoid", "Replace timing cover gasket", "Set engine mechanical timing", "Replace balance-shaft drive"
    ], ["Diagnose timing correlation fault", "Diagnose timing chain rattle", "Diagnose variable valve timing concern"], "VVT VCT P0016 P0017 cam crank correlation"),
    catalogGroup("engine-lubrication", "Lubrication & oil leaks", [
      "Replace oil pump", "Replace oil pickup tube and seal", "Replace oil pan", "Replace oil pan gasket", "Replace oil cooler", "Replace oil pressure sensor", "Replace oil filter adapter gasket", "Repair oil supply or return line", "Replace oil dipstick tube"
    ], ["Test engine oil pressure", "Trace engine oil leak", "Diagnose excessive oil consumption", "Inspect oil contamination"], "low oil pressure lubrication leak oil burning"),
    catalogGroup("engine-cooling", "Cooling system", [
      "Replace radiator", "Replace water pump", "Replace thermostat and housing", "Replace radiator cooling fan", "Replace cooling fan control module", "Replace fan clutch", "Replace coolant expansion tank", "Replace coolant temperature sensor", "Replace coolant crossover pipe", "Replace upper radiator hose", "Replace lower radiator hose", "Replace heater coolant pipe"
    ], ["Diagnose engine overheating", "Pressure-test cooling system", "Diagnose coolant loss", "Diagnose engine running too cold"], "coolant overheat antifreeze cooling P0128"),
    catalogGroup("engine-air", "Air intake & throttle", [
      "Replace intake manifold", "Replace intake manifold gasket", "Replace throttle body", "Replace intake air duct", "Replace mass airflow sensor", "Replace manifold pressure sensor", "Replace intake runner actuator", "Replace air cleaner housing"
    ], ["Smoke-test intake air leak", "Diagnose throttle response concern", "Diagnose airflow or manifold pressure fault"], "vacuum leak MAF MAP throttle intake runner"),
    catalogGroup("engine-fuel", "Fuel delivery & injection", [
      "Replace in-tank fuel pump", "Replace high-pressure fuel pump", "Replace fuel injector", "Replace fuel rail", "Replace fuel pressure regulator", "Replace fuel pressure sensor", "Repair fuel supply line", "Replace fuel tank", "Replace fuel tank sending unit", "Service fuel injector seals"
    ], ["Test low-pressure fuel delivery", "Test high-pressure fuel delivery", "Perform injector balance test", "Diagnose fuel leak", "Diagnose contaminated fuel"], "fuel injection GDI port injector gasoline diesel pressure"),
    catalogGroup("engine-sample", "Ignition & running concerns", [
      "Replace ignition coil", "Replace ignition wires", "Replace ignition control module", "Replace distributor assembly", "Replace distributor cap and rotor", "Replace crankshaft position sensor", "Replace camshaft position sensor", "Replace knock sensor"
    ], ["Diagnose rough idle", "Diagnose engine stall", "Diagnose hard starting", "Diagnose loss of engine power", "Diagnose spark or ignition fault"], "misfire ignition P0300 P0301 running tune up"),
    catalogGroup("engine-boost", "Turbocharger & supercharger", [
      "Replace turbocharger assembly", "Replace supercharger assembly", "Replace charge-air cooler", "Replace boost pressure sensor", "Replace turbo wastegate actuator", "Replace turbo oil feed line", "Replace turbo oil return line", "Replace charge-air hose", "Replace bypass or diverter valve"
    ], ["Diagnose low boost", "Pressure-test charge-air system", "Diagnose turbocharger noise or smoke", "Diagnose overboost"], "turbo intercooler boost P0299 forced induction"),
    catalogGroup("engine-diesel", "Diesel injection & cold starting", [
      "Replace diesel glow plug", "Replace glow plug control module", "Replace diesel injection pump", "Replace diesel injector return line", "Service diesel injector coding", "Replace diesel intake heater", "Replace engine-driven vacuum pump"
    ], ["Diagnose diesel cold-start concern", "Perform diesel injector return-flow test", "Diagnose excessive diesel smoke", "Diagnose diesel fuel air intrusion"], "diesel common rail glow plug injection cold start"),
    catalogGroup("engine-controls", "Engine controls & wiring", [
      "Replace engine control module", "Repair engine wiring harness", "Repair sensor connector", "Perform engine control software update", "Perform crankshaft variation relearn", "Repair engine ground connection"
    ], ["Diagnose engine control power or ground", "Diagnose sensor reference voltage", "Diagnose intermittent engine fault", "Diagnose engine network communication"], "ECM PCM ECU wiring CAN reference voltage"),
    catalogGroup("engine-ventilation", "Crankcase ventilation & vacuum", [
      "Replace PCV valve", "Replace crankcase oil separator", "Replace crankcase vent hose", "Replace vacuum hose", "Replace vacuum reservoir", "Replace vacuum check valve"
    ], ["Test crankcase ventilation", "Diagnose abnormal crankcase pressure", "Diagnose engine vacuum leak"], "PCV breather oil separator vacuum ventilation")
  ] },
  { id: "transmission", label: "Transmission & driveline", groups: [
    catalogGroup("transmission-sample", "Automatic transmission", [
      "Replace automatic transmission assembly", "Overhaul automatic transmission", "Replace transmission valve body", "Replace shift solenoid", "Replace transmission filter and pan gasket", "Replace transmission oil cooler", "Replace transmission cooler line", "Replace transmission mount", "Replace torque converter"
    ], ["Diagnose transmission fluid leak", "Diagnose delayed engagement", "Diagnose torque-converter shudder"], "automatic gearbox transmission fluid ATF slipping shift P0700"),
    catalogGroup("transmission-cvt", "CVT & dual-clutch transmission", [
      "Replace CVT assembly", "Replace CVT valve body", "Service CVT fluid", "Replace dual-clutch transmission assembly", "Replace dual-clutch pack", "Replace transmission mechatronic unit", "Perform clutch adaptation"
    ], ["Diagnose CVT judder", "Diagnose dual-clutch engagement concern", "Diagnose transmission overheating"], "CVT DCT DSG mechatronic variator clutch"),
    catalogGroup("transmission-manual", "Manual gearbox & clutch", [
      "Replace manual transmission assembly", "Overhaul manual gearbox", "Replace clutch kit", "Replace flywheel", "Replace clutch release bearing", "Replace clutch master cylinder", "Replace clutch slave cylinder", "Replace clutch hydraulic line", "Replace pilot bearing", "Replace shift cable"
    ], ["Diagnose clutch slip", "Diagnose clutch release concern", "Diagnose gear clash or gearbox noise"], "manual clutch pedal synchronizer dual mass flywheel"),
    catalogGroup("transmission-transfer", "Transfer case & four-wheel drive", [
      "Replace transfer case assembly", "Overhaul transfer case", "Replace transfer-case shift motor", "Replace transfer-case output seal", "Replace four-wheel-drive control module", "Replace axle disconnect actuator", "Replace locking hub"
    ], ["Diagnose four-wheel-drive engagement", "Diagnose transfer-case noise", "Diagnose all-wheel-drive warning"], "4WD AWD 4x4 transfer case PTU power transfer"),
    catalogGroup("transmission-differential", "Differentials & axle assemblies", [
      "Replace front differential assembly", "Replace rear differential assembly", "Overhaul differential", "Replace ring and pinion set", "Replace differential bearing", "Replace pinion seal", "Replace axle shaft seal", "Replace limited-slip clutch pack", "Replace complete axle housing"
    ], ["Diagnose differential whine", "Diagnose driveline backlash", "Diagnose axle fluid leak"], "differential final drive rear end axle carrier gear"),
    catalogGroup("transmission-shafts", "Drive shafts, CV joints & U-joints", [
      "Replace front left CV axle", "Replace front right CV axle", "Replace rear left CV axle", "Replace rear right CV axle", "Replace CV joint boot", "Replace propeller shaft", "Replace universal joint", "Replace driveshaft center support bearing", "Balance driveshaft"
    ], ["Diagnose CV joint clicking", "Diagnose driveshaft vibration", "Diagnose driveline clunk"], "CV halfshaft prop shaft U joint driveshaft vibration"),
    catalogGroup("transmission-controls", "Shift controls & sensors", [
      "Replace transmission control module", "Replace transmission range sensor", "Replace input speed sensor", "Replace output speed sensor", "Replace gear selector", "Replace shift interlock solenoid", "Repair transmission wiring", "Perform transmission adaptation relearn"
    ], ["Diagnose gear-selector concern", "Diagnose transmission communication fault", "Diagnose incorrect range indication"], "TCM shift shifter selector speed sensor PRNDL"),
    catalogGroup("transmission-commercial", "Commercial PTO & driveline", [
      "Replace power take-off assembly", "Replace PTO engagement solenoid", "Repair PTO hydraulic connection", "Replace driveline yoke", "Service commercial axle breather"
    ], ["Diagnose PTO engagement concern", "Diagnose commercial driveline vibration"], "commercial truck PTO power take off driveline")
  ] },
  { id: "brakes", label: "Brakes", groups: [
    catalogGroup("friction", "Pads, rotors & calipers", [], [], "disc brake"),
    catalogGroup("brakes-drum", "Drums, shoes & wheel cylinders", [
      "Replace rear brake shoes", "Replace rear brake drums", "Replace wheel cylinder", "Replace drum brake hardware", "Service brake shoe adjuster", "Replace backing plate"
    ], ["Diagnose drum brake noise", "Diagnose uneven drum brake application"], "drum shoe wheel cylinder backing plate"),
    catalogGroup("abs", "ABS & stability", [
      "Replace ABS hydraulic control unit", "Replace ABS control module", "Replace steering angle sensor", "Replace yaw rate sensor", "Replace brake pressure sensor", "Repair ABS wiring", "Perform ABS service bleed", "Calibrate steering angle sensor"
    ], ["Diagnose unwanted ABS activation", "Diagnose stability control warning", "Diagnose wheel speed signal"], "ABS ESC traction stability wheel speed sensor"),
    catalogGroup("hydraulics", "Hydraulics & power assist", [
      "Replace brake master cylinder", "Replace brake booster", "Replace brake vacuum pump", "Replace brake flexible hose", "Fabricate and replace brake line", "Replace brake fluid reservoir", "Replace hydroboost unit", "Replace brake proportioning valve"
    ], ["Diagnose hard brake pedal", "Diagnose brake hydraulic leak", "Test brake booster vacuum supply"], "hydraulic hose pipe master cylinder booster pedal"),
    catalogGroup("parking", "Parking brake", [
      "Replace parking brake cable", "Replace parking brake shoes", "Replace parking brake pedal assembly", "Replace parking brake switch", "Adjust parking brake", "Perform electronic parking brake service mode"
    ], ["Diagnose electronic parking brake fault", "Diagnose parking brake holding concern"], "parking EPB cable handbrake actuator"),
    catalogGroup("brakes-air", "Commercial air brakes", [
      "Replace air brake chamber", "Replace slack adjuster", "Replace air brake compressor", "Replace air dryer", "Replace air brake valve", "Replace brake air line", "Replace air reservoir", "Service air disc brake hardware"
    ], ["Diagnose air brake leak", "Diagnose slow air-pressure buildup", "Diagnose low-air warning", "Inspect air brake adjustment"], "commercial truck air brake pneumatic service spring brake"),
    catalogGroup("brakes-trailer", "Trailer brakes & controls", [
      "Replace trailer brake controller", "Replace electric trailer brake assembly", "Replace trailer breakaway switch", "Repair trailer brake wiring", "Service surge brake actuator"
    ], ["Diagnose trailer brake output", "Diagnose trailer brake drag"], "trailer towing electric surge brake breakaway")
  ] },
  { id: "steering", label: "Steering & suspension", groups: [
    catalogGroup("steering-sample", "Control arms & joints", [
      "Replace upper control arm", "Replace left lower ball joint", "Replace right lower ball joint", "Replace control arm bushing", "Replace steering knuckle", "Replace suspension subframe"
    ], ["Inspect suspension joint play", "Diagnose abnormal suspension geometry"], "control arm ball joint bushing knuckle"),
    catalogGroup("steering-rack", "Steering gear & linkage", [
      "Replace steering rack assembly", "Replace steering gearbox", "Replace inner tie rod", "Replace outer tie rod end", "Replace steering rack boot", "Replace pitman arm", "Replace idler arm", "Replace drag link", "Replace intermediate steering shaft"
    ], ["Diagnose steering free play", "Diagnose binding steering", "Diagnose steering pull"], "rack pinion gear steering linkage tie rod"),
    catalogGroup("steering-assist", "Power steering & electronic assist", [
      "Replace power steering pump", "Replace power steering pressure hose", "Replace power steering return hose", "Replace power steering reservoir", "Replace electric steering motor", "Replace electric steering control module", "Perform steering assist calibration"
    ], ["Diagnose loss of steering assist", "Trace power steering leak", "Diagnose electric steering warning"], "EPS EPAS hydraulic steering assist pump"),
    catalogGroup("steering-struts", "Shocks, struts & springs", [
      "Replace front left strut assembly", "Replace front right strut assembly", "Replace rear left shock absorber", "Replace rear right shock absorber", "Replace strut mount", "Replace coil spring", "Replace leaf spring", "Replace spring shackle", "Replace spring hanger", "Replace bump stop"
    ], ["Diagnose excessive bounce", "Diagnose suspension sag", "Diagnose strut mount noise"], "shock strut damper spring suspension ride height"),
    catalogGroup("steering-stabilizer", "Stabilizer bars & bushings", [
      "Replace front stabilizer link", "Replace rear stabilizer link", "Replace stabilizer bar bushing", "Replace stabilizer bar", "Replace suspension trailing arm", "Replace rear toe link", "Replace track bar"
    ], ["Diagnose stabilizer link noise", "Diagnose excessive body roll"], "sway anti roll bar link bushing track panhard"),
    catalogGroup("steering-air", "Air suspension & adaptive damping", [
      "Replace air spring", "Replace air suspension compressor", "Replace air suspension valve block", "Replace ride height sensor", "Replace adaptive damper", "Repair suspension air line", "Calibrate suspension ride height"
    ], ["Diagnose air suspension leak", "Diagnose suspension compressor concern", "Diagnose adaptive damping warning"], "air ride electronic suspension leveling active damper"),
    catalogGroup("steering-column", "Steering column & wheel", [
      "Replace steering column", "Replace steering column bearing", "Replace steering wheel", "Replace tilt or telescope actuator", "Replace steering column lock"
    ], ["Diagnose steering column noise", "Diagnose steering wheel adjustment concern"], "column wheel tilt telescope lock")
  ] },
  { id: "tires", label: "Tires & wheels", groups: [
    catalogGroup("tires-sample", "Tires & alignment", [
      "Mount and balance tire", "Repair repairable tire puncture", "Rotate tires", "Perform front-wheel alignment", "Adjust wheel alignment angles", "Replace tire valve stem", "Inspect tire damage and wear"
    ], ["Diagnose uneven tire wear", "Diagnose slow tire pressure loss"], "tire alignment balance puncture flat tracking"),
    catalogGroup("tires-hubs", "Wheel bearings & hubs", [
      "Replace front left wheel hub", "Replace front right wheel hub", "Replace rear left wheel hub", "Replace rear right wheel hub", "Replace press-fit wheel bearing", "Service tapered wheel bearings", "Replace hub seal", "Replace wheel stud"
    ], ["Diagnose wheel bearing noise", "Inspect wheel bearing play", "Diagnose wheel hub overheating"], "hub bearing growl humming wheel stud lug"),
    catalogGroup("tires-tpms", "Tire pressure monitoring", [
      "Replace tire pressure sensor", "Service TPMS valve seal", "Perform TPMS relearn", "Replace TPMS receiver", "Program replacement TPMS sensor"
    ], ["Diagnose TPMS warning", "Diagnose missing tire pressure reading"], "TPMS low tire pressure sensor relearn"),
    catalogGroup("tires-rims", "Wheels, rims & hardware", [
      "Replace wheel rim", "Replace wheel lug nut", "Inspect wheel runout", "Clean wheel mounting surface", "Replace wheel center cap"
    ], ["Diagnose wheel runout vibration", "Inspect damaged wheel mounting hardware"], "rim wheel lug mounting vibration"),
    catalogGroup("tires-commercial", "Commercial & dual wheels", [
      "Service dual-wheel tire assembly", "Replace dual-wheel valve extension", "Service commercial wheel seal", "Service spare tire carrier", "Inspect commercial tire casing"
    ], ["Diagnose dual-wheel pressure loss", "Inspect commercial tire wear pattern"], "commercial dual wheel dually truck tire spare")
  ] },
  { id: "electrical", label: "Electrical & starting", groups: [
    catalogGroup("electrical-sample", "Battery, starting & charging", [
      "Replace starter motor", "Replace alternator", "Replace battery cable", "Replace battery current sensor", "Replace starter relay", "Register replacement battery", "Replace alternator overrunning pulley"
    ], ["Test battery condition", "Diagnose charging output", "Diagnose slow cranking", "Diagnose parasitic battery drain"], "12V battery starter alternator crank charging dead battery"),
    catalogGroup("electrical-distribution", "Power distribution & grounds", [
      "Replace fuse box", "Replace power distribution module", "Replace electrical relay", "Replace fusible link", "Repair ground strap", "Repair damaged wiring harness", "Repair electrical connector", "Replace auxiliary battery isolator"
    ], ["Perform circuit voltage-drop test", "Diagnose short to ground", "Diagnose open circuit", "Diagnose intermittent power loss"], "fuse relay wiring power ground voltage circuit"),
    catalogGroup("electrical-network", "Modules, networks & programming", [
      "Replace body control module", "Replace gateway module", "Perform control module programming", "Perform module configuration", "Repair CAN network wiring", "Repair LIN network wiring", "Replace data link connector"
    ], ["Diagnose module communication fault", "Diagnose vehicle network fault", "Perform vehicle-wide diagnostic scan"], "CAN LIN ethernet gateway BCM module U codes communication"),
    catalogGroup("electrical-lighting", "Exterior & interior lighting", [
      "Replace headlamp assembly", "Replace headlamp bulb", "Replace LED lighting module", "Replace tail lamp assembly", "Replace brake light switch", "Replace turn signal switch", "Replace fog lamp", "Replace interior lamp", "Aim headlamps"
    ], ["Diagnose inoperative exterior light", "Diagnose lighting flicker", "Diagnose automatic lighting concern"], "headlight headlamp tail brake turn signal bulb LED light"),
    catalogGroup("electrical-security", "Keys, immobilizer & access", [
      "Program replacement key", "Replace key fob battery", "Replace ignition switch", "Replace immobilizer antenna", "Replace keyless entry receiver", "Replace remote start module"
    ], ["Diagnose immobilizer no-start", "Diagnose keyless entry concern", "Diagnose theft alarm concern"], "key fob immobilizer security remote start alarm"),
    catalogGroup("electrical-instruments", "Instruments, horn & accessories", [
      "Replace instrument cluster", "Replace horn", "Replace horn relay", "Replace accessory power socket", "Replace USB charging module", "Replace dashboard switch", "Replace multifunction stalk"
    ], ["Diagnose instrument display concern", "Diagnose inoperative horn", "Diagnose accessory power outlet"], "cluster gauge horn accessory socket USB instrument"),
    catalogGroup("electrical-trailer", "Trailer & commercial electrical", [
      "Replace trailer socket", "Repair trailer lighting harness", "Replace auxiliary power relay", "Service upfitter wiring connection", "Replace liftgate electrical switch"
    ], ["Diagnose trailer lighting concern", "Diagnose auxiliary equipment electrical fault"], "trailer tow upfitter commercial auxiliary liftgate")
  ] },
  { id: "hvac", label: "Heating & A/C", groups: [
    catalogGroup("hvac-sample", "Airflow & blower", [
      "Replace blower motor resistor", "Replace blower control module", "Replace HVAC air filter housing", "Repair HVAC duct", "Replace cabin air inlet actuator"
    ], ["Diagnose inoperative blower", "Diagnose low cabin airflow", "Diagnose HVAC fan noise"], "blower heater fan airflow ventilation"),
    catalogGroup("hvac-refrigerant", "Compressor & refrigerant circuit", [
      "Replace A/C compressor", "Replace A/C condenser", "Replace A/C evaporator", "Replace expansion valve", "Replace orifice tube", "Replace receiver-drier", "Replace A/C accumulator", "Replace refrigerant hose", "Recover, evacuate and recharge A/C", "Replace refrigerant pressure sensor"
    ], ["Test refrigerant circuit for leaks", "Diagnose A/C compressor operation", "Diagnose abnormal refrigerant pressure"], "AC air conditioning refrigerant freon compressor leak cooling"),
    catalogGroup("hvac-heat", "Heater core & coolant controls", [
      "Replace heater core", "Replace heater control valve", "Replace auxiliary heater pump", "Replace heater hose", "Flush heater core", "Replace auxiliary cabin heater"
    ], ["Diagnose insufficient cabin heat", "Diagnose heater coolant leak", "Diagnose auxiliary heater concern"], "heater heat coolant core cold cabin"),
    catalogGroup("hvac-controls", "Temperature, doors & controls", [
      "Replace blend door actuator", "Replace mode door actuator", "Replace recirculation door actuator", "Replace HVAC control head", "Replace cabin temperature sensor", "Replace ambient temperature sensor", "Replace sunload sensor", "Perform HVAC actuator calibration"
    ], ["Diagnose incorrect vent temperature", "Diagnose uneven zone temperature", "Diagnose HVAC door clicking", "Diagnose climate control communication"], "blend mode recirculation climate temperature dual zone actuator"),
    catalogGroup("hvac-drains", "Drains, odor & rear HVAC", [
      "Clear evaporator drain", "Service HVAC odor concern", "Replace rear blower motor", "Replace rear heater core", "Repair rear A/C line", "Replace rear expansion valve"
    ], ["Diagnose water from HVAC case", "Diagnose rear HVAC performance", "Diagnose cabin odor source"], "rear HVAC drain condensate odor water cabin")
  ] },
  { id: "exhaust", label: "Exhaust & emissions", groups: [
    catalogGroup("exhaust-sample", "Sensors & emissions controls", [
      "Replace air-fuel ratio sensor", "Replace exhaust temperature sensor", "Replace exhaust pressure sensor", "Replace emissions control relay", "Repair emissions sensor wiring"
    ], ["Diagnose oxygen sensor circuit", "Diagnose fuel trim concern", "Diagnose emissions readiness concern"], "O2 oxygen A/F emissions fuel trim P0171 P0420"),
    catalogGroup("exhaust-hardware", "Manifolds, pipes & mufflers", [
      "Replace exhaust manifold", "Replace exhaust manifold gasket", "Repair broken exhaust manifold fastener", "Replace exhaust flex pipe", "Replace exhaust pipe", "Replace muffler", "Replace resonator", "Replace exhaust hanger", "Replace exhaust heat shield"
    ], ["Diagnose exhaust leak", "Diagnose exhaust rattle", "Diagnose restricted exhaust"], "exhaust manifold pipe muffler noise leak vibration"),
    catalogGroup("exhaust-catalyst", "Catalytic converters", [
      "Replace catalytic converter", "Replace close-coupled catalyst", "Repair catalyst mounting hardware", "Replace catalyst heat shield"
    ], ["Test catalyst efficiency", "Diagnose catalyst overheating", "Diagnose catalyst restriction"], "catalytic converter catalyst P0420 P0430"),
    catalogGroup("exhaust-evap", "Evaporative emissions", [
      "Replace EVAP purge valve", "Replace EVAP vent valve", "Replace charcoal canister", "Replace fuel tank pressure sensor", "Replace fuel filler neck", "Replace fuel cap", "Repair vapor line", "Replace leak detection pump"
    ], ["Smoke-test EVAP system", "Diagnose fuel filling concern", "Diagnose fuel vapor leak"], "EVAP vapor leak P0442 P0455 gas cap purge vent"),
    catalogGroup("exhaust-egr", "EGR & secondary air", [
      "Replace EGR valve", "Replace EGR cooler", "Replace EGR pressure sensor", "Clean EGR passage", "Replace secondary air pump", "Replace secondary air valve", "Replace secondary air hose"
    ], ["Diagnose EGR flow concern", "Diagnose secondary air injection", "Pressure-test EGR cooler"], "EGR exhaust gas recirculation secondary air P0401"),
    catalogGroup("exhaust-diesel", "Diesel DPF, SCR & DEF", [
      "Replace diesel particulate filter", "Service DPF cleaning", "Perform commanded DPF regeneration", "Replace diesel oxidation catalyst", "Replace SCR catalyst", "Replace DEF injector", "Replace DEF pump", "Replace DEF tank heater", "Replace NOx sensor", "Replace DPF differential pressure sensor", "Repair DEF supply line"
    ], ["Diagnose DPF soot loading", "Diagnose failed regeneration", "Diagnose SCR efficiency", "Diagnose DEF dosing or quality", "Diagnose diesel exhaust temperature fault"], "diesel DPF SCR DEF AdBlue NOx aftertreatment regen")
  ] },
  { id: "safety", label: "ADAS & safety", groups: [
    catalogGroup("safety-sample", "Cameras & driver assistance", [
      "Replace forward camera", "Replace forward radar sensor", "Replace blind-spot radar sensor", "Replace parking sensor", "Replace surround-view camera", "Calibrate radar sensor", "Calibrate surround-view cameras"
    ], ["Diagnose lane assistance concern", "Diagnose adaptive cruise concern", "Diagnose parking assistance concern"], "ADAS lane camera radar collision parking cruise"),
    catalogGroup("safety-srs", "Airbags & restraint controls", [
      "Replace driver airbag module", "Replace passenger airbag module", "Replace side airbag module", "Replace curtain airbag module", "Replace restraint control module", "Replace impact sensor", "Replace steering wheel clock spring", "Repair restraint system connector"
    ], ["Diagnose airbag warning light", "Diagnose restraint communication fault", "Inspect post-collision restraint requirements"], "SRS airbag restraint crash impact clockspring"),
    catalogGroup("safety-belts", "Seat belts & occupant sensing", [
      "Replace seat belt retractor", "Replace seat belt buckle", "Replace seat belt pretensioner", "Replace occupant classification sensor", "Perform occupant classification calibration", "Replace seat position sensor"
    ], ["Diagnose seat belt warning", "Diagnose occupant detection concern", "Inspect seat belt operation"], "seatbelt belt restraint passenger occupancy pretensioner"),
    catalogGroup("safety-braking", "Collision avoidance & calibration", [
      "Perform post-alignment ADAS calibration", "Perform post-windshield camera calibration", "Replace collision warning control module", "Repair ADAS sensor mounting bracket", "Perform post-repair safety system scan"
    ], ["Diagnose false collision warning", "Diagnose emergency braking concern", "Verify ADAS calibration prerequisites"], "ADAS AEB collision emergency braking calibration scan")
  ] },
  { id: "body", label: "Body & interior", groups: [
    catalogGroup("body-sample", "Doors, locks & windows", [
      "Replace window motor", "Replace door latch", "Replace door lock actuator", "Replace exterior door handle", "Replace interior door handle", "Replace door hinge", "Replace door weatherstrip", "Adjust door alignment", "Replace window switch"
    ], ["Diagnose door lock concern", "Diagnose door closing concern", "Diagnose window wind noise"], "door window regulator glass latch lock handle"),
    catalogGroup("body-glass", "Glass, mirrors & visibility", [
      "Replace windshield", "Replace door glass", "Replace rear window glass", "Replace outside mirror assembly", "Replace mirror glass", "Replace mirror adjustment motor", "Replace rear window defroster connector"
    ], ["Diagnose mirror adjustment concern", "Diagnose rear defroster concern", "Inspect windshield water leak"], "glass windshield mirror heated defrost visibility"),
    catalogGroup("body-wipers", "Wipers & washers", [
      "Replace front wiper motor", "Replace rear wiper motor", "Replace wiper linkage", "Replace wiper arm", "Replace wiper blade", "Replace washer pump", "Replace washer reservoir", "Replace washer nozzle", "Repair washer hose"
    ], ["Diagnose wiper concern", "Diagnose washer flow concern", "Diagnose rain-sensing wipers"], "wiper washer windshield rain sensor fluid nozzle"),
    catalogGroup("body-seats", "Seats & comfort features", [
      "Replace seat adjustment motor", "Replace seat track", "Replace seat heater element", "Replace seat ventilation blower", "Replace lumbar support actuator", "Replace seat switch", "Repair seat trim", "Replace seat control module"
    ], ["Diagnose power seat concern", "Diagnose seat heating concern", "Diagnose seat ventilation concern"], "seat comfort lumbar heated cooled power memory"),
    catalogGroup("body-roof", "Sunroof, roof & convertible top", [
      "Replace sunroof motor", "Replace sunroof glass", "Service sunroof drain", "Replace sunroof seal", "Replace convertible top motor", "Replace convertible top hydraulic cylinder", "Adjust convertible top mechanism"
    ], ["Diagnose sunroof operation", "Diagnose roof water leak", "Diagnose convertible top concern"], "sunroof moonroof roof convertible water drain"),
    catalogGroup("body-closures", "Hood, trunk & liftgate", [
      "Replace hood latch", "Replace hood release cable", "Replace hood support strut", "Replace trunk latch", "Replace liftgate latch", "Replace power liftgate actuator", "Replace tailgate handle", "Adjust tailgate alignment"
    ], ["Diagnose power liftgate concern", "Diagnose hood release concern", "Diagnose trunk release concern"], "hood bonnet trunk boot hatch liftgate tailgate"),
    catalogGroup("body-infotainment", "Audio, displays & connectivity", [
      "Replace audio head unit", "Replace audio amplifier", "Replace speaker", "Replace infotainment display", "Replace GPS antenna", "Replace microphone", "Replace telematics module", "Perform infotainment software update"
    ], ["Diagnose no audio", "Diagnose Bluetooth connection concern", "Diagnose navigation or display concern", "Diagnose telematics communication"], "radio infotainment audio speaker navigation Bluetooth screen"),
    catalogGroup("body-trim", "Trim, panels & weather sealing", [
      "Replace interior trim panel", "Replace exterior trim molding", "Replace bumper cover", "Replace fender liner", "Replace engine splash shield", "Replace grille", "Replace underbody shield", "Repair water leak sealing", "Replace carpet", "Replace headliner"
    ], ["Diagnose interior rattle", "Diagnose wind noise", "Trace cabin water intrusion"], "body trim panel bumper seal weatherstrip rattle water"),
    catalogGroup("body-commercial", "Commercial body & cargo equipment", [
      "Service cargo door latch", "Replace cargo door roller", "Replace cargo door seal", "Service power liftgate mechanism", "Replace cargo tie-down", "Repair step mounting", "Replace truck bed mounting hardware"
    ], ["Diagnose cargo door operation", "Diagnose liftgate hydraulic concern", "Inspect cargo equipment attachment"], "commercial van box truck cargo liftgate step bed")
  ] },
  { id: "ev", label: "Hybrid & EV", groups: [
    catalogGroup("ev-battery", "High-voltage battery & controls", [
      "Replace high-voltage battery assembly", "Replace battery management controller", "Replace service disconnect", "Replace high-voltage contactor assembly", "Replace battery junction box", "Replace battery current sensor", "Replace high-voltage battery harness", "Service battery enclosure seals"
    ], ["Diagnose high-voltage isolation fault", "Assess traction battery health", "Diagnose battery contactor concern", "Diagnose high-voltage interlock fault"], "EV hybrid traction battery pack HV BMS contactor HVIL isolation"),
    catalogGroup("ev-drive", "Electric motors & drive units", [
      "Replace front electric drive unit", "Replace rear electric drive unit", "Replace traction motor", "Replace drive inverter", "Replace motor resolver", "Service electric drive-unit fluid", "Replace drive-unit output seal"
    ], ["Diagnose electric drive noise", "Diagnose inverter fault", "Diagnose reduced propulsion power"], "EV hybrid traction motor drive inverter resolver electric propulsion"),
    catalogGroup("ev-charge-hardware", "Charging hardware & conversion", [
      "Replace charge port assembly", "Replace charge port locking actuator", "Replace onboard charger", "Replace DC-to-DC converter", "Replace charging control module", "Replace high-voltage charge cable", "Replace charge port door actuator"
    ], ["Diagnose AC charging failure", "Diagnose DC fast-charging concern", "Diagnose charge port lock concern", "Diagnose low-voltage conversion output"], "EV hybrid AC DC fast charging port onboard charger DC DC converter"),
    catalogGroup("ev-sample", "Charging & thermal management", [
      "Replace battery coolant pump", "Replace battery chiller", "Replace electric coolant heater", "Replace coolant control valve", "Replace high-voltage A/C compressor", "Replace battery coolant temperature sensor", "Replace heat pump valve assembly", "Service battery thermal circuit"
    ], ["Diagnose battery overheating", "Diagnose battery coolant leak", "Diagnose electric cabin heating", "Diagnose heat pump performance"], "EV hybrid thermal battery coolant heat pump heater chiller"),
    catalogGroup("ev-hybrid", "Hybrid-specific systems", [
      "Replace hybrid transaxle", "Replace hybrid generator", "Replace hybrid battery cooling fan", "Replace hybrid battery air duct", "Replace hybrid power control module", "Replace hybrid inverter coolant pump"
    ], ["Diagnose hybrid system warning", "Diagnose hybrid start-stop concern", "Diagnose hybrid battery cooling concern", "Diagnose regenerative braking coordination"], "hybrid HEV PHEV start stop regenerative generator transaxle"),
    catalogGroup("ev-service", "High-voltage service & verification", [
      "Perform vehicle-specific high-voltage disablement", "Perform high-voltage recommissioning", "Perform battery replacement configuration", "Perform post-repair charging verification", "Inspect high-voltage cable routing"
    ], ["Verify high-voltage service prerequisites", "Diagnose charging communication fault", "Inspect high-voltage connector condition"], "EV hybrid high voltage safety service verification programming")
  ] }
];
