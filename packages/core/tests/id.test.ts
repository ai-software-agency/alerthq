import { describe, it, expect } from 'vitest';
import { generateAlertId } from '../src/utils/id.js';

describe('generateAlertId', () => {
  it('produces a 12-character hex string', () => {
    const id = generateAlertId('aws-cloudwatch', 'arn:aws:cloudwatch:us-east-1:123:alarm:test');
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic — same inputs produce same output', () => {
    const id1 = generateAlertId('manual', 'abc-123');
    const id2 = generateAlertId('manual', 'abc-123');
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different sources', () => {
    const id1 = generateAlertId('aws-cloudwatch', 'alarm-1');
    const id2 = generateAlertId('elastic-watcher', 'alarm-1');
    expect(id1).not.toBe(id2);
  });

  it('produces different IDs for different sourceIds', () => {
    const id1 = generateAlertId('manual', 'uuid-1');
    const id2 = generateAlertId('manual', 'uuid-2');
    expect(id1).not.toBe(id2);
  });

  it('handles empty strings gracefully', () => {
    const id = generateAlertId('', '');
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[0-9a-f]{12}$/);
  });
});
