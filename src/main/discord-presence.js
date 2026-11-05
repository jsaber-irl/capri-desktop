'use strict';

const CLIENT_ID = '1566378293899296909';
const GITHUB_URL = 'https://github.com/jsaber-irl/capri-desktop';
const BUTTONS = [{ label: 'GitHub Repository', url: GITHUB_URL }];

function logRpcError(prefix, error, logger = console) {
    if (error?.message === 'connection closed') return;
    // Discord n'est pas lancé ou pas accessible : pas une erreur de Capri, pas la peine de la signaler
    if (!error?.message) return;
    const msg = error.message;
    if (msg.includes("Cannot read properties of null") || msg.includes('Could not connect')) return;
    logger.error(`[Discord] ${prefix}:`, error);
}

function createDiscordPresence({ RPC, logger = console, clientId = CLIENT_ID } = {}) {
    if (!RPC?.Client) throw new TypeError('A Discord RPC client factory is required.');

    let rpc = null;
    let connecting = false;
    let startTimestamp = null;
    let enabled = true;

    async function closeClient(client) {
    try {
        await client.clearActivity();
    } catch (error) {
        logRpcError('Clear activity error', error, logger);
    }

    try {
        await client.destroy();
    } catch (error) {
        logRpcError('Disconnect error', error, logger);
    }
    }

    async function startDiscordPresence({
    details = 'Improving Capri',
    state = 'Your personal AI assistant',
} = {}) {
    enabled = true;

    if (rpc || connecting) return;

    connecting = true;
    const client = new RPC.Client({ transport: 'ipc' });
    rpc = client;
    startTimestamp = new Date();
    let ready = false;

    client.on('disconnected', () => {
        console.log('[Discord] RPC disconnected');
        if (rpc === client) rpc = null;
    });
    client.on('error', (error) => {
        if (enabled) logRpcError('RPC error', error, logger);
    });
    client.on('ready', async () => {
        ready = true;
        if (!enabled || rpc !== client) {
            await closeClient(client);
            return;
        }

        logger.log('[Discord] Capri Rich Presence connected');
        try {
            await client.setActivity({
                details,
                state,
                largeImageKey: 'capri',
                largeImageText: 'Capri AI Assistant',
                startTimestamp,
                buttons: BUTTONS,
                instance: false,
            });
            logger.log('[Discord] Rich Presence activated');
        } catch (error) {
            logRpcError('Activity error', error, logger);
        }
    });

    try {
        await client.login({ clientId });
    } catch (error) {
        if (enabled) logRpcError('RPC connection failed', error, logger);
        if (rpc === client) rpc = null;
        // le client n'est jamais devenu ready : pas d'activité à effacer, juste détruire
        if (ready) {
            await closeClient(client);
        } else {
            try { await client.destroy(); } catch { /* transport déjà fermé */ }
        }
    } finally {
        connecting = false;
    }
    }

    async function stopDiscordPresence() {
    enabled = false;
    const client = rpc;
    rpc = null;
    startTimestamp = null;

    if (!client) return;

    await closeClient(client);
    logger.log('[Discord] Capri Rich Presence stopped');
    }

    return {
        startDiscordPresence,
        stopDiscordPresence,
        isConnected: () => Boolean(rpc),
    };
}

const presence = createDiscordPresence({ RPC: require('discord-rpc') });

module.exports = {
    ...presence,
    createDiscordPresence,
};
