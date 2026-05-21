import { describe, expect, test } from 'vitest';
import { queryRecentEmailsByRecipients } from '../../src/utils/db.ts';

function createMockDb(rowsByRecipient) {
    const calls = [];

    return {
        calls,
        db: {
            prepare(sql) {
                calls.push({ sql, binds: [] });
                const call = calls[calls.length - 1];

                return {
                    bind(...values) {
                        call.binds = values;

                        return {
                            async all() {
                                return { results: rowsByRecipient[values[0]] || [] };
                            }
                        };
                    }
                };
            }
        }
    };
}

describe('DB helpers', () => {
    test('uses exact recipient equality for recent email lookups', async () => {
        const { db, calls } = createMockDb({
            'user@example.com': [{ id: 'a', received_at: 10 }]
        });

        const result = await queryRecentEmailsByRecipients(
            db,
            'id, received_at',
            ['user@example.com'],
            50
        );

        expect(result.results).toEqual([{ id: 'a', received_at: 10 }]);
        expect(calls).toHaveLength(1);
        expect(calls[0].sql).toContain('WHERE recipient = ?');
        expect(calls[0].sql).not.toContain(' IN ');
        expect(calls[0].binds).toEqual(['user@example.com', 50]);
    });

    test('queries each recipient separately and merges by newest first', async () => {
        const { db, calls } = createMockDb({
            'user@other.com': [
                { id: 'older', received_at: 20 },
                { id: 'oldest', received_at: 10 }
            ],
            'user@example.com': [
                { id: 'newest', received_at: 30 }
            ]
        });

        const result = await queryRecentEmailsByRecipients(
            db,
            'id, received_at',
            ['user@other.com', 'user@example.com'],
            2
        );

        expect(calls).toHaveLength(2);
        expect(calls.every(call => call.sql.includes('WHERE recipient = ?'))).toBe(true);
        expect(result.results).toEqual([
            { id: 'newest', received_at: 30 },
            { id: 'older', received_at: 20 }
        ]);
    });

    test('returns an empty result without querying for empty candidates', async () => {
        const { db, calls } = createMockDb({});

        const result = await queryRecentEmailsByRecipients(db, 'id, received_at', [], 50);

        expect(result.results).toEqual([]);
        expect(calls).toHaveLength(0);
    });
});
