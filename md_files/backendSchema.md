# ourCloset — Backend Schema & Local Storage Architecture

## 1. Local Storage Schema (IndexedDB / `idb-keyval`)

`ourCloset` stores all active user wardrobe items, member profiles, and local session preferences in IndexedDB:

```typescript
// Member Profile
interface FamilyMember {
  id: string;
  name: string;
  role: 'husband' | 'wife' | 'partner' | 'sibling' | 'child' | 'custom';
  hierarchyRole: 'head_of_household' | 'spouse' | 'dependent';
  customRoleLabel?: string;
  closetCount: number;
  privacyTier: 'PUBLIC' | 'PRIVATE';
  joinedAt: string;
}

// Clothing Item
interface ClothingItem {
  id: string;
  ownerId: string;
  name: string;
  category: 'top' | 'bottom' | 'outerwear' | 'traditional' | 'modest' | 'footwear' | 'accessory';
  subCategory?: string;
  dressCode: 'Western' | 'Indian Traditional' | 'Islamic-Modest';
  formalityRating: number; // 1 to 5
  dominantColor: string;
  accentColors: string[];
  status: 'AVAILABLE' | 'DIRTY' | 'IN_WASH' | 'DRY_CLEANING';
  privacyTier: 'PUBLIC' | 'PRIVATE';
  imageUrl: string;
  created_at: string;
}

// Demo Cookie Session
// Cookie key: "ourcloset_demo_played=true; path=/; max-age=2592000"
```

## 2. Supabase RLS Schema (Cloud Sync Fallback)

When connected to Supabase, Row Level Security (RLS) policies enforce member privacy:

```sql
-- Household Member RLS
CREATE POLICY "Household Members can view public household items"
ON clothing_items FOR SELECT
USING (
  privacy_tier = 'PUBLIC' AND household_id = auth.jwt() ->> 'household_id'
  OR owner_id = auth.uid()
);
```