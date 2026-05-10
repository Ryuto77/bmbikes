export const VEHICLE_CATALOG = [
  { brand: "Maruti Suzuki", models: ["Alto", "Alto K10", "Swift", "Dzire", "Baleno", "Wagon R", "Ertiga", "Brezza", "Celerio", "Ignis"] },
  { brand: "Hyundai", models: ["i10", "Grand i10", "i20", "Aura", "Verna", "Venue", "Creta", "Alcazar", "Santro"] },
  { brand: "Tata", models: ["Tiago", "Tigor", "Altroz", "Punch", "Nexon", "Harrier", "Safari", "Nano"] },
  { brand: "Mahindra", models: ["Bolero", "Scorpio", "Scorpio N", "XUV300", "XUV500", "XUV700", "Thar", "KUV100"] },
  { brand: "Toyota", models: ["Etios", "Liva", "Glanza", "Innova", "Innova Crysta", "Fortuner", "Urban Cruiser"] },
  { brand: "Honda", models: ["Amaze", "City", "Jazz", "WR-V", "BR-V", "Civic"] },
  { brand: "Kia", models: ["Seltos", "Sonet", "Carens", "Carnival"] },
  { brand: "Renault", models: ["Kwid", "Triber", "Kiger", "Duster"] },
  { brand: "Nissan", models: ["Micra", "Sunny", "Magnite", "Terrano"] },
  { brand: "Volkswagen", models: ["Polo", "Vento", "Ameo", "Taigun", "Virtus"] },
  { brand: "Skoda", models: ["Rapid", "Slavia", "Kushaq", "Octavia", "Superb"] },
  { brand: "Ford", models: ["Figo", "Aspire", "EcoSport", "Endeavour", "Fiesta"] },
  { brand: "Chevrolet", models: ["Beat", "Spark", "Sail", "Enjoy", "Tavera"] },
  { brand: "MG", models: ["Hector", "Astor", "Gloster", "Comet"] },
];

export const VEHICLE_BRANDS = VEHICLE_CATALOG.map((item) => item.brand);

export function modelsForBrand(brand) {
  const normalized = String(brand || "").trim().toLowerCase();
  const match = VEHICLE_CATALOG.find((item) => item.brand.toLowerCase() === normalized);
  return match?.models || VEHICLE_CATALOG.flatMap((item) => item.models);
}
