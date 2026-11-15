import { describe, it, expect } from 'vitest';
import { generateTwinningTiersEngine } from '@/engine';
import { WardrobeItem, CulturalStyle, ItemCategory, FormalityLevel } from '@/types';

function generateSyntheticWardrobe(ownerId: string, count: number): WardrobeItem[] {
  const styles: CulturalStyle[] = ['western', 'indian_traditional', 'islamic_modest'];
  const categories: ItemCategory[] = [
    'shirt',
    'pants',
    'traditional_combo',
    'suit',
    'accessory',
    'footwear',
  ];
  const colors = ['#FFFFFF', '#0A1128', '#990000', '#FDFBF7', '#046307', '#D8D2C2', '#232323', '#2C2C2C'];

  return Array.from({ length: count }, (_, index) => {
    const style = styles[index % styles.length];
    const category = categories[index % categories.length];
    const color = colors[index % colors.length];
    const formality = ((index % 5) + 1) as FormalityLevel;

    return {
      id: `${ownerId}-item-${index}`,
      user_id: ownerId,
      title: `${style} ${category} #${index}`,
      category,
      cultural_style: style,
      primary_color_hex: color,
      formality_level: formality,
      image_url: 'https://example.com/item.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: index % 10,
      created_at: '2026-01-01T00:00:00Z',
    };
  });
}

describe('Engine Performance Benchmark (p95 < 50ms Budget)', () => {
  it('achieves p95 latency under 50ms for two 300-item wardrobes', () => {
    const initiatorWardrobe = generateSyntheticWardrobe('m-husband', 300);
    const partnerWardrobe = generateSyntheticWardrobe('m-wife', 300);
    const now = new Date('2026-03-01T12:00:00Z');

    const iterations = 50;
    const executionTimesMs: number[] = [];

    // Warm-up run
    generateTwinningTiersEngine({
      initiatorItems: [initiatorWardrobe[0]],
      partnerWardrobe,
      context: { targetFormality: 4, culturalStyle: 'western' },
      now,
    });

    for (let i = 0; i < iterations; i++) {
      const initiatorAnchor = initiatorWardrobe[i % initiatorWardrobe.length];
      const start = performance.now();

      generateTwinningTiersEngine({
        initiatorItems: [initiatorAnchor],
        partnerWardrobe,
        context: {
          targetFormality: initiatorAnchor.formality_level,
          culturalStyle: initiatorAnchor.cultural_style,
        },
        now,
      });

      const elapsed = performance.now() - start;
      executionTimesMs.push(elapsed);
    }

    executionTimesMs.sort((a, b) => a - b);
    const p95Index = Math.floor(iterations * 0.95);
    const p95Latency = executionTimesMs[p95Index];
    const avgLatency = executionTimesMs.reduce((sum, t) => sum + t, 0) / iterations;

    console.log(`\n⚡ Outfit Engine Performance Benchmark (Two 300-Item Wardrobes):`);
    console.log(`   - Average Latency: ${avgLatency.toFixed(2)} ms`);
    console.log(`   - p95 Latency:     ${p95Latency.toFixed(2)} ms`);
    console.log(`   - Budget Ceiling:  50.00 ms`);

    expect(p95Latency).toBeLessThan(50);
  });
});

