/**
 * Hook to fetch and manage destinations from backend API.
 * Provides fallback to static list when API fails.
 */

import { useState, useEffect } from "react";
import { api } from "../services/api";

export interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
  rating: number;
  placesCount: number;
  hotelsCount: number;
  isGenerateReady: boolean;
  readinessStatus: "ready" | "partial" | "sparse";
  readinessReason: string | null;
}

interface UseDestinationsResult {
  destinations: Destination[];
  isLoading: boolean;
  error: string | null;
  isUsingFallback: boolean;
  refetch: () => Promise<void>;
}

export function useDestinations(): UseDestinationsResult {
  const [state, setState] = useState<{
    destinations: Destination[];
    isLoading: boolean;
    error: string | null;
    isUsingFallback: boolean;
  }>({
    destinations: [],
    isLoading: true,
    error: null,
    isUsingFallback: false,
  });

  const fetchDestinations = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await api.get<Destination[]>("/api/v1/places/destinations");

      if (Array.isArray(data) && data.length > 0) {
        setState({
          destinations: data,
          isLoading: false,
          error: null,
          isUsingFallback: false,
        });
      } else {
        // API returned empty array - use fallback
        setState({
          destinations: [],
          isLoading: false,
          error: "Danh sách thành phố từ hệ thống đang trống. Đang sử dụng danh sách mặc định.",
          isUsingFallback: true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch destinations:", err);
      setState({
        destinations: [],
        isLoading: false,
        error: "Không thể tải danh sách thành phố từ hệ thống. Đang sử dụng danh sách mặc định.",
        isUsingFallback: true,
      });
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  return {
    ...state,
    refetch: fetchDestinations,
  };
}
