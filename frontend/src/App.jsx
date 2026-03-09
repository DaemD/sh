import { useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';

const AUTH_TOKEN_KEY = 'shumail_auth_token';

const App = () => {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [authStep, setAuthStep] = useState('email');
  const [authEmail, setAuthEmail] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [agentId, setAgentId] = useState('');
  const [configError, setConfigError] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [windowHint, setWindowHint] = useState('');

  const conversation = useConversation({
    micMuted: isSpeakingState,
    onConnect: () => setWindowHint(''),
    onDisconnect: () => {},
    onError: (message) => {
      setWindowHint(message || 'Connection error');
      setTimeout(() => setWindowHint(''), 4000);
    },
    onMessage: (message) => {
      if (message.type === 'user_transcript') {
        setUserTranscript(message.user_transcription_event?.user_transcript || '');
      } else if (message.type === 'agent_response') {
        setAgentResponse(message.agent_response_event?.agent_response || '');
      }
    },
  });

  const { isSpeaking, status } = conversation;
  const windowOpen = status === 'connected';
  useEffect(() => {
    setIsSpeakingState(isSpeaking);
  }, [isSpeaking]);

  const fetchConfig = () => {
    if (!authToken) return;
    setConfigError('');
    setConfigLoading(true);
    const headers = { Authorization: `Bearer ${authToken}` };
    fetch('/api/config', { headers })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
          return null;
        }
        if (!res.ok) {
          setConfigError('Could not load voice agent');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.agentId) {
          setAgentId(data.agentId);
          setConfigError('');
        }
      })
      .catch(() => setConfigError('Network error'))
      .finally(() => setConfigLoading(false));
  };

  useEffect(() => {
    if (authToken) fetchConfig();
  }, [authToken]);

  const handleBlobClick = async () => {
    if (!agentId) {
      fetchConfig();
      return;
    }

    if (status === 'connected') {
      await conversation.endSession();
      setUserTranscript('');
      setAgentResponse('');
    } else {
      try {
        setUserTranscript('');
        setAgentResponse('');
        setWindowHint('connecting...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const headers = { Authorization: `Bearer ${authToken}` };
        const res = await fetch('/api/convai/signed-url', { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Could not get connection');
        }
        const { signedUrl } = await res.json();
        if (!signedUrl) throw new Error('No signed URL');
        await conversation.startSession({
          signedUrl,
          connectionType: 'websocket',
        });
        setWindowHint('');
      } catch (err) {
        console.error('Failed to start conversation:', err);
        setWindowHint(err.message || 'Could not connect');
        setTimeout(() => setWindowHint(''), 2200);
      }
    }
  };

  const speakingNow = isSpeaking;

  const handleRequestOtp = async () => {
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthError('Enter your email');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || 'Failed to send OTP');
        return;
      }
      setAuthEmail(email);
      setAuthStep('otp');
      setAuthOtp('');
    } catch (e) {
      setAuthError('Network error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = authOtp.trim();
    if (!otp) {
      setAuthError('Enter the code');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || 'Invalid code');
        return;
      }
      const token = data.token;
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        setAuthToken(token);
        setAuthStep('email');
        setAuthEmail('');
        setAuthOtp('');
      }
    } catch (e) {
      setAuthError('Network error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (status === 'connected') conversation.endSession();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setAuthStep('email');
    setAuthEmail('');
    setAuthOtp('');
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_18%,rgba(110,170,255,0.18)_0%,rgba(16,18,28,0.88)_52%,rgba(0,0,0,1)_100%)]" />
        <div className="relative z-10 w-full max-w-sm mx-4">
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">
            <h2 className="text-white/90 text-xl font-light mb-6 text-center">
              {authStep === 'email' ? 'Sign in' : 'Enter code'}
            </h2>
            {authStep === 'email' ? (
              <>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/20 mb-4"
                  disabled={authLoading}
                />
                <button
                  onClick={handleRequestOtp}
                  disabled={authLoading}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition disabled:opacity-50"
                >
                  {authLoading ? 'Sending...' : 'Send code'}
                </button>
              </>
            ) : (
              <>
                <p className="text-white/60 text-sm mb-3">Code sent to {authEmail}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/20 mb-4 text-center tracking-widest"
                  disabled={authLoading}
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={authLoading}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition disabled:opacity-50 mb-2"
                >
                  {authLoading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  onClick={() => { setAuthStep('email'); setAuthOtp(''); setAuthError(''); }}
                  className="w-full py-2 text-white/60 hover:text-white/80 text-sm"
                >
                  Use different email
                </button>
              </>
            )}
            {authError && (
              <p className="mt-4 text-red-400 text-sm text-center">{authError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 z-50 text-white/50 hover:text-white/80 text-xs"
      >
        logout
      </button>
      {windowOpen && (userTranscript || agentResponse) && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-950/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xl shadow-red-900/30 border border-red-800/30 max-w-2xl mx-4 z-40">
          <div className="space-y-4">
            {userTranscript && (
              <div className="text-right">
                <div className="text-xs text-red-400 mb-1">you</div>
                <div className="text-red-100 bg-red-900/50 px-4 py-2 rounded-xl inline-block">
                  {userTranscript}
                </div>
              </div>
            )}
            {agentResponse && (
              <div className="text-left">
                <div className="text-xs text-red-400 mb-1">shumaila</div>
                <div className="text-red-100 bg-red-800/50 px-4 py-2 rounded-xl inline-block">
                  {agentResponse}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_18%,rgba(110,170,255,0.18)_0%,rgba(16,18,28,0.88)_52%,rgba(0,0,0,1)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_30%_70%,rgba(180,90,120,0.10)_0%,transparent_60%)]" />
        </div>

        <button
          type="button"
          onClick={handleBlobClick}
          disabled={configLoading}
          className={`group relative w-[92vw] h-[72vh] max-w-[1100px] max-h-[760px] rounded-[34px] border transition-all duration-500 select-none cursor-pointer border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.04] ${
            windowOpen ? 'shadow-2xl shadow-black/40' : 'shadow-xl shadow-black/30'
          }`}
          aria-label={windowOpen ? 'Close window' : 'Open window'}
        >
          <div className="absolute inset-4 rounded-[28px] border border-white/12 bg-black/25 backdrop-blur-[2px] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 opacity-70 bg-[radial-gradient(120%_100%_at_50%_30%,rgba(255,220,170,0.07)_0%,transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_60%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[28px]" />
              <div className="absolute inset-[10px] ring-1 ring-inset ring-white/5 rounded-[22px]" />
              <div className="absolute left-0 right-0 bottom-0 h-10 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.75)_100%)]" />
              <div className="absolute left-0 right-0 top-0 h-8 bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_60%,rgba(0,0,0,0.75)_100%)]" />
            </div>

            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_26%,rgba(210,235,255,0.10)_0%,rgba(10,12,20,0.86)_55%,rgba(0,0,0,1)_100%)]" />
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-[14%] top-[18%] h-[2px] w-[2px] rounded-full bg-white/75" />
                <div className="absolute left-[24%] top-[36%] h-[1px] w-[1px] rounded-full bg-white/65" />
                <div className="absolute left-[62%] top-[20%] h-[2px] w-[2px] rounded-full bg-white/65" />
                <div className="absolute left-[76%] top-[40%] h-[1px] w-[1px] rounded-full bg-white/55" />
                <div className="absolute left-[48%] top-[16%] h-[1px] w-[1px] rounded-full bg-white/55" />
                <div className="absolute left-[34%] top-[24%] h-[1px] w-[1px] rounded-full bg-sky-200/60" />
                <div className="absolute left-[70%] top-[28%] h-[1px] w-[1px] rounded-full bg-sky-200/50" />
              </div>
              <div
                className={`absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ${
                  windowOpen ? 'opacity-100 scale-100' : 'opacity-85 scale-[0.98]'
                } ${windowOpen && speakingNow ? 'animate-moon-speak' : ''}`}
                style={{
                  width: 'min(220px, 30vh)',
                  height: 'min(220px, 30vh)',
                  background: windowOpen && speakingNow
                    ? 'radial-gradient(circle at 35% 30%, rgba(255,248,235,0.98) 0%, rgba(255,235,210,0.82) 38%, rgba(255,200,140,0.18) 70%, rgba(0,0,0,0) 72%)'
                    : 'radial-gradient(circle at 35% 30%, rgba(245,252,255,0.98) 0%, rgba(210,235,255,0.82) 38%, rgba(140,200,255,0.18) 70%, rgba(0,0,0,0) 72%)',
                  boxShadow: windowOpen
                    ? speakingNow
                      ? '0 0 100px rgba(255,220,180,0.28), 0 0 40px rgba(255,200,150,0.15)'
                      : '0 0 90px rgba(180,220,255,0.22), 0 0 30px rgba(120,170,255,0.12)'
                    : '0 0 58px rgba(180,220,255,0.14)',
                }}
              >
                <div className="absolute left-[26%] top-[34%] h-4 w-4 rounded-full bg-black/10" />
                <div className="absolute left-[56%] top-[52%] h-6 w-6 rounded-full bg-black/8" />
                <div className="absolute left-[40%] top-[64%] h-3 w-3 rounded-full bg-black/7" />
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14)_0%,transparent_34%,rgba(255,255,255,0.06)_52%,transparent_72%)] opacity-30" />
                <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/10" />
                <div className="absolute left-0 top-1/2 h-[2px] w-full bg-white/9" />
              </div>
              {windowOpen && !speakingNow && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -left-[22%] top-[18%] h-[44%] w-[144%] bg-[linear-gradient(90deg,transparent,rgba(210,235,255,0.10),transparent)] blur-[1px] animate-breeze" />
                </div>
              )}
            </div>

            <div className="absolute inset-0" style={{ perspective: '1200px', perspectiveOrigin: '50% 55%' }}>
              <div
                className="absolute left-0 top-0 h-full w-1/2"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: '0% 50%',
                  transform: windowOpen ? 'rotateY(-70deg) translateZ(6px)' : 'rotateY(0deg)',
                  transition: 'transform 760ms cubic-bezier(.2,.9,.2,1)',
                }}
              >
                <div className="absolute inset-0 border-r border-white/12 bg-gradient-to-br from-[#3a2a1d] via-[#2c1f15] to-[#1a120c]" />
                <div className="absolute inset-0 opacity-55 bg-[repeating-linear-gradient(90deg,rgba(255,235,210,0.05)_0px,rgba(255,235,210,0.05)_2px,transparent_2px,transparent_10px)]" />
                <div className="absolute inset-6 rounded-[18px] ring-1 ring-inset ring-white/10 bg-black/20" />
                <div className="absolute inset-9 rounded-[14px] ring-1 ring-inset ring-white/8 bg-black/18" />
                <div className="absolute inset-2 rounded-[22px] ring-1 ring-inset ring-black/40" />
                <div className="absolute left-2 top-[18%] h-8 w-3 rounded bg-black/25 ring-1 ring-inset ring-white/10" />
                <div className="absolute left-2 top-[72%] h-8 w-3 rounded bg-black/25 ring-1 ring-inset ring-white/10" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-2 rounded-full bg-white/25" />
                <div className="absolute right-[18px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white/18" />
                <div className="absolute right-0 top-0 h-full w-[12px] bg-black/35" />
              </div>
              <div
                className="absolute right-0 top-0 h-full w-1/2"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: '100% 50%',
                  transform: windowOpen ? 'rotateY(70deg) translateZ(6px)' : 'rotateY(0deg)',
                  transition: 'transform 760ms cubic-bezier(.2,.9,.2,1)',
                }}
              >
                <div className="absolute inset-0 border-l border-white/12 bg-gradient-to-bl from-[#3a2a1d] via-[#2c1f15] to-[#1a120c]" />
                <div className="absolute inset-0 opacity-55 bg-[repeating-linear-gradient(90deg,rgba(255,235,210,0.05)_0px,rgba(255,235,210,0.05)_2px,transparent_2px,transparent_10px)]" />
                <div className="absolute inset-6 rounded-[18px] ring-1 ring-inset ring-white/10 bg-black/20" />
                <div className="absolute inset-9 rounded-[14px] ring-1 ring-inset ring-white/8 bg-black/18" />
                <div className="absolute inset-2 rounded-[22px] ring-1 ring-inset ring-black/40" />
                <div className="absolute right-2 top-[18%] h-8 w-3 rounded bg-black/25 ring-1 ring-inset ring-white/10" />
                <div className="absolute right-2 top-[72%] h-8 w-3 rounded bg-black/25 ring-1 ring-inset ring-white/10" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-2 rounded-full bg-white/25" />
                <div className="absolute left-[18px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white/18" />
                <div className="absolute left-0 top-0 h-full w-[12px] bg-black/35" />
              </div>
              <div
                className={`absolute left-1/2 top-0 h-full w-px bg-white/12 transition-opacity duration-500 ${
                  windowOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>

            {windowOpen && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-0 top-0 h-full w-[46%] opacity-85">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,18,0.92),rgba(20,22,34,0.62),transparent)]" />
                  <div className={`absolute inset-0 bg-[radial-gradient(60%_70%_at_10%_20%,rgba(255,255,255,0.10)_0%,transparent_65%)] ${!speakingNow ? 'animate-curtain-left' : ''}`} />
                  <div className="absolute left-[10%] top-0 h-full w-[18%] bg-white/5 blur-[0.5px] opacity-60" />
                  <div className="absolute left-[28%] top-0 h-full w-[14%] bg-white/4 blur-[0.5px] opacity-55" />
                </div>
                <div className="absolute right-0 top-0 h-full w-[46%] opacity-85">
                  <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(12,12,18,0.92),rgba(20,22,34,0.62),transparent)]" />
                  <div className={`absolute inset-0 bg-[radial-gradient(60%_70%_at_90%_20%,rgba(255,255,255,0.10)_0%,transparent_65%)] ${!speakingNow ? 'animate-curtain-right' : ''}`} />
                  <div className="absolute right-[10%] top-0 h-full w-[18%] bg-white/5 blur-[0.5px] opacity-60" />
                  <div className="absolute right-[28%] top-0 h-full w-[14%] bg-white/4 blur-[0.5px] opacity-55" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center">
            <div className="text-red-300/50 text-xs font-light">
              {windowHint
                ? windowHint
                : configError
                  ? 'Could not load voice agent. Tap to retry.'
                  : !agentId
                    ? (configLoading ? 'loading...' : 'tap to connect')
                    : windowOpen
                      ? 'tap to close'
                      : 'tap the window'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default App;
