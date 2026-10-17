export type CatalogAddition = { systemId: string; groupId: string; label?: string; repairs: string; diagnostics: string };

export const LIGHT_DUTY_ADDITIONS: CatalogAddition[] = [
  { systemId: "maintenance", groupId: "maintenance-sample", repairs: "Change engine oil & filter|0.5", diagnostics: "Inspect maintenance needs|0.5" },
  { systemId: "maintenance", groupId: "maintenance-service", label: "Scheduled packages & service records", repairs: `
Perform manufacturer-scheduled service with itemized scope|1
Perform severe-use maintenance review and service plan|0.8
Replace engine oil drain plug and sealing washer|0.5
Replace cartridge oil filter cap and seal|0.5
Service light-truck spare tire carrier|0.8
Lubricate serviceable chassis and driveline fittings|0.5
Perform light-truck towing readiness inspection|1
Record maintenance service and reset interval after completion|0.3
Replace serviceable washer reservoir filter|0.5`, diagnostics: `
Verify maintenance schedule by VIN and operating conditions|0.5
Inspect underbody for corrosion and fluid leakage|0.8
Inspect jack points and lifting restrictions|0.4
Inspect light-truck spare tire and carrier|0.5
Inspect hybrid engine maintenance requirements|0.5` },
  { systemId: "engine", groupId: "engine-sample", repairs: "Replace spark plugs|2", diagnostics: "Diagnose engine misfire|1\nDiagnose engine performance concern|1" },
  { systemId: "engine", groupId: "engine-assembly", repairs: `
Replace complete dressed engine assembly|18
Transfer reusable accessories to replacement long block|4
Replace left engine mount|2
Replace right engine mount|2
Replace rear engine mount|2.5
Replace active engine mount control valve|1
Replace engine lifting bracket|0.8
Replace engine-to-transmission dowel and locating hardware|1.5`, diagnostics: `
Inspect replacement engine supplied contents and compatibility|1
Diagnose active engine mount control concern|1` },
  { systemId: "engine", groupId: "engine-head", repairs: `
Replace left cylinder head gasket|12
Replace right cylinder head gasket|12
Replace both cylinder head gaskets|18
Replace cylinder head bolts with head already removed|0.5
Replace camshaft bearing cap or carrier where serviceable|6
Replace valve guide where serviceable|10
Replace camshaft adjuster control valve bridge|3
Replace variable valve lift actuator|2.5
Replace vacuum pump drive coupling|2
Replace camshaft end cover seal|1.5
Replace ignition coil tube seal|2
Replace oil filler neck or cap seal|0.5`, diagnostics: `
Test variable valve lift operation|1.5
Inspect cylinder head distortion with head removed|1
Inspect camshaft bearing oil clearance with access established|1.5` },
  { systemId: "engine", groupId: "engine-bottom", repairs: `
Replace crankshaft thrust bearing|20
Replace piston cooling oil jet|12
Replace balance shaft bearing where serviceable|12
Replace flexplate|7
Replace crankshaft position reluctor wheel|12
Repair serviceable engine-block threaded hole|3
Replace lower crankcase or bedplate seal|16
Replace oil gallery plug|3`, diagnostics: `
Measure crankshaft end play|1
Inspect bearing clearances with engine dismantled|2
Inspect piston ring end gap with components removed|1.5
Diagnose abnormal engine mechanical vibration|1.5` },
  { systemId: "engine", groupId: "engine-timing", repairs: `
Replace timing belt with tensioner and guide pulleys|5
Replace timing belt water pump package|6
Replace oil-pump drive belt|6
Replace camshaft sprocket|6
Replace crankshaft timing sprocket|6
Replace timing cover assembly|6
Replace balance shaft module|10
Replace variable valve timing filter screen|1.5`, diagnostics: `
Inspect timing belt contamination or tooth damage|1
Test variable valve timing oil supply|1.5
Verify mechanical timing after repair|1` },
  { systemId: "engine", groupId: "engine-lubrication", repairs: `
Replace engine oil level sensor|1.5
Replace oil-pressure control solenoid|2
Replace oil spray nozzle control valve|3
Replace oil filter housing assembly|3
Replace oil cooler housing gasket|3
Replace turbocharger oil strainer|2
Replace engine oil thermostat|2
Replace dry-sump oil reservoir where fitted|3`, diagnostics: `
Test oil-pressure control circuit|1.5
Inspect oil filter media for debris|0.8
Perform documented oil-consumption measurement setup|1` },
  { systemId: "engine", groupId: "engine-cooling", repairs: `
Replace electric auxiliary coolant pump|1.5
Replace coolant control valve|2
Replace electronic coolant distribution module|3
Replace cooling-system pressure cap|0.3
Replace coolant bleed screw or serviceable fitting|0.5
Replace engine coolant outlet flange|1.5
Replace coolant bypass hose|1.5
Replace radiator drain fitting where serviceable|0.8
Replace coolant level sensor|0.8
Replace active grille shutter assembly|2
Replace engine block heater|2
Replace oil-to-coolant heat exchanger|3
Replace coolant hose quick-connect seal|1
Replace auxiliary radiator|2
Vacuum-fill and bleed engine cooling circuit|1`, diagnostics: `
Test coolant concentration and contamination|0.5
Diagnose cooling fan control or after-run concern|1
Test electronic coolant valve actuation|1
Diagnose slow warmup or insufficient cabin heat|1
Inspect active grille shutter operation|0.8
Diagnose repeated cooling-system air entry|1.5` },
  { systemId: "engine", groupId: "engine-air", repairs: `
Replace throttle body gasket|1
Replace intake manifold runner position sensor|1
Replace charge-air cooler coolant pump|1.5
Replace resonator or intake silencer|0.8
Clean serviceable intake valves with scope confirmed|4`, diagnostics: `
Test throttle actuator and dual position signals|1.5
Inspect intake valve deposits|1
Diagnose unmetered air entering crankcase or intake|1` },
  { systemId: "engine", groupId: "engine-fuel", repairs: `
Replace low-pressure fuel pump control module|1
Replace fuel filler neck|2
Replace fuel tank retaining strap|1.5
Replace fuel tank pressure sensor|1.5
Replace fuel rail pressure relief valve|2
Replace direct-injection single-use high-pressure pipe|2
Replace diesel fuel temperature sensor|1
Replace fuel tank rollover valve where serviceable|3
Replace auxiliary fuel transfer pump on light truck|2.5
Drain and clean contaminated fuel system to reviewed scope|4`, diagnostics: `
Test fuel-pump current waveform|1.5
Test injector electrical control waveform|1.5
Diagnose fuel odor after hot soak|1
Test fuel composition and contamination|1
Test fuel pressure retention after shutdown|1` },
  { systemId: "engine", groupId: "engine-boost", repairs: `
Replace turbocharger coolant supply line|2
Replace turbocharger coolant return line|2
Replace turbocharger inlet gasket|3
Replace variable-geometry turbo actuator|3
Replace supercharger drive belt|1
Replace supercharger snout bearing where serviceable|4`, diagnostics: `
Test turbo actuator travel and adaptation|1.5
Diagnose boost air leak under load|1.5` },
  { systemId: "engine", groupId: "engine-commissioning", label: "Engine commissioning & final verification", repairs: `
Perform replacement-engine commissioning and documented checks|2
Prime engine lubrication system to manufacturer procedure|1
Perform engine adaptation after replacement|1
Perform post-repair engine leak and operating verification|1`, diagnostics: `
Verify replacement engine identity and emissions compatibility|1
Verify engine oil pressure after major repair|0.8
Verify cooling-system operation after engine replacement|0.8
Verify readiness and fault status after engine repair|0.8` },
  { systemId: "electrical", groupId: "electrical-sample", repairs: "Replace battery|0.5", diagnostics: "Diagnose no-start concern|1" },
  { systemId: "electrical", groupId: "electrical-distribution", repairs: `
Replace battery current sensor|0.8
Replace fusible battery terminal assembly|1
Replace battery vent tube|0.5
Replace auxiliary low-voltage battery|1
Replace smart battery isolation relay|1
Replace power distribution busbar where serviceable|1.5
Repair loaded ground connection|1`, diagnostics: `
Test battery capacity and state of health|0.5
Test start-stop battery management strategy|1
Test charging-system voltage ripple|1
Test starter cranking current and voltage drop|1
Diagnose repeated fuse failure with circuit protection|1.5` },
  { systemId: "electrical", groupId: "electrical-waveform", label: "Circuit, waveform & intermittent diagnosis", repairs: `
Repair one sealed connector terminal and pigtail|1
Replace one harness branch to reviewed scope|3
Repair water-damaged ground splice after source correction|2`, diagnostics: `
Perform loaded power and ground circuit diagnosis|1
Perform oscilloscope signal capture and analysis|1.5
Perform documented network resistance and waveform tests|1.5
Trace intermittent electrical fault with approved monitoring|2
Diagnose vehicle sleep and parasitic current concern|2
Diagnose wakeup source on vehicle network|1.5
Diagnose module software or configuration mismatch|1.5
Diagnose network gateway communication failure|1.5
Test sensor supply and reference ground integrity|1` },
  { systemId: "electrical", groupId: "electrical-lighting", repairs: `
Replace adaptive headlamp control module|1.5
Replace daytime running lamp driver|1
Replace rear lamp circuit board where serviceable|1
Repair headlamp mounting tab with approved kit|1.5
Replace light-truck bed lamp|0.8
Replace license plate lamp harness|1`, diagnostics: `
Diagnose adaptive headlamp leveling concern|1
Test exterior lamp driver output|1
Inspect headlamp aim after repair|0.5` },
  { systemId: "transmission", groupId: "transmission-sample", repairs: "Service transmission fluid|1.5\nRemove and reinstall transmission assembly|7\nReplace transmission pan gasket|2\nReplace transmission oil pump|7\nReplace transmission input shaft seal|6\nReplace transmission output shaft seal|2\nReplace automatic transmission internal clutch pack|12\nReplace transmission accumulator piston|4\nReplace transmission internal harness|4", diagnostics: "Diagnose shifting concern|1\nDiagnose transmission or driveline concern|1\nTest transmission line pressure|1.5\nInspect transmission debris and fluid contamination|1" },
  { systemId: "transmission", groupId: "transmission-cvt", repairs: `
Replace CVT chain or belt with reviewed overhaul scope|14
Replace CVT pulley assembly|14
Replace dual-clutch actuator motor|3
Replace transmission range sensor|1.5
Replace transmission speed sensor|1.5
Replace mechatronic sealing sleeve|3`, diagnostics: "Test CVT pressure and ratio control|1.5\nTest dual-clutch wear values and adaptation eligibility|1.5" },
  { systemId: "transmission", groupId: "transmission-manual", repairs: `
Replace clutch kit with flywheel package|8
Replace concentric clutch slave cylinder|7
Replace clutch pedal bushings|1.5
Replace manual gearbox synchronizer with reviewed overhaul scope|14
Replace manual gearbox input shaft bearing|12
Replace gear selector tower seal|2
Replace transmission shifter bushing|1
Bleed clutch hydraulic circuit|0.8`, diagnostics: "Test clutch hydraulic pressure loss|1\nInspect flywheel condition with gearbox removed|0.8" },
  { systemId: "transmission", groupId: "transmission-transfer", repairs: `
Replace power transfer unit on passenger AWD vehicle|5
Replace transfer-case chain|6
Replace transfer-case input seal|4
Replace AWD coupling clutch pack|5
Replace transfer-case vent hose|1`, diagnostics: "Test AWD coupling function and fluid condition|1.5\nTest transfer-case actuator position and relearn|1" },
  { systemId: "transmission", groupId: "transmission-differential", repairs: `
Replace differential ring and pinion with setup|8
Replace differential carrier bearing set|6
Replace pinion bearing and crush sleeve|6
Replace differential cover gasket|1.5
Replace electronically controlled differential actuator|2
Replace differential vent or breather|0.8
Replace axle shaft seal|2`, diagnostics: "Measure differential backlash and contact pattern|2\nDiagnose differential clutch chatter|1.5" },
  { systemId: "transmission", groupId: "transmission-shafts", repairs: `
Replace CV axle shaft|2
Replace front left CV axle shaft|2
Replace front right CV axle shaft|2
Replace rear left CV axle shaft|2
Replace rear right CV axle shaft|2
Replace CV joint boot with shaft removed|1.5
Replace driveshaft center support bearing|3
Replace driveshaft flexible coupling|2
Replace axle intermediate shaft bearing|3
Replace driveshaft flange fasteners with shaft removed|0.5`, diagnostics: "Measure driveshaft runout and operating angles|1.5\nDiagnose coast versus acceleration driveline noise|1.5" },
  { systemId: "transmission", groupId: "transmission-verification", label: "Drivetrain adaptation & verification", repairs: "Perform transmission programming and adaptive relearn|1.5\nPerform post-repair drivetrain verification|1\nSet transmission fluid level at specified temperature|0.8", diagnostics: "Verify transmission identification and software compatibility|1\nVerify drivetrain ratios and tire-size compatibility|0.8" },
  { systemId: "hvac", groupId: "hvac-sample", repairs: "Replace blower motor|1.2", diagnostics: "Diagnose A/C performance|1" },
  { systemId: "hvac", groupId: "hvac-refrigerant", repairs: `
Replace A/C compressor control valve where serviceable|2
Replace A/C pressure relief valve where serviceable|1.5
Replace refrigerant service port valve and cap|1.5
Replace one refrigerant line seal after recovery|1.5
Replace rear A/C evaporator|5
Replace rear A/C refrigerant line|4
Replace A/C condenser with receiver-drier package|3
Recover and identify contaminated refrigerant for specialist handling|2`, diagnostics: "Identify refrigerant type and contamination|0.5\nTest compressor control and displacement|1.5\nLeak-test A/C circuit to approved procedure|1\nDiagnose refrigerant restriction or moisture concern|1.5" },
  { systemId: "hvac", groupId: "hvac-heat", repairs: `
Replace heater control valve|1.5
Replace auxiliary cabin coolant heater|3
Replace rear heater core|4
Replace heater hose quick connector|1.5
Replace heater core with instrument panel removal package|8
Replace cabin electric PTC heater|4`, diagnostics: "Test heater coolant flow and temperature differential|1\nDiagnose unequal left and right outlet temperatures|1" },
  { systemId: "hvac", groupId: "hvac-controls", repairs: `
Replace mode door linkage|2
Replace recirculation door assembly|4
Replace HVAC air distribution housing|8
Replace blower power module connector|1
Calibrate HVAC door actuator positions|0.8`, diagnostics: "Test HVAC door travel and calibration|1\nDiagnose blower speed or intermittent airflow concern|1" },
  { systemId: "hvac", groupId: "hvac-heatpump", label: "Heat pump & electrified climate", repairs: `
Replace electric A/C compressor|4
Replace heat-pump reversing valve|4
Replace heat-pump multiport refrigerant valve|5
Replace refrigerant-to-coolant chiller|4
Replace heat-pump accumulator|3`, diagnostics: `
Diagnose heat-pump heating or defrost performance|1.5
Test electric compressor isolation and control to approved procedure|1.5
Diagnose refrigerant and battery-thermal interaction|1.5` },
  { systemId: "exhaust", groupId: "exhaust-sample", repairs: "Replace oxygen sensor|1", diagnostics: "Diagnose emissions warning|1" },
  { systemId: "exhaust", groupId: "exhaust-hardware", repairs: `
Replace exhaust flex pipe|2
Replace exhaust manifold gasket|4
Replace exhaust flange gasket and fasteners|1.5
Replace exhaust valve actuator|1.5
Replace exhaust resonator|1.5
Replace tailpipe|1
Repair one serviceable exhaust pipe joint|1.5`, diagnostics: "Test exhaust restriction by approved measurement|1.5\nDiagnose exhaust cabin odor or carbon monoxide concern|1.5\nInspect exhaust clearance and heat protection|0.8" },
  { systemId: "exhaust", groupId: "exhaust-evap", repairs: `
Replace EVAP leak detection pump|1.5
Replace natural vacuum leak detection module|1.5
Replace fuel filler cap sealing surface component|1.5
Replace EVAP vapor line to reviewed scope|2
Replace fuel tank isolation valve on hybrid|3`, diagnostics: "Test EVAP small leak with approved low-pressure equipment|1.5\nDiagnose refueling shutoff or tank vent concern|1\nTest hybrid sealed-tank pressure management|1.5" },
  { systemId: "exhaust", groupId: "exhaust-diesel", repairs: `
Replace DEF level and quality sensor|2
Replace DEF tank heater|3
Replace DEF injector dosing line|2
Replace SCR dosing injector|1.5
Replace diesel oxidation catalyst|4
Replace diesel exhaust flap valve|2
Replace DPF pressure sensor hoses|1`, diagnostics: "Test DEF quality and dosing quantity|1.5\nDiagnose regeneration inhibition before commanded regeneration|1.5\nTest SCR efficiency to applicable procedure|2\nInspect DPF soot and ash load before service|1" },
  { systemId: "tires", groupId: "tires-sample", repairs: `
Rotate tires and record final positions|0.5
Replace one passenger or light-truck tire|0.7
Perform road-force balance on one wheel assembly|0.7
Repair serviceable tire puncture after internal inspection|0.8`, diagnostics: "Diagnose tire or wheel vibration|0.8\nInspect tire damage and repairability|0.5\nDiagnose tire conicity or radial force variation|1" },
  { systemId: "tires", groupId: "tires-tpms", repairs: "Replace tire pressure sensor|0.8\nReplace TPMS receiver antenna|1\nPerform indirect TPMS calibration|0.5", diagnostics: "Test TPMS sensor transmissions and stored positions|0.8\nDiagnose indirect tire-pressure monitoring concern|1" },
  { systemId: "tires", groupId: "tires-hubs", repairs: "Replace wheel bearing / hub assembly|2", diagnostics: "" },
  { systemId: "safety", groupId: "safety-sample", repairs: "Calibrate forward camera|2", diagnostics: "Diagnose driver assistance warning|1" },
  { systemId: "safety", groupId: "safety-srs", repairs: `
Replace passenger airbag module|3
Replace knee airbag module|2
Replace seat side airbag module|3
Replace SRS impact sensor|1.5
Replace airbag control module with approved new unit|2
Replace pyrotechnic battery disconnect|1.5
Replace SRS connector repair kit only where explicitly permitted|2`, diagnostics: "Diagnose restraint warning to manufacturer test plan|1.5\nInspect restraint system after collision for required replacement scope|2" },
  { systemId: "safety", groupId: "safety-verification", label: "Safety calibration & documented handoff", repairs: `
Perform static forward-camera calibration|2
Perform dynamic forward-camera calibration when conditions permit|1.5
Perform surround-view camera calibration|2
Perform blind-spot radar calibration|2
Perform occupant classification calibration|1.5`, diagnostics: "Verify ADAS prerequisites and calibration conditions|1\nVerify restraint configuration and post-repair fault status|1\nInspect camera and radar mounting geometry|1\nDiagnose parking sensor false detections|1" },
  { systemId: "body", groupId: "body-sample", repairs: "Replace window regulator|1.5", diagnostics: "Diagnose inoperative window|0.8" },
  { systemId: "body", groupId: "body-closures", repairs: `
Replace powered liftgate drive strut|2
Replace liftgate pinch sensor|1.5
Replace hood latch cable|1.5
Replace door check strap|1
Replace fuel filler door actuator|1.5
Replace sliding door roller on passenger minivan|2
Replace powered sliding door drive cable|4
Replace pickup tailgate latch linkage|1.5
Replace pickup tailgate assist damper|1`, diagnostics: "Diagnose powered sliding door obstacle detection|1\nDiagnose powered liftgate calibration concern|1\nDiagnose door latch intermittent closure concern|1" },
  { systemId: "body", groupId: "body-water", label: "Water leaks, seals & corrosion assessment", repairs: `
Replace door vapor barrier with approved sealing method|1.5
Reseal body seam after documented leak localization|2
Replace cowl water deflector|1.5
Replace door glass run channel|1.5
Replace body pressure relief vent|1.5
Dry cabin after correcting water entry to reviewed scope|3`, diagnostics: "Perform controlled body water-leak localization|1.5\nInspect electrical exposure after cabin water intrusion|1\nAssess underbody corrosion and specialist referral need|1\nDiagnose wind noise at one selected body opening|1" },
  { systemId: "body", groupId: "body-collision", label: "Panels, glass & specialist assessment", repairs: `
Replace door shell|4
Replace front bumper cover|2.6
Replace fender|3
Refinish exterior panel|2.5`, diagnostics: `
Structural measurement and setup|2
Inspect bolt-on body panel damage and sensor mounting|1
Assess structural or refinish specialist referral|1` },
  { systemId: "body", groupId: "body-infotainment", repairs: `
Replace USB hub or accessory charging port|1
Replace wireless charging pad|1
Replace rear entertainment display|2
Replace antenna amplifier|1
Replace telematics backup battery|1
Update infotainment software to approved configuration|1`, diagnostics: "Diagnose Bluetooth or audio connectivity concern|1\nDiagnose accessory power outlet concern|1\nDiagnose telematics communication concern|1.5" },
  { systemId: "ev", groupId: "ev-sample", repairs: "Service battery cooling circuit|1.5", diagnostics: "Diagnose charging concern|1.5" },
  { systemId: "ev", groupId: "ev-battery", repairs: `
Replace high-voltage battery service disconnect|2
Replace battery pack seal after approved enclosure service|5
Replace battery management control module where authorized|5
Replace battery coolant manifold|4
Replace battery enclosure vent where serviceable|3`, diagnostics: "Assess high-voltage battery external damage and safe referral|1.5\nEvaluate battery capacity using approved test procedure|2\nDiagnose high-voltage interlock loop|1.5" },
  { systemId: "ev", groupId: "ev-charge-hardware", repairs: `
Replace AC charge inlet temperature sensor where serviceable|2
Replace charge-port locking actuator|1.5
Replace high-voltage junction box|4
Replace AC charging harness to approved scope|3
Replace DC fast-charge contactor where authorized|5`, diagnostics: "Diagnose AC versus DC charging failure|1.5\nTest charge inlet temperature monitoring|1\nDiagnose charging communication handshake|1.5" },
  { systemId: "ev", groupId: "ev-verification", label: "Electrified vehicle verification & referral", repairs: `
Perform documented high-voltage isolation and restoration|1.5
Perform post-repair charge and thermal verification|1.5
Perform high-voltage component software commissioning|1.5`, diagnostics: "Verify qualified personnel and platform service capability|0.5\nRecord pre-repair and post-repair isolation test results|1.5\nEvaluate battery shipping or specialist referral requirements|1\nVerify EV battery cooling circuit fill and leak status|1" }
];
