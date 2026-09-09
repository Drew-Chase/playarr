import AsyncStorage from '@react-native-async-storage/async-storage';
import { request as plexRequest } from './api/plexAuth';

const K_SERVER = 'playarr.serverUrl';
const K_TOKEN = 'playarr.authToken';
const K_CLIENT = 'playarr.clientId';

export interface AppConfig {
  serverUrl: string | null;
  authToken: string | null;
  clientId: string;
}

let cached: AppConfig | null = null;

export async function randomId(): Promise<string> {
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;
  const [serverUrl, authToken, clientId] = await Promise.all([
    AsyncStorage.getItem(K_SERVER),
    AsyncStorage.getItem(K_TOKEN),
    AsyncStorage.getItem(K_CLIENT),
  ]);
  cached = {
    serverUrl: serverUrl || null,
    authToken: authToken || null,
    clientId: clientId || (await randomId()),
  };
  if (!clientId) await AsyncStorage.setItem(K_CLIENT, cached.clientId);
  return cached;
}

export async function saveConfig(serverUrl: string, authToken: string): Promise<AppConfig> {
  const cfg = await loadConfig();
  cached = { ...cfg, serverUrl, authToken };
  await AsyncStorage.setItem(K_SERVER, serverUrl);
  await AsyncStorage.setItem(K_TOKEN, authToken);
  return cached;
}

export async function clearConfig(): Promise<void> {
  cached = null;
  await AsyncStorage.multiRemove([K_SERVER, K_TOKEN]);
}

export function isConfigured(cfg: AppConfig): boolean {
  return !!cfg.serverUrl && !!cfg.authToken;
}

export function plexHeaders(clientId: string): Record<string, string> {
  return {
    'X-Plex-Client-Identifier': clientId,
    'X-Plex-Product': 'Playarr',
    'X-Plex-Version': '1.0.0',
    'X-Plex-Platform': 'Android',
    'X-Plex-Device': 'Android TV',
    'X-Plex-Device-Name': 'Playarr TV',
    Accept: 'application/json',
  };
}

export interface PlexPinData {
  id: number;
  code: string;
  authToken: string | null;
  expiresAt?: string | null;
}

export async function createPlexPin(clientId: string): Promise<PlexPinData> {
  return plexRequest<PlexPinData>('https://plex.tv/api/v2/pins', {
    method: 'POST',
    headers: { ...plexHeaders(clientId), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'strong=false',
  });
}

export async function checkPlexPin(clientId: string, pinId: number): Promise<PlexPinData> {
  return plexRequest<PlexPinData>(`https://plex.tv/api/v2/pins/${pinId}`, {
    method: 'GET',
    headers: plexHeaders(clientId),
  });
}

export async function resolveCompositeToken(clientId: string, rawToken: string): Promise<string> {
  const user = await plexRequest<{ id: number }>('https://plex.tv/api/v2/user', {
    method: 'GET',
    headers: { ...plexHeaders(clientId), 'X-Plex-Token': rawToken },
  });
  const userId = user?.id ?? 0;
  return `${userId}:${rawToken}:${rawToken}`;
}
