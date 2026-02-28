import { Itinerary, ItineraryDay, Activity } from './auth';

// Sample data for different destinations
const destinationData: Record<string, any> = {
  'Hà Nội': {
    activities: [
      { title: 'Hồ Hoàn Kiếm', description: 'Tham quan hồ Hoàn Kiếm và đền Ngọc Sơn', cost: 0, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Phố Cổ Hà Nội', description: 'Khám phá 36 phố phường cổ kính', cost: 0, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Lăng Chủ tịch Hồ Chí Minh', description: 'Tham quan lăng Bác và Khu di tích', cost: 100000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Văn Miếu Quốc Tử Giám', description: 'Di tích văn hóa giáo dục Việt Nam', cost: 30000, duration: '1.5 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Chùa Một Cột', description: 'Chùa cổ độc đáo của Hà Nội', cost: 0, duration: '30 phút', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Ăn tối tại phố Tạ Hiện', description: 'Thưởng thức ẩm thực đường phố', cost: 200000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    ],
  },
  'TP. Hồ Chí Minh': {
    activities: [
      { title: 'Dinh Độc Lập', description: 'Tham quan dinh thự lịch sử', cost: 40000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Nhà thờ Đức Bà', description: 'Công trình kiến trúc Pháp cổ', cost: 0, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Bưu điện Trung tâm Sài Gòn', description: 'Kiến trúc Pháp đẹp mắt', cost: 0, duration: '30 phút', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Chợ Bến Thành', description: 'Mua sắm và thưởng thức ẩm thực', cost: 150000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Phố đi bộ Nguyễn Huệ', description: 'Dạo bộ và ngắm cảnh thành phố', cost: 0, duration: '1.5 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Địa đạo Củ Chi', description: 'Khám phá hệ thống địa đạo lịch sử', cost: 250000, duration: '4 giờ', image: 'https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    ],
  },
  'Đà Nẵng': {
    activities: [
      { title: 'Bãi biển Mỹ Khê', description: 'Tắm biển và thư giãn', cost: 0, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Bà Nà Hills', description: 'Cáp treo và Cầu Vàng nổi tiếng', cost: 750000, duration: '6 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Ngũ Hành Sơn', description: 'Khám phá động và chùa', cost: 40000, duration: '2.5 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Cầu Rồng', description: 'Xem cầu phun lửa và nước', cost: 0, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Chợ Hàn', description: 'Mua sắm đặc sản địa phương', cost: 200000, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    ],
  },
  'Hội An': {
    activities: [
      { title: 'Phố cổ Hội An', description: 'Dạo bộ phố cổ với đèn lồng', cost: 120000, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Chùa Cầu', description: 'Biểu tượng của Hội An', cost: 0, duration: '30 phút', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Bãi biển An Bàng', description: 'Thư giãn tại bãi biển đẹp', cost: 0, duration: '2 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Làng rau Trà Quế', description: 'Trải nghiệm làm nông dân', cost: 150000, duration: '3 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { title: 'Thả đèn lồng trên sông', description: 'Hoạt động văn hóa đặc sắc', cost: 50000, duration: '1 giờ', image: 'https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    ],
  },
};

// Generate AI itinerary
export function generateItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  budget: number,
  interests: string[]
): Itinerary {
  const days = calculateDays(startDate, endDate);
  const itineraryId = Date.now().toString();
  
  const destActivities = destinationData[destination]?.activities || [];
  const itineraryDays: ItineraryDay[] = [];
  let totalCost = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayActivities: Activity[] = [];
    const activitiesPerDay = Math.min(3, destActivities.length);
    
    for (let j = 0; j < activitiesPerDay; j++) {
      const activityIndex = (i * activitiesPerDay + j) % destActivities.length;
      const baseActivity = destActivities[activityIndex];
      
      const activity: Activity = {
        id: `${itineraryId}-${i}-${j}`,
        time: j === 0 ? '09:00' : j === 1 ? '13:00' : '17:00',
        title: baseActivity.title,
        description: baseActivity.description,
        location: destination,
        cost: baseActivity.cost,
        duration: baseActivity.duration,
        image: baseActivity.image,
      };
      
      dayActivities.push(activity);
      totalCost += activity.cost;
    }
    
    itineraryDays.push({
      day: i + 1,
      date: date.toISOString().split('T')[0],
      activities: dayActivities,
    });
  }
  
  // Add accommodation and food costs
  totalCost += days * 500000; // Accommodation
  totalCost += days * 300000; // Food
  
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

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
