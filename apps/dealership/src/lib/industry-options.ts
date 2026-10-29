export const industryOptions = {
  body: ["SUV", "Crossover", "Sedan", "Truck", "Coupe", "Convertible", "Hatchback", "Wagon", "Van", "Minivan"],
  fuel: ["Gasoline", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid", "Flex Fuel", "Hydrogen", "Natural Gas", "Propane"],
  drivetrain: ["AWD", "4WD", "FWD", "RWD"],
  transmission: ["Automatic", "Manual", "CVT", "Automated Manual", "Dual-Clutch", "Single-Speed"],
  exteriorColor: ["Black", "White", "Silver", "Gray", "Blue", "Red", "Green", "Brown", "Beige", "Gold", "Yellow", "Orange", "Purple", "Burgundy", "Bronze"],
  interiorColor: ["Black", "Gray", "Beige", "Tan", "Brown", "White", "Red", "Blue", "Cream", "Saddle", "Burgundy"],
  cylinders: ["0", "2", "3", "4", "5", "6", "8", "10", "12", "16"],
  features: ["Adaptive cruise control", "Android Auto", "Apple CarPlay", "Automatic emergency braking", "Backup camera", "Blind spot monitoring", "Bluetooth", "Cooled seats", "Cruise control", "Heated seats", "Heated steering wheel", "Keyless entry", "Lane departure warning", "Lane keeping assist", "Leather seats", "Navigation", "Parking sensors", "Power liftgate", "Premium audio", "Remote start", "Roof rack", "Sunroof", "Third-row seating", "Tow package", "Wireless charging"]
} satisfies Record<string, string[]>;

export type CatalogMake = { id: number; name: string };
export type CatalogModel = { makeId: number; name: string };
export const catalogValue = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
