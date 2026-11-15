import { db, OurClosetDB } from '../db';
import { FamilyMember } from '@/providers/HouseholdProvider';

export class MemberRepository {
  constructor(private database: OurClosetDB = db) {}

  async getAll(): Promise<FamilyMember[]> {
    return this.database.members.toArray();
  }

  async getById(id: string): Promise<FamilyMember | undefined> {
    return this.database.members.get(id);
  }

  async add(member: FamilyMember): Promise<string> {
    return this.database.members.put(member);
  }

  async bulkAdd(members: FamilyMember[]): Promise<void> {
    await this.database.members.bulkPut(members);
  }

  async update(id: string, updates: Partial<FamilyMember>): Promise<number> {
    return this.database.members.update(id, updates);
  }

  async remove(id: string): Promise<void> {
    await this.database.members.delete(id);
  }

  async togglePrivacy(id: string): Promise<void> {
    const member = await this.database.members.get(id);
    if (member) {
      const newPrivacy = member.privacyTier === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      await this.database.members.update(id, { privacyTier: newPrivacy });
    }
  }

  async count(): Promise<number> {
    return this.database.members.count();
  }

  async clear(): Promise<void> {
    await this.database.members.clear();
  }
}

export const memberRepository = new MemberRepository();

