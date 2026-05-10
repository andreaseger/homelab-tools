import { test, expect, describe } from 'bun:test';
import { enqueueCommand, dequeueCommands, serveCommands } from '../server/commands';

describe('commands', () => {
  describe('enqueueCommand', () => {
    test('creates queue and assigns sequence number', () => {
      enqueueCommand('d1', 'toggle');
      const cmds = dequeueCommands('d1', 0);
      expect(cmds).toHaveLength(1);
      expect(cmds[0]!.kind).toBe('toggle');
      expect(cmds[0]!.device).toBe('d1');
      expect(cmds[0]!.seq).toBeGreaterThan(0);
    });

    test('sequence numbers are globally monotonic', () => {
      enqueueCommand('d1', 'a');
      const seq1 = dequeueCommands('d1', 0)[0]!.seq;
      enqueueCommand('d2', 'b');
      const seq2 = dequeueCommands('d2', 0)[0]!.seq;
      expect(seq2).toBeGreaterThan(seq1);
    });
  });

  describe('dequeueCommands', () => {
    test('returns all commands with since=0', () => {
      enqueueCommand('d3', 'x');
      enqueueCommand('d3', 'y');
      const cmds = dequeueCommands('d3', 0);
      expect(cmds.length).toBeGreaterThanOrEqual(2);
    });

    test('returns only commands with seq > since', () => {
      enqueueCommand('d4', 'first');
      const firstSeq = dequeueCommands('d4', 0).find((c) => c.kind === 'first')!.seq;
      enqueueCommand('d4', 'second');
      const later = dequeueCommands('d4', firstSeq);
      expect(later.some((c) => c.kind === 'first')).toBe(false);
      expect(later.some((c) => c.kind === 'second')).toBe(true);
    });

    test('returns empty array for unknown device', () => {
      expect(dequeueCommands('nonexistent', 0)).toEqual([]);
    });
  });

  describe('serveCommands', () => {
    test('returns Response with commands and nextSince', () => {
      enqueueCommand('d5', 'test');
      const res = serveCommands('d5', 0);
      expect(res.status).toBe(200);
    });

    test('returns empty commands with nextSince=since when no new commands', () => {
      const res = serveCommands('d5', 999999);
      expect(res.status).toBe(200);
    });
  });
});
