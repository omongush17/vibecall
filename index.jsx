import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from "react-dom/client";
import Peer from 'peerjs';
import * as LucideIcons from 'lucide-react';

const { Video, VideoOff, Mic, MicOff, Send, PhoneOff, Copy, Share2, UserCheck } = LucideIcons;

const App = () => {
  const [myId, setMyId] = useState('');
  const [friendId, setFriendId] = useState('');
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  const streamRef = useRef(null);
  const myVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');

    if (roomFromUrl) {
      setFriendId(roomFromUrl);
      // Если зашли по ссылке, интерфейс откроется после активации камеры гостем
    }
  }, []);

  const startApp = async (idToUse, autoCallId = null) => {
    // 1. Запрашиваем камеру ТОЛЬКО после клика (важно для мобилок)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      if (myVideo.current) myVideo.current.srcObject = s;
    } catch (err) {
      console.warn("Camera blocked or not found", err);
      streamRef.current = new MediaStream();
    }

    // 2. Запускаем Peer
    const finalId = idToUse || myId;
    if (!finalId) return alert("Введите имя комнаты");

    const newPeer = new Peer(finalId.toLowerCase(), {
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
    });

    newPeer.on('open', (id) => {
      setMyId(id);
      setIsStarted(true);
      if (autoCallId) {
        setTimeout(() => connectToPartner(newPeer, autoCallId), 1000);
      }
    });

    newPeer.on('call', (call) => {
      setIsStarted(true);
      call.answer(streamRef.current);
      call.on('stream', (rs) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = rs;
      });
    });

    newPeer.on('connection', (c) => {
      setConn(c);
      setIsStarted(true);
      c.on('data', (data) => setMessages(prev => [...prev, { side: 'partner', text: data }]));
    });

    setPeer(newPeer);
  };

  const connectToPartner = (activePeer, targetId) => {
    if (!activePeer || !targetId) return;
    const call = activePeer.call(targetId, streamRef.current);
    call?.on('stream', (rs) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = rs;
    });
    const connection = activePeer.connect(targetId);
    connection.on('open', () => {
      setConn(connection);
      connection.on('data', (data) => setMessages(prev => [...prev, { side: 'partner', text: data }]));
    });
  };

  const shareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${myId}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка скопирована!");
  };

  const sendMsg = () => {
    if (conn && inputText.trim()) {
      conn.send(inputText);
      setMessages(prev => [...prev, { side: 'me', text: inputText }]);
      setInputText('');
    }
  };

  // Если в ссылке уже есть room, кнопка "Создать" превращается в "Войти"
  const urlParams = new URLSearchParams(window.location.search);
  const isGuest = !!urlParams.get('room');

  return (
    <div className="h-screen w-full bg-[#050508] text-slate-200 overflow-hidden relative font-sans select-none">
      <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
      
      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] p-6 text-center">
          <div className="max-w-xs w-full">
            <h1 className="text-4xl font-thin tracking-[0.3em] mb-12 text-indigo-400">VIBE ROOM</h1>
            <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              {!isGuest && (
                <input 
                  placeholder="Имя комнаты..." 
                  className="bg-transparent border-b border-white/20 py-3 outline-none text-center text-lg text-white" 
                  value={myId} 
                  onChange={(e) => setMyId(e.target.value.replace(/\s+/g, '-'))} 
                />
              )}
              <button 
                onClick={() => {
                  const room = urlParams.get('room');
                  if (room) {
                    const guestId = 'guest-' + Math.random().toString(36).substring(7);
                    startApp(guestId, room);
                  } else {
                    startApp();
                  }
                }} 
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 p-5 rounded-3xl font-bold text-white transition-all shadow-lg"
              >
                <UserCheck size={24} /> {isGuest ? 'ВОЙТИ В ЧАТ' : 'СОЗДАТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStarted && (
        <>
          <div className="absolute top-6 left-6 z-50 flex flex-col gap-2 pointer-events-auto">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest block">Room ID</span>
              <span className="text-sm font-mono text-white/90">{myId || '---'}</span>
            </div>
            <button onClick={shareLink} className="flex items-center gap-2 bg-white/5 active:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-[10px] text-white">
              <Share2 size={14} /> COPY LINK
            </button>
          </div>

          <div className="absolute top-6 right-6 w-32 h-24 sm:w-40 sm:h-28 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-50 bg-black">
            <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          </div>

          <div className="absolute inset-0 p-6 flex flex-col justify-end pointer-events-none">
            <div className="w-full max-w-sm pointer-events-auto flex flex-col gap-2 mb-24 max-h-[40vh] overflow-y-auto pr-2">
              {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-2xl text-sm backdrop-blur-xl border ${m.side === 'me' ? 'self-end bg-indigo-500/20 border-indigo-500/30' : 'self-start bg-white/5 border-white/10'}`}>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pointer-events-auto">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-3xl p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
                 <button className="p-3 bg-white/5 rounded-full text-white"><Mic size={20} /></button>
                 <button className="p-3 bg-white/5 rounded-full text-white"><Video size={20} /></button>
                 <div className="w-40 sm:w-64 bg-white/5 rounded-2xl px-4 flex items-center border border-white/5">
                    <input className="bg-transparent flex-1 py-3 text-xs outline-none text-white" placeholder="Message..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMsg()} />
                 </div>
                 <button onClick={() => window.location.reload()} className="p-3 bg-red-500/20 text-red-500 rounded-full"><PhoneOff size={20} /></button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
