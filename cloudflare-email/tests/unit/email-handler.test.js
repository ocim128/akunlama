import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleEmail } from '../../src/handlers/email.ts';

function createEnv(domain) {
    const statements = [];
    return {
        EMAIL_DOMAIN: domain,
        statements,
        DB: {
            prepare(sql) {
                const statement = { sql, run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) };
                statement.bind = vi.fn().mockReturnValue(statement);
                statements.push(statement);
                return statement;
            }
        }
    };
}

function createMessage(to, recipientHeaders, subject = 'Delivery test') {
    const raw = [
        'From: Sender <sender@example.net>',
        ...recipientHeaders,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Private delivery content'
    ].join('\r\n');
    return {
        to,
        from: 'sender@example.net',
        headers: new Headers(),
        raw: new Response(raw).body
    };
}

describe.each(['akunlama.com', 'gratis-ongkir.com'])('Email delivery to %s', domain => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        ['Bcc with another visible recipient', ['To: visible@example.net']],
        ['undisclosed recipients', ['To: undisclosed-recipients:;']],
        ['Cc delivery', ['To: visible@example.net', `Cc: actual@${domain}`]],
        ['multiple bare recipients', [`To: other@${domain}, actual@${domain}`]],
        ['multiple named recipients', [`To: Other <other@${domain}>, Actual <actual@${domain}>`]],
        ['conflicting sender-supplied recipient', [`To: Wrong inbox <wrong@${domain}>`]],
        ['missing To header', []],
        ['matching named recipient', [`To: Actual <actual@${domain}>`]]
    ])('stores %s in the envelope inbox and records only that recipient', async (_scenario, headers) => {
        const env = createEnv(domain);
        const recipient = `actual@${domain}`;

        await handleEmail(createMessage(`Actual@${domain.toUpperCase()}`, headers), env, {});

        expect(console.error).not.toHaveBeenCalled();
        expect(env.statements).toHaveLength(2);
        const [registry, email] = env.statements;
        expect(registry.sql).toContain('INSERT INTO recipient_registry');
        expect(registry.bind).toHaveBeenCalledWith(recipient, expect.any(Number), expect.any(Number), 0);
        expect(registry.run).toHaveBeenCalledOnce();
        expect(email.sql).toContain('INSERT INTO emails');
        expect(email.bind).toHaveBeenCalledWith(
            expect.any(String), recipient, 'Sender <sender@example.net>', 'Delivery test',
            '', 'Private delivery content', 'Private delivery content', expect.any(Number)
        );
        expect(email.run).toHaveBeenCalledOnce();
    });

    test('attributes blocked mail to the envelope recipient without storing its content', async () => {
        const env = createEnv(domain);
        env.BLOCKED_SUBJECT_KEYWORDS = 'blocked delivery';

        await handleEmail(createMessage(`actual@${domain}`, [
            `To: Wrong inbox <wrong@${domain}>`
        ], 'Blocked delivery'), env, {});

        expect(console.error).not.toHaveBeenCalled();
        expect(env.statements).toHaveLength(1);
        const [registry] = env.statements;
        expect(registry.sql).toContain('INSERT INTO recipient_registry');
        expect(registry.bind).toHaveBeenCalledWith(`actual@${domain}`, expect.any(Number), expect.any(Number), 1);
        expect(registry.run).toHaveBeenCalledOnce();
    });
});
