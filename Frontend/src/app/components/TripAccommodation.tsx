import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Star, Hotel as HotelIcon, Plus, Clock, CalendarDays, ArrowRight, PencilRuler } from "lucide-react";
import { Day, Hotel, Accommodation } from "../types/trip.types";

interface TripAccommodationProps {
  selectedDay: Day;
  selectedDayId: number;
  days: Day[];
  showDaySelection: boolean;
  selectedHotel: Hotel | null;
  selectedDaysForHotel: number[];
  showHotelSelection: boolean;
  bookingType: 'hourly' | 'nightly' | 'daily';
  bookingDuration: number;
  setBookingType: (type: 'hourly' | 'nightly' | 'daily') => void;
  setBookingDuration: (val: number) => void;
  calculateHotelCost: (price: number, type: string, duration: number) => number;
  getHotelsForCity: (city?: string) => Hotel[];
  getAccommodationForDay: (dayId: number) => Accommodation | null;
  setSelectedDaysForHotel: (days: number[]) => void;
  onCancelDaySelection: () => void;
  onConfirmAccommodation: () => void;
  onChangeAccommodation: () => void;
  onSelectHotel: (hotel: Hotel) => void;
  onShowHotelSelection: () => void;
}

export function TripAccommodation({
  selectedDay,
  selectedDayId,
  days,
  showDaySelection,
  selectedHotel,
  selectedDaysForHotel,
  showHotelSelection,
  bookingType,
  bookingDuration,
  setBookingType,
  setBookingDuration,
  calculateHotelCost,
  getHotelsForCity,
  getAccommodationForDay,
  setSelectedDaysForHotel,
  onCancelDaySelection,
  onConfirmAccommodation,
  onChangeAccommodation,
  onSelectHotel,
  onShowHotelSelection
}: TripAccommodationProps) {
  
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [checkInDayId, setCheckInDayId] = useState<number>(selectedDayId);
  const [checkOutDayId, setCheckOutDayId] = useState<number | null>(null);

  const contiguousDays = useMemo(() => {
    const startIdx = days.findIndex(d => d.id === selectedDayId);
    if (startIdx === -1) return [];
    
    const targetCity = days[startIdx].destinationName;
    let left = startIdx;
    while (left > 0 && days[left - 1].destinationName === targetCity) left--;
    let right = startIdx;
    while (right < days.length - 1 && days[right + 1].destinationName === targetCity) right++;
    
    return days.slice(left, right + 1);
  }, [days, selectedDayId]);

  useEffect(() => {
    if (showDaySelection) {
      if (selectedDaysForHotel.length > 0) {
        setCheckInDayId(selectedDaysForHotel[0]);
        if (bookingType === 'nightly') {
          const lastId = selectedDaysForHotel[selectedDaysForHotel.length - 1];
          const lastIdx = contiguousDays.findIndex(d => d.id === lastId);
          if (lastIdx !== -1 && lastIdx + 1 < contiguousDays.length) {
            setCheckOutDayId(contiguousDays[lastIdx + 1].id);
          } else {
            setCheckOutDayId(lastId);
          }
        } else {
          setCheckOutDayId(selectedDaysForHotel[0]);
        }
      } else {
        setCheckInDayId(selectedDayId);
        const idx = contiguousDays.findIndex(d => d.id === selectedDayId);
        if (idx !== -1 && idx + 1 < contiguousDays.length) {
          setCheckOutDayId(contiguousDays[idx + 1].id);
        } else {
          setCheckOutDayId(selectedDayId);
        }
      }
    }
  }, [showDaySelection]);

  useEffect(() => {
    if (!checkOutDayId) return;
    const inIdx = contiguousDays.findIndex(d => d.id === checkInDayId);
    const outIdx = contiguousDays.findIndex(d => d.id === checkOutDayId);

    if (inIdx !== -1 && outIdx !== -1) {
      let newDays: number[] = [];
      if (bookingType === 'nightly') {
        const maxIdx = Math.max(inIdx, outIdx - 1);
        for (let i = inIdx; i <= maxIdx; i++) {
          newDays.push(contiguousDays[i].id);
        }
        if (newDays.length === 0) newDays.push(checkInDayId);
      } else {
        newDays = [checkInDayId];
      }
      setSelectedDaysForHotel(newDays);
    }
  }, [checkInDayId, checkOutDayId, bookingType, contiguousDays]);

  // LOGIC CHẶN NGƯỜI DÙNG CHỌN SAI
  useEffect(() => {
    if (checkInDayId === checkOutDayId && bookingType === 'nightly') {
      setBookingType('hourly'); // Cùng ngày thì ép về theo giờ
    } else if (checkInDayId !== checkOutDayId && bookingType === 'hourly') {
      setBookingType('nightly'); // Khác ngày thì ép về qua đêm
    }
  }, [checkInDayId, checkOutDayId, bookingType, setBookingType]);

  const autoDuration = useMemo(() => {
    if (checkInDayId === checkOutDayId) {
      if (bookingType === 'hourly') {
        const [inH, inM] = checkInTime.split(':').map(Number);
        const [outH, outM] = checkOutTime.split(':').map(Number);
        let hours = (outH + outM / 60) - (inH + inM / 60);
        if (hours <= 0) hours += 24;
        return Math.max(1, Math.round(hours));
      }
      return 1; 
    } else {
      const inIdx = contiguousDays.findIndex(d => d.id === checkInDayId);
      const outIdx = contiguousDays.findIndex(d => d.id === checkOutDayId);
      if (bookingType === 'daily') {
        return Math.max(1, outIdx - inIdx + 1); 
      }
      return Math.max(1, outIdx - inIdx); 
    }
  }, [bookingType, checkInDayId, checkOutDayId, checkInTime, checkOutTime, contiguousDays]);

  useEffect(() => {
    setBookingDuration(autoDuration);
  }, [autoDuration, setBookingDuration]);
  
  if (showDaySelection && selectedHotel) {
    return (
      <div className="max-w-3xl mx-auto pb-10">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Thiết lập thời gian ở</h3>
            <p className="text-sm text-gray-500">Tại {selectedDay.destinationName}</p>
          </div>
          <PencilRuler className="h-10 w-10 text-gray-200 flex-shrink-0" />
        </div>

        <div className="mb-8 p-5 rounded-2xl bg-gray-50 border border-gray-100 shadow-inner flex items-center gap-5">
          <img src={selectedHotel.image} alt={selectedHotel.name} className="h-20 w-32 rounded-lg object-cover flex-shrink-0 shadow-sm" />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 truncate text-lg mb-1">{selectedHotel.name}</h4>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{selectedHotel.location}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> <span className="text-sm font-semibold">{selectedHotel.rating}</span></div>
              <span className="text-xs text-gray-400">({selectedHotel.reviewCount.toLocaleString()} đánh giá)</span>
            </div>
            <button 
              onClick={() => {
                onCancelDaySelection();
                onShowHotelSelection();
              }} 
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-white border border-cyan-200 px-3 py-1 rounded-full shadow-sm"
            >
              ← Thay đổi sang nơi ở khác
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-5">
            <CalendarDays className="h-5 w-5 text-cyan-600" />
            1. Chọn ngày Nhận - Trả phòng
          </h4>
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
            <div className="relative">
              <label className="mb-2 block text-xs font-semibold text-gray-700">Ngày Check-in</label>
              <select
                value={checkInDayId}
                onChange={(e) => {
                  const newIn = parseInt(e.target.value);
                  setCheckInDayId(newIn);
                  const inIdx = contiguousDays.findIndex(d => d.id === newIn);
                  const outIdx = contiguousDays.findIndex(d => d.id === checkOutDayId);
                  if (outIdx <= inIdx) {
                    if (inIdx + 1 < contiguousDays.length) {
                      setCheckOutDayId(contiguousDays[inIdx + 1].id);
                    } else {
                      setCheckOutDayId(newIn);
                    }
                  }
                }}
                className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-cyan-500 focus:outline-none bg-gray-50 font-bold text-gray-900 appearance-none shadow-sm"
              >
                {contiguousDays.map(day => (
                  <option key={day.id} value={day.id}>{day.label} ({day.date})</option>
                ))}
              </select>
            </div>
            
            <ArrowRight className="h-6 w-6 text-gray-300 mt-6" />

            <div className="relative">
              <label className="mb-2 block text-xs font-semibold text-gray-700">Ngày Check-out</label>
              <select
                value={checkOutDayId || ''}
                onChange={(e) => setCheckOutDayId(parseInt(e.target.value))}
                className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-cyan-500 focus:outline-none bg-gray-50 font-bold text-gray-900 appearance-none shadow-sm disabled:opacity-60"
              >
                {contiguousDays.map((day, idx) => {
                  const inIdx = contiguousDays.findIndex(d => d.id === checkInDayId);
                  if (idx < inIdx) return null;
                  return <option key={day.id} value={day.id}>{day.label} ({day.date})</option>
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-5">2. Hình thức thuê & Thời gian</h4>
          
          <div className="grid grid-cols-[2fr,1fr] gap-4 mb-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Loại hình</label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none bg-gray-50 font-medium disabled:opacity-70"
              >
                {/* KHÓA "QUA ĐÊM" NẾU CHỌN CÙNG 1 NGÀY */}
                <option value="nightly" disabled={checkInDayId === checkOutDayId}>
                  Qua đêm ({selectedHotel.price.toLocaleString()}đ/đêm)
                </option>
                <option value="daily">Nguyên ngày ({(selectedHotel.price * 1.5).toLocaleString()}đ/ngày)</option>
                {checkInDayId === checkOutDayId && (
                  <option value="hourly">Theo giờ ({(selectedHotel.price * 0.15).toLocaleString()}đ/h)</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Số lượng tạm tính
              </label>
              <div className="flex h-[42px] items-center px-4 rounded-lg bg-cyan-600 font-bold text-white text-base shadow-inner">
                {autoDuration} {bookingType === 'hourly' ? 'giờ' : bookingType === 'nightly' ? 'đêm' : 'ngày'}
              </div>
            </div>
          </div>

          {bookingType === 'hourly' && checkInDayId === checkOutDayId && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Clock className="h-4 w-4 text-cyan-500" /> Giờ Nhận phòng
                </label>
                <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Clock className="h-4 w-4 text-cyan-500" /> Giờ Trả phòng
                </label>
                <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
              </div>
            </div>
          )}

          {bookingType !== 'hourly' && (
            <div className="flex items-center gap-4 text-sm font-medium text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Check-in tiêu chuẩn: 14:00</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Check-out tiêu chuẩn: 12:00</div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-4 pb-2 border-t border-gray-100 mt-8 z-10 -mx-6 px-6">
          <div className="flex items-center justify-between mb-4 bg-cyan-50 border border-cyan-100 p-4 rounded-xl shadow-sm">
            <span className="font-medium text-cyan-800 text-sm">Tổng tiền nơi ở tạm tính:</span>
            <div className="text-right">
                <span className="text-sm font-medium text-cyan-700 mr-2">{autoDuration} {bookingType === 'hourly' ? 'giờ' : bookingType === 'nightly' ? 'đêm' : 'ngày'}</span>
                <span className="text-3xl font-bold text-cyan-700">
                {calculateHotelCost(selectedHotel.price, bookingType, autoDuration).toLocaleString('vi-VN')}₫
                </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancelDaySelection} className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-50 bg-white">
              Hủy bỏ
            </button>
            <button
              onClick={onConfirmAccommodation}
              disabled={selectedDaysForHotel.length === 0}
              className="flex-[2] rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showHotelSelection) {
    const hotels = getHotelsForCity(selectedDay.destinationName);
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Chọn nơi ở</h3>
                <p className="text-sm text-gray-500">Các địa điểm lưu trú tại {selectedDay.destinationName}</p>
            </div>
            <div className="bg-cyan-50 text-cyan-700 px-4 py-1 rounded-full text-xs font-bold border border-cyan-100">{contiguousDays.length} ngày ở {selectedDay.destinationName}</div>
        </div>

        {hotels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {hotels.map((hotel) => (
              <div key={hotel.id} onClick={() => onSelectHotel(hotel)} className="cursor-pointer rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-cyan-400 overflow-hidden transition-all flex flex-col group">
                <div className="relative h-44 overflow-hidden">
                  <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-gray-900 mb-1 group-hover:text-cyan-700">{hotel.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{hotel.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 border-t border-gray-100 pt-3 mt-auto">
                      <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> <span className="text-sm font-semibold">{hotel.rating}</span></div>
                      <div className="text-right">
                          <p className="text-xs text-gray-400">Giá ước tính</p>
                          <span className="text-sm font-bold text-cyan-600">{hotel.price.toLocaleString('vi-VN')}₫/đêm</span>
                      </div>
                  </div>
                  <button className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700">
                    Chọn nơi này
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
            <HotelIcon className="mb-3 h-12 w-12 text-gray-300" />
            <h4 className="text-lg font-bold text-gray-900">Không tìm thấy khách sạn nào</h4>
            <p className="mt-1 text-sm text-gray-500">Hiện tại chưa có dữ liệu khách sạn cho {selectedDay.destinationName}.</p>
          </div>
        )}
      </div>
    );
  }
             

  const accommodation = getAccommodationForDay(selectedDayId);

  if (accommodation && !showHotelSelection) {
    const hotel = accommodation.hotel;
    const bType = accommodation.bookingType || 'nightly';
    const typeLabel = bType === 'hourly' ? 'giờ' : bType === 'nightly' ? 'đêm' : 'ngày';

    return (
      <div className="max-w-2xl mx-auto pb-10">
        <div className="mb-6 border-b border-gray-100 pb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Thông tin nơi ở đã lưu</h3>
          <p className="text-sm text-gray-500">Chi tiết nơi lưu trú cho ngày {selectedDay.label}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="relative h-48">
            <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h4 className="text-xl font-bold text-white mb-1">{hotel.name}</h4>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{hotel.location}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-5 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-700">Tổng thời gian thuê</p>
                  <p className="text-xl font-bold text-cyan-900">
                    {accommodation.duration} {typeLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-cyan-700">Tổng chi phí dự kiến</p>
                  <p className="text-2xl font-bold text-cyan-900">
                    {calculateHotelCost(hotel.price, bType, accommodation.duration || 1).toLocaleString('vi-VN')}₫
                  </p>
                </div>
            </div>

            <div className="mb-6">
              <h5 className="text-sm font-bold text-gray-900 mb-2.5">Cố định cho các ngày:</h5>
              <div className="flex flex-wrap gap-2">
                {accommodation.dayIds.map((dayId: number) => { 
                  const day = days.find(d => d.id === dayId);
                  if (!day) return null;
                  return (
                    <span key={dayId} className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                      {day.label} ({day.date})
                    </span>
                  );
                }).filter(Boolean)}
              </div>
            </div>

            <button
              onClick={onChangeAccommodation}
              className="w-full rounded-xl border-2 border-cyan-600 bg-cyan-50 py-3 font-bold text-cyan-700 transition-all hover:bg-cyan-100 shadow-sm"
            >
              Thay đổi thiết lập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-inner border border-gray-100">
      <HotelIcon className="mb-6 h-16 w-16 text-gray-200" />
      <p className="mb-2 font-semibold text-gray-500">Chưa có nơi ở cho ngày này</p>
      <p className="text-sm text-gray-400 text-center max-w-sm mb-6">Bạn cần chọn khách sạn và thiết lập thời gian ở tại thành phố này.</p>
      <button onClick={onShowHotelSelection} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-semibold text-white shadow-md hover:scale-[1.02]">
        <Plus className="h-4 w-4" /> Chọn nơi ở ngay
      </button>
    </div>
  );
}