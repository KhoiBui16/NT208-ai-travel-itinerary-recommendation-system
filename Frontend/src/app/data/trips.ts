export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  estimatedCost: number;
  coverImage: string;
  savedLocationsCount: number;
  status: string;
}

export const mockTrips: Trip[] = [
  {
    id: "1",
    name: "Chuyến đi Hà Nội",
    destination: "Hà Nội",
    startDate: "10/03/2025",
    endDate: "12/03/2025",
    days: 3,
    estimatedCost: 4500000,
    coverImage: "https://images.unsplash.com/photo-1708400586139-2ba956acf25f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYW5vaSUyMGNpdHklMjB2aWV0bmFtfGVufDF8fHx8MTc3Mjk2MjM0Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    savedLocationsCount: 9,
    status: "planned",
  },
  {
    id: "2",
    name: "Nghỉ dưỡng Đà Nẵng",
    destination: "Đà Nẵng",
    startDate: "20/04/2025",
    endDate: "25/04/2025",
    days: 5,
    estimatedCost: 8500000,
    coverImage: "https://images.unsplash.com/flagged/photo-1583863374731-4224cbbc8c36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYW5hbmclMjBiZWFjaCUyMHZpZXRuYW18ZW58MXx8fHwxNzcyOTYyMzQ2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    savedLocationsCount: 12,
    status: "planned",
  },
  {
    id: "3",
    name: "Khám phá Hội An",
    destination: "Hội An",
    startDate: "15/05/2025",
    endDate: "18/05/2025",
    days: 4,
    estimatedCost: 6000000,
    coverImage: "https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjkwNzMxNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    savedLocationsCount: 8,
    status: "draft",
  },
];