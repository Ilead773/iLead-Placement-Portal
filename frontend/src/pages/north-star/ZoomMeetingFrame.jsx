import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

// ─── Session lock ──────────────────────────────────────────────────────────────
// Each mount gets a unique Symbol token. Stale async chains from previous mounts
// see their token is no longer active and abort — preventing duplicate join calls.
let activeSessionToken = null;
let zoomQueue = Promise.resolve();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function injectCSS(id, href) {
  if (document.getElementById(id)) return;
  const el = document.createElement('link');
  el.id = id; el.rel = 'stylesheet'; el.href = href;
  document.head.appendChild(el);
}

function removeCSS(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ZoomMeetingFrame({
  meetingNumber,
  signature,
  sdkKey,
  userName,
  userEmail,
  role,
  passcode = '',
  zak = '',
  onLeave,
}) {
  // FIX: use a dedicated ref for zoomAppRoot.
  // The Zoom Embedded SDK v6 only needs zoomAppRoot — do NOT put any React
  // children inside this element; the SDK takes full ownership of it.
  const zoomRootRef = useRef(null);
  const clientRef   = useRef(null);
  const joinedRef   = useRef(false);

  const [sdkStatus, setSdkStatus] = useState('loading');
  const [errorMsg,  setErrorMsg]  = useState('');
  // FIX: wait until the DOM has painted so we can read real pixel dimensions
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (zoomRootRef.current) {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Don't attempt to join until the SDK root div has real dimensions
    if (!ready) return;

    // Guard: Detect likely simulated/mock meeting numbers (e.g. 10-digit Unix timestamps)
    const cleanMn = String(meetingNumber).replace(/\s/g, '');
    if (sdkKey === 'mock_sdk_key_for_dev' && cleanMn.length === 10 && /^\d+$/.test(cleanMn)) {
      setSdkStatus('error');
      setErrorMsg(
        'This class session is using a simulated/offline Zoom meeting ID (Unix timestamp). ' +
        'Attempting to join will fail because the meeting does not exist on Zoom\'s servers. ' +
        'Please ask the coordinator to reschedule the class with valid Zoom S2S API credentials.'
      );
      return;
    }

    const myToken = Symbol('zoom-session');
    activeSessionToken = myToken;
    const isMine = () => activeSessionToken === myToken;

    // Inject Zoom SDK CSS (no-op if already present)
    injectCSS('zoom-meetingsdk-css', '/meetingsdk-assets/css/meetingsdk.css');

    zoomQueue = zoomQueue.then(async () => {
      if (!isMine()) return;
      try {
        // Destroy any lingering state from a previous session
        try {
          if (typeof ZoomMtgEmbedded.destroyClient === 'function') {
            await ZoomMtgEmbedded.destroyClient();
          }
        } catch (_) {}

        if (!isMine()) return;

        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client;
        joinedRef.current = false;

        // FIX: read dimensions AFTER layout so we pass real pixel values to the SDK
        const el     = zoomRootRef.current;
        const width  = el?.clientWidth  || window.innerWidth;
        const height = el?.clientHeight || (window.innerHeight - 48);

        // FIX: only pass zoomAppRoot — removed incorrect "meetingSDKElement" property
        // which is not part of the Embedded SDK v6 init API.
        await client.init({
          zoomAppRoot: el,
          language: 'en-US',
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            meetingInfo: ['topic', 'host'],
            video: {
              popper: { disableDraggable: true },
              isResizable: false,
              viewSizes: {
                default: { width: width > 0 ? width : 1280, height: height > 0 ? height : 720 }
              }
            }
          },
        });

        if (!isMine()) { try { await client.leave(); } catch (_) {} return; }

        // Join — guarded so it's never called twice on the same client
        if (!joinedRef.current) {
          let joinRole = role;
          if (joinRole === 1 && !zak) {
            console.warn('[Zoom] Host role requested but no ZAK token present. Falling back to attendee role.');
            joinRole = 0;
          }

          const joinParams = {
            signature:     signature,
            // FIX: strip any spaces from meetingNumber — Zoom SDK requires plain numeric string
            meetingNumber: String(meetingNumber).replace(/\s/g, ''),
            password:      passcode,
            userName:      userName,
            // FIX: guard against null/undefined email which will cause SDK join failure
            userEmail:     userEmail || '',
            role:          joinRole,
            sdkKey:        sdkKey,
          };
          if (joinRole === 1 && zak) {
            joinParams.zak = zak;
          }
          await client.join(joinParams);
          joinedRef.current = true;
        }

        if (!isMine()) { try { await client.leave(); } catch (_) {} return; }

        setSdkStatus('joined');
        console.log('[Zoom] Joined successfully.');

        client.on('connection-change', (payload) => {
          const state = payload?.state || payload;
          if (state === 'Closed' || state === 'Fail') { if (onLeave) onLeave(); }
        });
        client.on('user-removed', () => { if (onLeave) onLeave(); });

      } catch (err) {
        if (!isMine()) return;
        console.error('[Zoom] SDK Error:', err);
        const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        setSdkStatus('error');
        setErrorMsg(msg);
      }
    });

    return () => {
      if (activeSessionToken === myToken) activeSessionToken = null;
      const capturedClient = clientRef.current;
      const wasJoined      = joinedRef.current;

      zoomQueue = zoomQueue.then(async () => {
        if (capturedClient && wasJoined) {
          try { await capturedClient.leave(); } catch (e) { console.warn('[Zoom] leave error:', e); }
        }
        try {
          if (ZoomMtgEmbedded.destroyClient) await ZoomMtgEmbedded.destroyClient();
        } catch (_) {}

        // Restore Zoom-modified styles
        try {
          document.body.style.fontFamily = '';
          document.body.style.fontSize   = '';
          document.body.style.overflow   = '';
          document.documentElement.style.fontSize   = '';
          document.documentElement.style.fontFamily = '';
          document.body.className = document.body.className.replace(/\b(zoom-|react-modal-)\S*/g, '');
        } catch (_) {}

        // Remove Zoom CSS so it doesn't leak into the rest of the app
        removeCSS('zoom-meetingsdk-css');
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, meetingNumber, signature, sdkKey, userName, userEmail, role, passcode, zak]);

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', background: '#000'
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0, padding: '0 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#111827', color: '#fff', borderBottom: '1px solid #374151',
        position: 'relative', zIndex: 10,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold' }}>
          North Star Class — Meeting&nbsp;{meetingNumber}
        </h3>
        <button onClick={onLeave} style={{
          background: '#ef4444', color: '#fff', border: 'none',
          padding: '6px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
        }}>
          Leave Meeting
        </button>
      </div>

      {/* ── Content area (SDK root + overlay) ───────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* FIX: Dedicated SDK mount point — Zoom takes full ownership of this div.
            Do NOT add any React children inside it. It uses position:absolute/inset:0
            so the SDK reads correct pixel dimensions (not flex-derived ones). */}
        <div
          ref={zoomRootRef}
          id="zoomAppRoot"
          style={{ position: 'absolute', inset: 0, background: '#111827' }}
        />

        {/* Loading / error overlay — rendered ON TOP of the SDK root via z-index */}
        {sdkStatus !== 'joined' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#111827',
          }}>
            {sdkStatus === 'loading' && (
              <>
                <style>{`@keyframes _zspin{to{transform:rotate(360deg)}}`}</style>
                <div style={{
                  width: 48, height: 48, border: '4px solid #6366f1',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: '_zspin 0.9s linear infinite', marginBottom: 18,
                }} />
                <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600, margin: 0 }}>Connecting to Zoom…</p>
                <p style={{ color: '#475569', fontSize: 12, margin: '8px 0 0' }}>Initialising embedded SDK</p>
              </>
            )}
            {sdkStatus === 'error' && (
              <div style={{
                maxWidth: 580, background: '#1f2937', border: '1px solid #dc2626',
                borderRadius: 14, padding: 28, textAlign: 'center', margin: '0 16px',
              }}>
                <p style={{ color: '#f87171', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚠ Could Not Join Meeting</p>
                <pre style={{
                  color: '#fca5a5', fontFamily: 'monospace', fontSize: 12, textAlign: 'left',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
                  background: '#111827', padding: 12, borderRadius: 8,
                }}>{errorMsg}</pre>
                <button onClick={onLeave} style={{
                  marginTop: 20, background: '#dc2626', color: '#fff', border: 'none',
                  padding: '9px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}>Close</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
