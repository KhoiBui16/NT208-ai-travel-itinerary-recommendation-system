// Auth utilities using localStorage
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  interests?: string[];
  createdAt: string;
}

export interface Itinerary {
  id: string;
  userId?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
  days: ItineraryDay[];
  totalCost: number;
  createdAt: string;
  rating?: number;
  feedback?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  duration: string;
  image: string;
  coordinates?: { lat: number; lng: number };
}

// Get current user
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user
export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

// Register user
export function registerUser(email: string, password: string, name: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers();
  
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'Email đã được sử dụng' };
  }
  
  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    createdAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem(`password_${newUser.id}`, password);
  
  return { success: true, user: newUser };
}

// Login user
export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return { success: false, error: 'Email hoặc mật khẩu không đúng' };
  }
  
  const storedPassword = localStorage.getItem(`password_${user.id}`);
  if (storedPassword !== password) {
    return { success: false, error: 'Email hoặc mật khẩu không đúng' };
  }
  
  return { success: true, user };
}

// Logout
export function logoutUser(): void {
  setCurrentUser(null);
}

// Get all users
function getUsers(): User[] {
  const usersStr = localStorage.getItem('users');
  return usersStr ? JSON.parse(usersStr) : [];
}

// Update user profile
export function updateUserProfile(userId: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return null;
  
  users[userIndex] = { ...users[userIndex], ...updates };
  localStorage.setItem('users', JSON.stringify(users));
  
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    setCurrentUser(users[userIndex]);
  }
  
  return users[userIndex];
}

// Save itinerary
export function saveItinerary(itinerary: Itinerary): void {
  const itineraries = getSavedItineraries();
  const existingIndex = itineraries.findIndex(i => i.id === itinerary.id);
  
  if (existingIndex >= 0) {
    itineraries[existingIndex] = itinerary;
  } else {
    itineraries.push(itinerary);
  }
  
  localStorage.setItem('itineraries', JSON.stringify(itineraries));
}

// Get saved itineraries
export function getSavedItineraries(userId?: string): Itinerary[] {
  const itinerariesStr = localStorage.getItem('itineraries');
  const itineraries: Itinerary[] = itinerariesStr ? JSON.parse(itinerariesStr) : [];
  
  if (userId) {
    return itineraries.filter(i => i.userId === userId);
  }
  
  return itineraries;
}

// Get itinerary by ID
export function getItineraryById(id: string): Itinerary | null {
  const itineraries = getSavedItineraries();
  return itineraries.find(i => i.id === id) || null;
}

// Delete itinerary
export function deleteItinerary(id: string): void {
  const itineraries = getSavedItineraries();
  const filtered = itineraries.filter(i => i.id !== id);
  localStorage.setItem('itineraries', JSON.stringify(filtered));
}

// Rate itinerary
export function rateItinerary(id: string, rating: number, feedback?: string): void {
  const itineraries = getSavedItineraries();
  const index = itineraries.findIndex(i => i.id === id);
  
  if (index >= 0) {
    itineraries[index].rating = rating;
    if (feedback) {
      itineraries[index].feedback = feedback;
    }
    localStorage.setItem('itineraries', JSON.stringify(itineraries));
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
