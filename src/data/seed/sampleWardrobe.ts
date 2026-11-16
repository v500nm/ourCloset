import { WardrobeItem } from '@/types';
import { wardrobeRepository } from '../repositories/wardrobeRepository';
import { memberRepository } from '../repositories/memberRepository';
import { householdRepository } from '../repositories/householdRepository';

/**
 * Curated initial sample wardrobe representing the three cultural taxonomies
 * (Western, Indian Traditional, Islamic-Modest) for household testing.
 * Only seeded when explicitly requested by user via "Load sample wardrobe".
 */
export function getSampleWardrobe(): WardrobeItem[] {
  return [
    {
      id: 'SH-OXF-01',
      user_id: 'm-adnan',
      title: 'White Oxford Button-Down',
      category: 'shirt',
      cultural_style: 'western',
      primary_color_hex: '#FFFFFF',
      formality_level: 3,
      image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=400',
      fabric_type: 'cotton',
      season_tags: ['all-season'],
      wear_count: 5,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-20T10:00:00Z',
    },
    {
      id: 'PT-CHN-01',
      user_id: 'm-adnan',
      title: 'Navy Tailored Chinos',
      category: 'pants',
      cultural_style: 'western',
      primary_color_hex: '#0A192F',
      formality_level: 3,
      image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400',
      fabric_type: 'cotton',
      season_tags: ['all-season'],
      wear_count: 8,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-20T10:05:00Z',
    },
    {
      id: 'SK-GLD-01',
      user_id: 'm-adnan',
      title: 'Raw Silk Cream Sherwani',
      category: 'traditional_combo',
      cultural_style: 'indian_traditional',
      primary_color_hex: '#FDFBF7',
      secondary_color_hex: '#D4AF37',
      hardware_metal_color: 'gold',
      formality_level: 5,
      image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=400',
      fabric_type: 'silk',
      season_tags: ['all-season'],
      wear_count: 2,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: '2026-02-01T14:00:00Z',
    },
    {
      id: 'KJ-WHT-01',
      user_id: 'm-adnan',
      title: 'Embroidered Chikankari Kurta',
      category: 'traditional_combo',
      cultural_style: 'indian_traditional',
      primary_color_hex: '#FFFFFF',
      formality_level: 4,
      image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&q=80&w=400',
      fabric_type: 'cotton',
      season_tags: ['summer', 'all-season'],
      wear_count: 3,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: '2026-02-05T11:00:00Z',
    },
    {
      id: 'SU-NVY-01',
      user_id: 'm-adnan',
      title: 'Midnight Navy Wool Suit',
      category: 'suit',
      cultural_style: 'western',
      primary_color_hex: '#0A1128',
      formality_level: 5,
      image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=400',
      fabric_type: 'wool',
      season_tags: ['winter', 'all-season'],
      wear_count: 1,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-25T16:00:00Z',
    }
  ];
}

/**
 * Seeds the sample wardrobe items into the local IndexedDB database.
 */
export async function seedSampleWardrobe(clearExisting = false): Promise<{ count: number }> {
  if (clearExisting) {
    await wardrobeRepository.clear();
  }
  const sampleItems = getSampleWardrobe();
  await wardrobeRepository.bulkCreate(sampleItems);

  // Ensure default members exist if table is empty
  const memberCount = await memberRepository.count();
  if (memberCount === 0) {
    await memberRepository.bulkAdd([
      {
        id: 'm-adnan',
        name: 'Adnan',
        role: 'husband',
        hierarchyRole: 'head_of_household',
        customRoleLabel: 'Husband',
        closetCount: 5,
        privacyTier: 'PUBLIC',
        joinedAt: '2026-01-15',
      }
    ]);
    // Only set couple IDs if at least 2 members exist
    await householdRepository.clearPrimaryCoupleIds();
  }

  return { count: sampleItems.length };
}

