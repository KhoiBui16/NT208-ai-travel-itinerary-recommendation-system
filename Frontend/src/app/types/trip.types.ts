/**
 * Trip type definitions — Nhóm Trip
 *
 * Chứa tất cả TypeScript interfaces cho nhóm Trip:
 *   • Core trip types    — Activity, Day, ExtraExpense
 *   • Location types     — Place, Destination
 *   • Accommodation types — Hotel, Accommodation
 *   • Traveler types     — TravelerInfo
 *   • Utility types      — DateAllocation, TimeConflictWarning
 *
 * Các interface này match 1-1 với BE CamelCaseModel schemas.
 */

// ===========================================================================
// 1. Core trip types — Activity, Day, ExtraExpense
// ===========================================================================

/** Chi phí phát sinh (cấp activity hoặc cấp day) */
export interface ExtraExpense {
  id: number;
  name: string;
  amount: number;                                                              // Đơn vị: VNĐ
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

/** Hoạt động trong ngày — core entity của lịch trình */
export interface Activity {
  id: number;
  time: string;                                                                // Giờ bắt đầu (HH:MM)
  endTime?: string;                                                            // Giờ kết thúc (HH:MM)
  name: string;                                                                // Tên hoạt động
  location: string;                                                            // Địa chỉ
  description: string;                                                         // Mô tả chi tiết
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";       // Loại hoạt động
  image: string;                                                               // URL ảnh
  transportation?: "walk" | "bike" | "bus" | "taxi";                           // Phương tiện di chuyển
  // Cost fields (đơn vị: VNĐ)
  adultPrice?: number; // For food (per person) or attraction (ticket price)
  childPrice?: number; // For food (per person) or attraction (ticket price)
  customCost?: number; // For shopping, entertainment, or custom override
  // Transportation costs
  busTicketPrice?: number; // Per person bus ticket
  taxiCost?: number; // Total taxi cost estimate
  // Extra expenses
  extraExpenses?: ExtraExpense[];
}

/** Chi phí phát sinh cấp ngày (same structure as ExtraExpense) */
export interface DayExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

/** Một ngày trong lịch trình */
export interface Day {
  id: number;
  label: string;                   // "Ngày 1 - Hà Nội"
  date: string;                    // "dd/MM/yyyy" hoặc "yyyy-MM-dd"
  activities: Activity[];          // Danh sách hoạt động trong ngày
  destinationName?: string;        // Tên điểm đến của ngày
  extraExpenses?: DayExtraExpense[];  // Chi phí phát sinh cấp ngày
}


// ===========================================================================
// 2. Location types — Place, Destination
// ===========================================================================

/** Địa điểm du lịch (từ DB places) */
export interface Place {
  id: number;
  name: string;
  reviewCount: number;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  price?: string;      
  location?: string;
  reviews?: number;
  rating?: number;
  saved: boolean;                  // User đã lưu yêu thích chưa
  city: string;                    // Thành phố chứa địa điểm
  description?: string;
}

/** Điểm đến (tỉnh/thành phố) */
export interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
  rating: number;
}


// ===========================================================================
// 3. Accommodation types — Hotel, Accommodation
// ===========================================================================

/** Khách sạn (từ DB hotels) */
export interface Hotel {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;                   // Giá/đêm (VNĐ)
  image: string;
  location: string;
  city: string;
  amenities: string[];             // Tiện ích: wifi, pool, ...
  description: string;
}

/** Chỗ ở trong lịch trình (link tới Hotel hoặc manual) */
export interface Accommodation {
  hotel?: Hotel | null;            // Hotel entity (nếu chọn từ DB)
  dayIds: number[];                // IDs các ngày sử dụng chỗ ở
  bookingType?: 'hourly' | 'nightly' | 'daily';  // Loại booking
  duration?: number;               // Số đêm/giờ/ngày
  name?: string;                   // Tên chỗ ở (manual input)
  checkIn?: string;                // Giờ/ngày check-in
  checkOut?: string;               // Giờ/ngày check-out
  pricePerNight?: number;          // Giá/đêm (VNĐ)
  totalPrice?: number;             // Tổng giá (VNĐ)
}


// ===========================================================================
// 4. Traveler & Utility types
// ===========================================================================

/** Thông tin số lượng du khách */
export interface TravelerInfo {
  adults: number;                  // Số người lớn (ít nhất 1)
  children: number;                // Số trẻ em
  total: number;                   // Tổng = adults + children
}

/** Phân bổ ngày cho điểm đến (wizard flow) */
export interface DateAllocation {
  from: Date;                      // Ngày bắt đầu
  to: Date;                        // Ngày kết thúc
  days: number;                    // Số ngày
}

/** Cảnh báo xung đột thời gian giữa các activities */
export interface TimeConflictWarning {
  hasConflict: boolean;            // Có xung đột không
  conflictWith?: Activity;         // Activity bị xung đột (nếu có)
}
