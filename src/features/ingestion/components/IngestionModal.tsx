'use client';

import React, { useState } from 'react';
import { WardrobeItem, CulturalStyle, ItemCategory } from '@/types';
import { Button, Card } from '@/components';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WardrobeItem) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('shirt');
  const [culturalStyle, setCulturalStyle] = useState<CulturalStyle>('western');
  const [formalityLevel, setFormalityLevel] = useState<number>(3);

  if (!isOpen) return null;

  const handleSimulatedUpload = () => {
    setStep('processing');
    setTimeout(() => {
      setTitle('Tailored Cupboard Garment');
      setStep('review');
    }, 1500);
  };

  const handleFinalSave = () => {
    const newItem: WardrobeItem = {
      id: `ITEM-${Date.now().toString().slice(-4)}`,
      user_id: 'user-current',
      title: title || 'New Garment',
      category,
      cultural_style: culturalStyle,
      formality_level: formalityLevel as 1 | 2 | 3 | 4 | 5,
      image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80',
      season_tags: ['all-season'],
      wear_count: 0,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    };
    onSave(newItem);
    onClose();
    setStep('upload');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ink-overlay backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-surface relative p-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-dashed border-outline-variant">
          <h3 className="font-display text-headline-md text-primary">Ingest Cupboard Garment</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {step === 'upload' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-4xl">add_a_photo</span>
            </div>
            <p className="text-body-md text-on-surface-variant mb-6 font-body">
              Upload photo or capture item. Background will be removed automatically via WASM in-browser.
            </p>
            <Button onClick={handleSimulatedUpload} className="w-full justify-center">
              Select Photo & Process
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="spec-label text-primary uppercase tracking-wider">
              Running In-Browser WASM Background Removal...
            </p>
            <p className="text-xs text-on-surface-variant">Extracting color & silhouette vectors (Zero API Key)</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="spec-label text-emerald-800 bg-emerald-100 p-2.5 rounded text-xs">
              Auto-Tag Pass Complete • High Confidence Match
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-b-2 border-primary/20 pb-1 text-primary focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="spec-label block text-primary/70 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full bg-surface-container p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
                >
                  <option value="shirt">Shirt</option>
                  <option value="tshirt">T-Shirt</option>
                  <option value="pants">Pants</option>
                  <option value="jeans">Jeans</option>
                  <option value="nightwear">Nightwear</option>
                  <option value="suit">Suit / Suit Combo</option>
                  <option value="traditional_combo">Traditional Combo</option>
                  <option value="footwear">Shoes / Footwear</option>
                  <option value="belt">Belt</option>
                  <option value="watch">Watch</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-1">Cultural Style</label>
                <select
                  value={culturalStyle}
                  onChange={(e) => setCulturalStyle(e.target.value as CulturalStyle)}
                  className="w-full bg-surface-container p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
                >
                  <option value="western">Western</option>
                  <option value="indian_traditional">Indian Traditional</option>
                  <option value="islamic_modest">Islamic-Modest</option>
                </select>
              </div>
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Formality Index (1-5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={formalityLevel}
                onChange={(e) => setFormalityLevel(Number(e.target.value))}
                className="w-full accent-secondary"
              />
              <div className="flex justify-between text-xs text-on-surface-variant font-mono">
                <span>1 (Casual)</span>
                <span>3 (Smart Casual)</span>
                <span>5 (Black Tie)</span>
              </div>
            </div>

            <Button onClick={handleFinalSave} className="w-full justify-center mt-4">
              Confirm & Save to Closet
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
