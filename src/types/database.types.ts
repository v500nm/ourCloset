import {
  CulturalStyle,
  FabricType,
  FormalityLevel,
  HardwareMetalColor,
  ItemCategory,
  LaundryStatus,
  LeatherTone,
  PrivacyTier,
  SeasonTag,
} from './taxonomy.types';

export interface Profile {
  id: string;
  display_name: string;
  role_type: 'husband' | 'wife' | 'partner';
  created_at: string;
}

export interface HouseholdBond {
  id: string;
  household_type: 'couple' | 'family';
  sync_status: 'ACTIVE' | 'PAUSED';
  created_at: string;
}

export interface HouseholdMember {
  household_id: string;
  profile_id: string;
  role_in_household: 'partner' | 'family_member';
  joined_at: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  title: string;
  category: ItemCategory;
  cultural_style: CulturalStyle;
  primary_color_hex?: string;
  secondary_color_hex?: string;
  hardware_metal_color?: HardwareMetalColor;
  leather_tone?: LeatherTone;
  formality_level: FormalityLevel;
  image_url: string;
  color_embedding?: number[];
  silhouette_embedding?: number[];
  fabric_type?: FabricType;
  season_tags: SeasonTag[];
  purchase_price?: number;
  purchase_date?: string;
  wear_count: number;
  last_worn_at?: string;
  laundry_status: LaundryStatus;
  privacy_tier: PrivacyTier;
  created_at: string;
}

export interface OOTDSession {
  id: string;
  household_id: string;
  initiator_id: string;
  event_context: string;
  mood_prompt?: string;
  initiator_outfit: string[]; // array of wardrobe_item IDs
  suggested_partner_outfits?: {
    subtle: string[];
    balanced: string[];
    direct: string[];
  };
  partner_accepted_outfit?: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
}

export interface OutfitHistory {
  id: string;
  household_id?: string;
  worn_by: string;
  event_context?: string;
  item_ids: string[];
  worn_at: string;
  photo_url?: string;
  rating?: number;
  created_at: string;
}
