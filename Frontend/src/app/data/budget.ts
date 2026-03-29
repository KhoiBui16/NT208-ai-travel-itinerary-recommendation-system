export interface BudgetPreset {
  id: string;
  name: string;
  allocations: Record<string, number>;
}

export const presets: BudgetPreset[] = [
  {
    id: "economy",
    name: "Tiết kiệm",
    allocations: {
      dining: 20,
      transport: 15,
      lodging: 30,
      entertainment: 10,
      shopping: 10,
      contingency: 15,
    },
  },
  {
    id: "standard",
    name: "Bình thường",
    allocations: {
      dining: 25,
      transport: 20,
      lodging: 30,
      entertainment: 10,
      shopping: 10,
      contingency: 5,
    },
  },
  {
    id: "premium",
    name: "Cao cấp",
    allocations: {
      dining: 25,
      transport: 15,
      lodging: 40,
      entertainment: 10,
      shopping: 5,
      contingency: 5,
    },
  },
];