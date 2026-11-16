import type { FeatureExtractionPipeline } from '@xenova/transformers';

class PipelineSingleton {
  private static instance: FeatureExtractionPipeline | null = null;

  public static async getInstance(): Promise<FeatureExtractionPipeline> {
    if (!this.instance) {
      const { pipeline } = await import('@xenova/transformers');
      this.instance = (await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      )) as FeatureExtractionPipeline;
    }
    return this.instance;
  }
}

export default PipelineSingleton;
