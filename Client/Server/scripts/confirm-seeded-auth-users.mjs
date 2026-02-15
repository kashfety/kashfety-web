import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from common locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/Server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Kashfety#2026';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

function parseArgs() {
    const args = process.argv.slice(2);
    const flags = {
        execute: args.includes('--execute'),
        yes: args.includes('--yes'),
        allUsers: args.includes('--all-users'),
        includeAdmin: args.includes('--include-admin'),
        resetPassword: args.includes('--reset-password'),
        domain: undefined,
        password: DEFAULT_PASSWORD
    };

    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--domain') {
            flags.domain = args[i + 1]?.trim()?.toLowerCase();
            i += 1;
        } else if (args[i] === '--password') {
            flags.password = args[i + 1] || DEFAULT_PASSWORD;
            i += 1;
        }
    }

    return flags;
}

async function listAllAuthUsers() {
    let page = 1;
    const perPage = 200;
    const users = [];

    for (; ;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(`Failed listing auth users: ${error.message}`);

        const pageUsers = data?.users || [];
        users.push(...pageUsers);

        if (pageUsers.length < perPage) break;
        page += 1;
    }

    return users;
}

function isSeededEmail(email) {
    if (!email) return false;
    const value = email.toLowerCase();

    if (value.startsWith('seed-')) return true;
    if (value.startsWith('center-admin-')) return true;
    if (/^(doctor|patient|center|admin)\d+@kashfety\.com$/.test(value)) return true;

    return false;
}

function isDomainEmail(email, domain) {
    if (!email || !domain) return false;
    const normalizedDomain = domain.startsWith('@') ? domain : `@${domain}`;
    return email.toLowerCase().endsWith(normalizedDomain.toLowerCase());
}

async function getPublicUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('id, uid, email, role');

    if (error) throw new Error(`Failed reading public users: ${error.message}`);
    return data || [];
}

function buildTargets(users, flags) {
    let targets = users.filter((u) => !!u.email);

    if (!flags.includeAdmin) {
        targets = targets.filter((u) => u.role !== 'admin' && u.role !== 'super_admin');
    }

    if (flags.allUsers) {
        return targets;
    }

    if (flags.domain) {
        return targets.filter((u) => isDomainEmail(u.email, flags.domain));
    }

    return targets.filter((u) => isSeededEmail(u.email));
}

function toMapByEmail(authUsers) {
    const map = new Map();
    for (const user of authUsers) {
        if (!user.email) continue;
        map.set(user.email.toLowerCase(), user);
    }
    return map;
}

function toMapById(authUsers) {
    const map = new Map();
    for (const user of authUsers) {
        map.set(user.id, user);
    }
    return map;
}

async function updatePublicUid(userId, uid, execute) {
    if (!execute) return true;

    const { error } = await supabase
        .from('users')
        .update({ uid })
        .eq('id', userId);

    if (error) throw new Error(`Failed syncing users.uid for user ${userId}: ${error.message}`);
    return true;
}

async function updatePublicEmailVerified(userId, execute) {
    if (!execute) return false;

    const { error } = await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('id', userId);

    if (!error) return true;

    const msg = (error.message || '').toLowerCase();
    if (msg.includes('column') && msg.includes('email_verified')) {
        return false;
    }

    return false;
}

async function createOrUpdateAuth(target, matchedAuthUser, flags) {
    const metadata = {
        ...(matchedAuthUser?.user_metadata || {}),
        role: target.role,
        email: target.email,
        seeded: true
    };

    if (matchedAuthUser) {
        if (!flags.execute) return { id: matchedAuthUser.id, action: 'updated' };

        const updatePayload = {
            email: target.email,
            email_confirm: true,
            user_metadata: metadata
        };

        if (flags.resetPassword) {
            updatePayload.password = flags.password;
        }

        const { data, error } = await supabase.auth.admin.updateUserById(matchedAuthUser.id, updatePayload);
        if (error) throw new Error(`Failed updating auth user ${target.email}: ${error.message}`);

        return { id: data.user.id, action: 'updated' };
    }

    if (!flags.execute) {
        return { id: target.uid || 'dry-run-created', action: 'created' };
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email: target.email,
        password: flags.password,
        email_confirm: true,
        user_metadata: metadata
    });

    if (error) throw new Error(`Failed creating auth user ${target.email}: ${error.message}`);

    return { id: data.user.id, action: 'created' };
}

async function main() {
    const flags = parseArgs();

    console.log('Kashfety auth seeded-user confirmation utility');
    console.log(`Supabase project: ${SUPABASE_URL}`);

    if (flags.execute && !flags.yes) {
        console.error('Refusing execute mode without --yes.');
        process.exit(1);
    }

    const publicUsers = await getPublicUsers();
    const targets = buildTargets(publicUsers, flags);

    console.log(`Mode: ${flags.execute ? 'execute' : 'dry-run'}`);
    console.log(`Targeting ${targets.length} public.users rows`);
    console.log(`Filters -> allUsers=${flags.allUsers}, domain=${flags.domain || 'none'}, includeAdmin=${flags.includeAdmin}`);

    if (!targets.length) {
        console.log('No matching users found. Nothing to do.');
        return;
    }

    const authUsers = await listAllAuthUsers();
    const authById = toMapById(authUsers);
    const authByEmail = toMapByEmail(authUsers);

    const summary = {
        targets: targets.length,
        authUpdated: 0,
        authCreated: 0,
        uidSynced: 0,
        skipped: 0,
        emailVerifiedMarked: 0
    };

    for (const target of targets) {
        try {
            const foundByUid = target.uid ? authById.get(target.uid) : null;
            const foundByEmail = authByEmail.get(target.email.toLowerCase());
            const matchedAuthUser = foundByUid || foundByEmail || null;

            const result = await createOrUpdateAuth(target, matchedAuthUser, flags);

            if (result.action === 'updated') summary.authUpdated += 1;
            if (result.action === 'created') summary.authCreated += 1;

            const resolvedAuthId = result.id;
            if (resolvedAuthId && target.uid !== resolvedAuthId) {
                await updatePublicUid(target.id, resolvedAuthId, flags.execute);
                summary.uidSynced += 1;
            }

            const marked = await updatePublicEmailVerified(target.id, flags.execute);
            if (marked) summary.emailVerifiedMarked += 1;

            if (!flags.execute) {
                const op = matchedAuthUser ? 'would-update' : 'would-create';
                const uidSync = target.uid !== resolvedAuthId ? ' + uid-sync' : '';
                console.log(`- ${op} auth for ${target.email}${uidSync}`);
            } else {
                const op = matchedAuthUser ? 'updated' : 'created';
                const uidSync = target.uid !== resolvedAuthId ? ' + uid-synced' : '';
                console.log(`- ${op} auth for ${target.email}${uidSync}`);
            }
        } catch (error) {
            summary.skipped += 1;
            console.log(`- skipped ${target.email}: ${error.message || error}`);
        }
    }

    console.log('\nSummary:');
    console.log(`- targets: ${summary.targets}`);
    console.log(`- auth updated: ${summary.authUpdated}`);
    console.log(`- auth created: ${summary.authCreated}`);
    console.log(`- users.uid synced: ${summary.uidSynced}`);
    console.log(`- users.email_verified marked true: ${summary.emailVerifiedMarked}`);
    console.log(`- skipped: ${summary.skipped}`);

    if (!flags.execute) {
        console.log('\nDry-run complete. Re-run with --execute --yes to apply changes.');
    }
}

main().catch((error) => {
    console.error('\nAuth confirmation run failed:', error.message || error);
    process.exit(1);
});
