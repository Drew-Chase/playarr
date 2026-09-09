import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import QRCode from 'react-native-qrcode-svg';
import { C, F, px } from '../theme';
import { Grad } from '../ui';
import {
  checkPlexPin,
  createPlexPin,
  isConfigured,
  loadConfig,
  resolveCompositeToken,
  saveConfig,
  type PlexPinData,
} from '../config';
import { startSetupServer, type PinSnapshot, type SetupResult } from '../setup/server';
import { configureApi } from '../api/client';

const PORT = 65267;

async function localIp(): Promise<string | null> {
  try {
    const state = await NetInfo.fetch();
    const d = state.details as { ipAddress?: string } | null;
    return d?.ipAddress ?? null;
  } catch {
    return null;
  }
}

export function PairScreen({ onDone }: { onDone: () => void }) {
  const [ip, setIp] = useState<string | null>(null);
  const [pin, setPin] = useState<PlexPinData | null>(null);
  const [status, setStatus] = useState<'starting' | 'waiting' | 'linked' | 'error'>('starting');
  const [error, setError] = useState<string | null>(null);
  const clientIdRef = useRef<string>('');
  const aliveRef = useRef(true);
  const pinRef = useRef<PlexPinData | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const handleSetup = useCallback(async (serverUrl: string, rawToken: string): Promise<SetupResult> => {
    try {
      const clean = serverUrl.replace(/\/+$/, '');
      const composite = await resolveCompositeToken(clientIdRef.current, rawToken);
      const res = await fetch(`${clean}/api/auth/user`, {
        headers: { Accept: 'application/json', Cookie: `plex_user_token=${composite}` },
      });
      if (!res.ok) throw new Error('The server rejected your Plex token. Check the URL and your account access.');
      await saveConfig(clean, composite);
      configureApi(clean, composite);
      return { success: true, serverName: 'Playarr' };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Could not connect to the Playarr server.' };
    }
  }, []);

  const createPin = useCallback(async (): Promise<boolean> => {
    try {
      const p = await createPlexPin(clientIdRef.current);
      pinRef.current = p;
      setPin(p);
      setStatus('waiting');
      setError(null);
      return true;
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Failed to reach plex.tv');
      return false;
    }
  }, []);

  const createPinWithRetry = useCallback(async () => {
    let delay = 5000;
    while (aliveRef.current) {
      if (await createPin()) return;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 60000);
    }
  }, [createPin]);

  useEffect(() => {
    let stopServer: (() => void) | null = null;
    aliveRef.current = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const cfg = await loadConfig();
      if (isConfigured(cfg)) {
        configureApi(cfg.serverUrl, cfg.authToken);
        doneRef.current();
        return;
      }
      clientIdRef.current = cfg.clientId;
      setIp(await localIp());
      stopServer = startSetupServer({
        port: PORT,
        getPin: (): PinSnapshot => ({
          clientId: clientIdRef.current,
          pinId: pinRef.current?.id ?? null,
          code: pinRef.current?.code ?? null,
        }),
        onSetup: (serverUrl, rawToken) =>
          handleSetup(serverUrl, rawToken).then((result) => {
            if (result.success) {
              setStatus('linked');
              if (timer) clearInterval(timer);
              setTimeout(() => doneRef.current(), 1200);
            }
            return result;
          }),
      });
      void createPinWithRetry();

      timer = setInterval(async () => {
        const current = pinRef.current;
        if (!current || !aliveRef.current) return;
        try {
          const check = await checkPlexPin(clientIdRef.current, current.id);
          if (!aliveRef.current) return;
          if (check.authToken) {
            pinRef.current = { ...current, authToken: check.authToken };
            setPin(pinRef.current);
            setStatus('linked');
            if (timer) clearInterval(timer);
          }
        } catch {
          void createPinWithRetry();
        }
      }, 2000);
    })();

    return () => {
      aliveRef.current = false;
      if (timer) clearInterval(timer);
      if (stopServer) stopServer();
    };
  }, [createPin, handleSetup]);

  const url = ip ? `http://${ip}:${PORT}` : null;
  const code = pin?.code ?? null;

  const statusLine =
    status === 'starting'
      ? 'Preparing pairing…'
      : status === 'waiting'
        ? 'Waiting for you to link Plex on your phone…'
        : status === 'linked'
          ? 'Plex linked — finishing setup…'
          : 'Something went wrong.';

  return (
    <View style={{ flex: 1, backgroundColor: C.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
      <Grad art={['#0b3d2c', '#07160f', '#050607']} deg={155} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.55 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(70), paddingHorizontal: px(90) }}>
        <View style={{ flex: 1, maxWidth: px(760) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
            <View style={{ width: px(56), height: px(56), borderRadius: px(28), backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.ink, fontSize: px(24) }}>▶</Text>
            </View>
            <Text style={{ fontFamily: F.head, fontSize: px(40), color: C.text, letterSpacing: -px(1) }}>
              Setup <Text style={{ color: C.accent }}>Playarr</Text> TV
            </Text>
          </View>

          <Text style={{ fontSize: px(21), lineHeight: px(33), color: C.textDim, marginTop: px(30) }}>
            Open the address or scan the code with your phone, then link your Plex account and enter your Playarr
            server URL. The TV does the rest.
          </Text>

          <View style={{ gap: px(16), marginTop: px(34) }}>
            {[
              { n: '1', t: 'Scan the QR code or open the address on your phone' },
              { n: '2', t: 'Visit plex.tv/link and enter the code shown here' },
              { n: '3', t: 'Enter your Playarr server URL and complete setup' },
            ].map((s) => (
              <View key={s.n} style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
                <View style={{ width: px(34), height: px(34), borderRadius: px(17), backgroundColor: 'rgba(0,212,116,.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.accent, fontWeight: '700', fontSize: px(16) }}>{s.n}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: px(17), color: C.textDim }}>{s.t}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: px(16), marginTop: px(36), color: status === 'error' ? '#ff8a80' : status === 'linked' ? C.accentSoft : C.textMut }}>
            {status === 'error' ? error || statusLine : statusLine}
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: px(24) }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: px(20),
              padding: px(24),
              boxShadow: '0 30px 80px rgba(0,0,0,.6)' as never,
            }}
          >
            {url ? (
              <QRCode value={url} size={px(300)} color="#07080a" backgroundColor="#ffffff" />
            ) : (
              <View style={{ width: px(300), height: px(300) }} />
            )}
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: px(14), color: C.textMut, letterSpacing: px(1), textTransform: 'uppercase' }}>
              Or open on your phone
            </Text>
            <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.accentSoft, marginTop: px(6) }}>
              {url ?? 'waiting for network…'}
            </Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: px(10) }}>
            <Text style={{ fontSize: px(14), color: C.textMut, letterSpacing: px(1), textTransform: 'uppercase' }}>
              Plex code
            </Text>
            <Text
              numberOfLines={2}
              style={{
                fontFamily: F.black,
                fontSize: (code ?? '').length > 6 ? px(30) : px(72),
                letterSpacing: (code ?? '').length > 6 ? px(4) : px(14),
                color: C.text,
                marginTop: px(6),
                textAlign: 'center',
                maxWidth: px(560),
              }}
            >
              {code ?? '······'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
