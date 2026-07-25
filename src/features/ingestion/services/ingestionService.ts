/** TDD §3 — IngestionPipeline service stubs. */
import { AutoTagResult, IngestionItem } from '../types/ingestion.types';

/** Step 1: Background removal via @imgly/background-removal (WASM). */
export async function removeBackground(imageFile: File): Promise<Blob | null> {
  return null;
}

/** Step 2: Auto-tag inference via nearest-centroid classifier (client-side). */
export async function inferAutoTags(processedImageUrl: string): Promise<AutoTagResult> {
  return {
    category: null, culturalStyle: null,
    primaryColorHex: null, secondaryColorHex: null,
    hardwareMetalColor: null, leatherTone: null,
    formalityLevel: null, confidence: 0,
  };
}

/** Step 3: Generate embeddings — color_embedding (64-dim) + silhouette_embedding (128-dim). */
export async function generateEmbeddings(processedImageUrl: string): Promise<{
  colorEmbedding: number[];
  silhouetteEmbedding: number[];
} | null> {
  return null;
}

/** Step 4: Save to wardrobe_items via Supabase. */
export async function saveWardrobeItem(item: IngestionItem): Promise<{ id: string } | null> {
  return null;
}
