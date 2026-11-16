import { describe, it, expect, beforeEach } from 'vitest';
import {
  joinHouseholdByInvite,
  resetInviteRateLimit,
  MAX_INVITE_ATTEMPTS,
} from '@/features/household/services/householdService';
import { householdRepository } from '@/data/repositories/householdRepository';

describe('Household Invite Code Rate Limiting (F-10 / LIM-007)', () => {
  const testClientId = 'rate-limit-test-device';

  beforeEach(async () => {
    resetInviteRateLimit(testClientId);
    await householdRepository.clear();
  });

  it('allows failed attempts up to the threshold', async () => {
    for (let i = 0; i < MAX_INVITE_ATTEMPTS - 1; i++) {
      await expect(
        joinHouseholdByInvite('WRONG_CODE', 'user-1', 'User', 'partner', testClientId)
      ).rejects.toThrow('Invalid invite code. Household not found.');
    }
  });

  it('locks out after 5 consecutive failed attempts', async () => {
    // 5 failures
    for (let i = 0; i < MAX_INVITE_ATTEMPTS; i++) {
      try {
        await joinHouseholdByInvite('WRONG_CODE', 'user-1', 'User', 'partner', testClientId);
      } catch {
        // Expected
      }
    }

    // 6th attempt should be blocked by rate limiter
    await expect(
      joinHouseholdByInvite('ANY_CODE', 'user-1', 'User', 'partner', testClientId)
    ).rejects.toThrow(/Too many failed invite code attempts/i);
  });
});

