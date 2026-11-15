import { describe, it, expect } from 'vitest';
import {
  categorizeItemToSlot,
  getTemplateForStyle,
  CULTURAL_SLOT_TEMPLATES,
} from '@/engine/templates/slotTemplates';

describe('Cultural Slot Templates Architecture', () => {
  it('maps categories and titles to appropriate slot roles', () => {
    expect(categorizeItemToSlot('shirt', 'White Poplin Shirt')).toBe('top');
    expect(categorizeItemToSlot('pants', 'Navy Chinos')).toBe('bottom');
    expect(categorizeItemToSlot('suit', 'Tailored Suit')).toBe('combo');
    expect(categorizeItemToSlot('traditional_combo', 'Silk Sherwani')).toBe('combo');
    expect(categorizeItemToSlot('footwear', 'Leather Oxfords')).toBe('footwear');
    expect(categorizeItemToSlot('belt', 'Black Leather Belt')).toBe('accessory');

    // Head covering detection
    expect(categorizeItemToSlot('accessory', 'Dusk Mauve Modal Hijab')).toBe('head_covering');
    expect(categorizeItemToSlot('accessory', 'Gold Zari Dupatta')).toBe('head_covering');
    expect(categorizeItemToSlot('accessory', 'Royal Silk Safa')).toBe('head_covering');
  });

  it('selects appropriate cultural templates per taxonomy', () => {
    const westernSeparates = getTemplateForStyle('western', false);
    expect(westernSeparates.id).toBe('western_separates');
    expect(westernSeparates.requiredSlots).toEqual(['top', 'bottom']);

    const westernSuit = getTemplateForStyle('western', true);
    expect(westernSuit.id).toBe('western_suit');
    expect(westernSuit.requiredSlots).toEqual(['combo', 'top']);

    const indianCombo = getTemplateForStyle('indian_traditional');
    expect(indianCombo.id).toBe('indian_traditional_ensemble');
    expect(indianCombo.requiredSlots).toEqual(['combo']);

    const islamicAbayaHijab = getTemplateForStyle('islamic_modest', true);
    expect(islamicAbayaHijab.id).toBe('islamic_modest_abaya_hijab');
    expect(islamicAbayaHijab.requiredSlots).toEqual(['combo', 'head_covering']);
  });

  it('declares 5 distinct cultural slot templates', () => {
    expect(CULTURAL_SLOT_TEMPLATES).toHaveLength(5);
  });
});

