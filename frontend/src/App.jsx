import { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [showPopup, setShowPopup] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showError, setShowError] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isSpeakingState, setIsSpeakingState] = useState(false);

  // Initialize ElevenLabs conversation
  const conversation = useConversation({
    micMuted: isSpeakingState,
    onConnect: () => {
      setIsConnected(true);
    },
    onDisconnect: () => {
      setIsConnected(false);
    },
    onError: () => {
      setIsConnected(false);
    },
    onMessage: (message) => {
      // Handle different message types
      if (message.type === 'user_transcript') {
        setUserTranscript(message.user_transcription_event?.user_transcript || '');
      } else if (message.type === 'agent_response') {
        setAgentResponse(message.agent_response_event?.agent_response || '');
      }
    }
  });

  // Get agent ID from environment variable
  useEffect(() => {
    const envAgentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
    if (envAgentId) {
      setAgentId(envAgentId);
    }
  }, []);

  // Sync isSpeaking state for microphone muting
  const { isSpeaking } = conversation;
  useEffect(() => {
    setIsSpeakingState(isSpeaking);
  }, [isSpeaking]);

  const handleAnswerSubmit = () => {
    if (userAnswer.toLowerCase().trim() === 'gasolina') {
      setIsAuthenticated(true);
      setShowPopup(false);
      setShowError(false);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit();
    }
  };

  const handleBlobClick = async () => {
    if (!agentId || !isAuthenticated) return;

    if (isConnected) {
      await conversation.endSession();
      // Clear transcripts when ending conversation
      setUserTranscript('');
      setAgentResponse('');
    } else {
      try {
        // Clear previous transcripts when starting new conversation
        setUserTranscript('');
        setAgentResponse('');
        
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({
          agentId: agentId,
          connectionType: 'websocket', // Try websocket instead of webrtc
        });
      } catch (err) {
        console.error('Failed to start conversation:', err);
      }
    }
  };

  const handleSendText = () => {
    if (!textInput.trim() || !isConnected) return;
    
    // Send text message to agent
    conversation.sendUserMessage(textInput);
    
    // Update transcript display
    setUserTranscript(textInput);
    
    // Clear input
    setTextInput('');
  };

  const handleTextKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      {/* Fun Popup */}
      {showPopup && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-950 via-red-900 to-red-800 p-8 rounded-3xl shadow-2xl shadow-red-900/50 border border-red-800/30 max-w-md mx-4">
            <div className="text-center space-y-6">
              <div className="text-2xl font-light text-red-100">
                hey there
              </div>
              
              <div className="text-red-200 leading-relaxed">
                before we chat, quick question - what song do i have on repeat?
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="your guess..."
                  className="w-full px-4 py-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-100 placeholder-red-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  autoFocus
                />
                
                <button
                  onClick={handleAnswerSubmit}
                  className="w-full py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-red-100 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-800/30"
                >
                  let's go
                </button>
              </div>
              
              {showError && (
                <div className="text-red-300 text-sm">
                  nope, try again
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status indicator - listening or speaking */}
      {isAuthenticated && isConnected && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="text-red-300/60 text-sm font-light">
            {isSpeaking ? 'speaking...' : 'listening...'}
          </div>
        </div>
      )}

      {/* Transcript Display - only when authenticated and connected */}
      {isAuthenticated && isConnected && (userTranscript || agentResponse) && (
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

      {/* Text Input - only when authenticated and connected */}
      {isAuthenticated && isConnected && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-40">
          <div className="flex items-center gap-2 bg-red-950/90 backdrop-blur-sm p-3 rounded-2xl shadow-2xl shadow-red-900/30 border border-red-800/30">
            <input
              type="text"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                conversation.sendUserActivity();
              }}
              onKeyPress={handleTextKeyPress}
              placeholder={isSpeaking ? "agent is speaking..." : "type to chat..."}
              disabled={isSpeaking}
              className="flex-1 bg-transparent border-none text-red-100 placeholder-red-400/50 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isSpeaking}
              className="px-4 py-2 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 disabled:from-red-900 disabled:to-red-800 disabled:opacity-50 text-red-100 rounded-xl text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed"
            >
              send
            </button>
          </div>
        </div>
      )}

      {/* The Blob - only interactive when authenticated */}
      <div 
        onClick={handleBlobClick}
        className={`relative w-64 h-64 rounded-full transition-all duration-500 ease-in-out ${
          !isAuthenticated 
            ? 'bg-gradient-to-br from-red-950/50 via-red-900/50 to-red-800/50 cursor-not-allowed opacity-50'
            : isSpeaking 
              ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-700 shadow-2xl shadow-red-900/50 animate-pulse scale-110 cursor-pointer' 
              : isConnected 
                ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-700 shadow-xl shadow-red-900/30 scale-105 cursor-pointer' 
                : 'bg-gradient-to-br from-red-950 via-red-900 to-red-800 shadow-lg shadow-red-950/20 hover:scale-105 cursor-pointer'
        }`}
      >
        {/* Subtle outer glow ring - only when authenticated */}
        {isAuthenticated && (
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isConnected 
              ? 'ring-2 ring-red-700/30 ring-offset-4 ring-offset-black' 
              : 'ring-1 ring-red-900/20 ring-offset-2 ring-offset-black'
          }`}></div>
        )}
        
        {/* Smile when connected - subtle visual cue */}
        {isAuthenticated && isConnected && !isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-red-200/60 text-6xl font-light select-none">
              :)
            </div>
          </div>
        )}
        
        {/* Inner subtle animation when speaking */}
        {isSpeaking && isAuthenticated && (
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-red-800 to-red-700 animate-ping opacity-75"></div>
        )}
      </div>
    </div>
  );
};

export default App;