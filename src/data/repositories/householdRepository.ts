import { db, OurClosetDB } from '../db';
import { HouseholdBond } from '@/types';

export class HouseholdRepository {
  private static readonly HOUSEHOLD_ID = 'primary-household';
  private static readonly COUPLE_STORAGE_KEY = 'ourcloset_primary_couple';

  constructor(private database: OurClosetDB = db) {}

  async getHousehold(): Promise<HouseholdBond | undefined> {
    return this.database.household.get(HouseholdRepository.HOUSEHOLD_ID);
  }

  async saveHousehold(household: HouseholdBond): Promise<void> {
    await this.database.household.put({
      ...household,
      id: household.id || HouseholdRepository.HOUSEHOLD_ID,
    });
  }

  async getByInviteCode(code: string): Promise<HouseholdBond | undefined> {
    const all = await this.database.household.toArray();
    return all.find((h) => h.invite_code === code.trim().toUpperCase());
  }

  private inMemoryCoupleIds: [string, string] | null = null;

  async getPrimaryCoupleIds(): Promise<[string, string] | null> {
    if (this.inMemoryCoupleIds) return this.inMemoryCoupleIds;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(HouseholdRepository.COUPLE_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as [string, string];
        }
      } catch {
        // fallback
      }
    }
    return null;
  }

  async setPrimaryCoupleIds(ids: [string, string]): Promise<void> {
    this.inMemoryCoupleIds = ids;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HouseholdRepository.COUPLE_STORAGE_KEY, JSON.stringify(ids));
    }
  }

  async deleteHousehold(id: string): Promise<void> {
    await this.database.household.delete(id);
  }

  async clear(): Promise<void> {
    await this.database.household.clear();
  }
}

export const householdRepository = new HouseholdRepository();
