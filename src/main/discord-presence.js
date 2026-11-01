'use strict';

const RPC = require('discord-rpc');

const CLIENT_ID = '1566378293899296909';
const GITHUB_URL = 'https://github.com/jsaber-irl/capri-desktop';
const BUTTONS = [{ label: 'GitHub Repository', url: GITHUB_URL }];

let rpc = null;
let connecting = false;
let startTimestamp = null;
let enabled = true;

function logRpcError(prefix, error) {
    if (error?.message === 'connection closed') return;
    console.error(`[Discord] ${prefix}:`, error);
}

async function closeClient(client) {
    try {
        await client.clearActivity();
    } catch (error) {
        logRpcError('Clear activity error', error);
    }

    try {
        await client.destroy();
    } catch (error) {
        logRpcError('Disconnect error', error);
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

    client.on('disconnected', () => {
        console.log('[Discord] RPC disconnected');
        if (rpc === client) rpc = null;
    });
    client.on('error', (error) => {
        if (enabled) logRpcError('RPC error', error);
    });
    client.on('ready', async () => {
        if (!enabled || rpc !== client) {
            await closeClient(client);
            return;
        }

        console.log('[Discord] Capri Rich Presence connected');
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
            console.log('[Discord] Rich Presence activated');
        } catch (error) {
            logRpcError('Activity error', error);
        }
    });

    try {
        await client.login({ clientId: CLIENT_ID });
    } catch (error) {
        if (enabled) logRpcError('RPC connection failed', error);
        if (rpc === client) rpc = null;
        await closeClient(client);
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
    console.log('[Discord] Capri Rich Presence stopped');
}

module.exports = {
    startDiscordPresence,
    stopDiscordPresence,
};
