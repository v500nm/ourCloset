import { LogOutfitParams, OutfitHistory } from '../types/history.types';

export async function logOutfitWear(params: LogOutfitParams): Promise<OutfitHistory | null> {
  // Service stub calling Supabase outfit_history insert & wear_count trigger
  return null;
}

export async function fetchOutfitHistory(): Promise<OutfitHistory[]> {
  return [];
}
