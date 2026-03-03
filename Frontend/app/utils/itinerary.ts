/**
 * ============================================
 * itinerary.ts — Itinerary generation & utilities
 * ============================================
 * Gọi BE API để tạo lịch trình bằng AI (Gemini).
 * Fallback: nếu BE không available thì dùng mock data local.
 * ============================================
 */

import type { Itinerary } from './auth';
import { apiGenerateItinerary, ApiError } from './api';

/**
 * Tạo lịch trình du lịch qua BE API (AI-powered).
 * POST /api/v1/itineraries/generate
 *
 * Nếu BE fail (network error, server down), fallback sang mock data.
 */
export async function generateItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  budget: number,
  interests: string[]
): Promise<Itinerary> {
  try {
    const itinerary = await apiGenerateItinerary({
      destination,
      startDate,
      endDate,
      budget,
      interests,
    });
    return itinerary;
  } catch (err) {
    console.warn('BE API unavailable, using fallback mock data:', err instanceof ApiError ? err.message : err);
    return generateFallbackItinerary(destination, startDate, endDate, budget, interests);
  }
}

// ==================== Fallback Mock Data ====================
// Dùng khi BE không available (giống logic cũ)

const destinationData: Record<string, { title: string; description: string; cost: number; duration: string; image: string }[]> = {
  'Hà Nội': [
    { title: 'Hồ Hoàn Kiếm', description: 'Tham quan hồ Hoàn Kiếm và đền Ngọc Sơn', cost: 0, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080' },
    { title: 'Phố Cổ Hà Nội', description: 'Khám phá 36 phố phường cổ kính', cost: 0, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080' },
    { title: 'Lăng Chủ tịch Hồ Chí Minh', description: 'Tham quan lăng Bác và Khu di tích', cost: 100000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080' },
    { title: 'Văn Miếu Quốc Tử Giám', description: 'Di tích văn hóa giáo dục Việt Nam', cost: 30000, duration: '1.5 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080' },
    { title: 'Ăn tối tại phố Tạ Hiện', description: 'Thưởng thức ẩm thực đường phố', cost: 200000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080' },
  ],
  'TP. Hồ Chí Minh': [
    { title: 'Dinh Độc Lập', description: 'Tham quan dinh thự lịch sử', cost: 40000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080' },
    { title: 'Nhà thờ Đức Bà', description: 'Công trình kiến trúc Pháp cổ', cost: 0, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080' },
    { title: 'Chợ Bến Thành', description: 'Mua sắm và thưởng thức ẩm thực', cost: 150000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080' },
    { title: 'Phố đi bộ Nguyễn Huệ', description: 'Dạo bộ và ngắm cảnh thành phố', cost: 0, duration: '1.5 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080' },
    { title: 'Địa đạo Củ Chi', description: 'Khám phá hệ thống địa đạo lịch sử', cost: 250000, duration: '4 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080' },
  ],
  'Đà Nẵng': [
    { title: 'Bãi biển Mỹ Khê', description: 'Tắm biển và thư giãn', cost: 0, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080' },
    { title: 'Bà Nà Hills', description: 'Cáp treo và Cầu Vàng nổi tiếng', cost: 750000, duration: '6 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080' },
    { title: 'Ngũ Hành Sơn', description: 'Khám phá động và chùa', cost: 40000, duration: '2.5 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080' },
    { title: 'Cầu Rồng', description: 'Xem cầu phun lửa và nước', cost: 0, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080' },
    { title: 'Chợ Hàn', description: 'Mua sắm đặc sản địa phương', cost: 200000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080' },
  ],
  'Hội An': [
    { title: 'Phố cổ Hội An', description: 'Dạo bộ phố cổ với đèn lồng', cost: 120000, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080' },
    { title: 'Chùa Cầu', description: 'Biểu tượng của Hội An', cost: 0, duration: '30 phút', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080' },
    { title: 'Bãi biển An Bàng', description: 'Thư giãn tại bãi biển đẹp', cost: 0, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080' },
    { title: 'Làng rau Trà Quế', description: 'Trải nghiệm làm nông dân', cost: 150000, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080' },
    { title: 'Thả đèn lồng trên sông', description: 'Hoạt động văn hóa đặc sắc', cost: 50000, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080' },
  ],
};

function generateFallbackItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  budget: number,
  interests: string[]
): Itinerary {
  const days = calculateDays(startDate, endDate);
  const itineraryId = `fallback-${Date.now()}`;
  const destActivities = destinationData[destination] || destinationData['Hà Nội'] || [];
  const itineraryDays = [];
  let totalCost = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayActivities = [];
    const activitiesPerDay = Math.min(3, destActivities.length);

    for (let j = 0; j < activitiesPerDay; j++) {
      const activityIndex = (i * activitiesPerDay + j) % destActivities.length;
      const base = destActivities[activityIndex];
      dayActivities.push({
        id: `${itineraryId}-${i}-${j}`,
        time: j === 0 ? '09:00' : j === 1 ? '13:00' : '17:00',
        title: base.title,
        description: base.description,
        location: destination,
        cost: base.cost,
        duration: base.duration,
        image: base.image,
      });
      totalCost += base.cost;
    }

    itineraryDays.push({
      day: i + 1,
      date: date.toISOString().split('T')[0],
      activities: dayActivities,
    });
  }

  totalCost += days * 500000 + days * 300000;

  return {
    id: itineraryId,
    destination,
    startDate,
    endDate,
    budget,
    interests,
    days: itineraryDays,
    totalCost,
    createdAt: new Date().toISOString(),
  };
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// ==================== Utility ====================

/** Format currency VND */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
