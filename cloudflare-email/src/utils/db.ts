// db.ts - Database query helpers

interface TimedEmailRow {
    id: string;
    received_at: number;
}

interface D1AllResult<T> {
    results?: T[];
}

/**
 * Query recent emails for one or more exact recipients.
 *
 * D1 can use idx_emails_recipient_time for `recipient = ? ORDER BY received_at`.
 * A single `recipient IN (...) ORDER BY received_at` can require a temp sort, so
 * multi-candidate lookups query each exact recipient separately and merge.
 */
export async function queryRecentEmailsByRecipients<T extends TimedEmailRow>(
    db: D1Database,
    selectColumns: string,
    candidates: string[],
    limit: number
): Promise<{ results: T[] }> {
    if (candidates.length === 0) {
        return { results: [] };
    }

    const queryForRecipient = async (recipient: string): Promise<T[]> => {
        const result = await db.prepare(`
            SELECT ${selectColumns}
            FROM emails
            WHERE recipient = ?
            ORDER BY received_at DESC
            LIMIT ?
        `).bind(recipient, limit).all<T>() as D1AllResult<T>;

        return result.results || [];
    };

    if (candidates.length === 1) {
        return { results: await queryForRecipient(candidates[0]) };
    }

    const rows = (await Promise.all(candidates.map(queryForRecipient))).flat();
    rows.sort((a, b) => {
        const timeDiff = b.received_at - a.received_at;
        return timeDiff !== 0 ? timeDiff : b.id.localeCompare(a.id);
    });

    return { results: rows.slice(0, limit) };
}
