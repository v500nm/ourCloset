'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WardrobeItem } from '@/types';
import { Badge, Card, TwinSwatch } from '@/components';

interface ItemCardProps {
  item: WardrobeItem;
  onStatusClick?: () => void;
  onDeleteClick?: () => void;
  showPartnerOverlap?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onStatusClick, onDeleteClick, showPartnerOverlap = false }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Compact Card Layout */}
      <Card className="group relative transition-transform hover:-translate-y-1 p-0 overflow-hidden flex flex-col justify-between max-w-full">
        <div className="relative aspect-[3/4] w-full bg-surface-container overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          
          {/* Delete Action Badge */}
          {onDeleteClick && (
            <div className="absolute top-1.5 right-1.5 bg-secondary/95 text-on-secondary p-1 rounded shadow-sm flex items-center justify-center">
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
                className="text-white hover:text-red-400 transition-colors flex items-center justify-center"
                title="Remove Item"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          )}

          {/* Status Indicator Icon */}
          <button
            onClick={onStatusClick}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-surface/90 border border-outline-variant flex items-center justify-center text-primary shadow-sm hover:scale-110 transition-transform"
          >
            {item.laundry_status === 'CLEAN' ? (
              <span className="material-symbols-outlined text-xs text-emerald-700">check_circle</span>
            ) : item.laundry_status === 'DIRTY' ? (
              <span className="material-symbols-outlined text-xs text-sindoor">cancel</span>
            ) : item.laundry_status === 'IN_WASH' ? (
              <span className="material-symbols-outlined text-xs text-amber-700">water_drop</span>
            ) : (
              <span className="material-symbols-outlined text-xs text-purple-700">dry_cleaning</span>
            )}
          </button>

          {showPartnerOverlap && (
            <div className="absolute top-1.5 left-1.5">
              <TwinSwatch colorA={item.primary_color_hex || '#1F3B33'} colorB="#B8935A" />
            </div>
          )}
        </div>

        {/* Compact Footer Details */}
        <div className="p-3 bg-surface-container-lowest">
          <div className="spec-label text-primary/60 text-[9px] mb-0.5 uppercase tracking-wider font-mono truncate">
            {item.id} • {item.category.replace('_', ' ')}
          </div>
          <h4 className="font-display text-xs text-primary font-semibold truncate leading-tight">{item.title}</h4>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-dashed border-outline-variant/30 text-[10px] text-on-surface-variant font-mono">
            <span>Worn {item.wear_count}x</span>
            <Badge variant={item.laundry_status === 'CLEAN' ? 'clean' : item.laundry_status === 'DIRTY' ? 'dirty' : 'wash'}>
              {item.laundry_status}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
