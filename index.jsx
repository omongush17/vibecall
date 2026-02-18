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
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  const myVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    // Запрашиваем камеру сразу
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((s) => {
          setStream(s);
          if (myVideo.current) myVideo.current.srcObject = s;
        })
        .catch(() => setStream(new MediaStream()));
    }

    // ПРОВЕРКА: Если в ссылке уже есть ID комнаты, заходим автоматически
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setFriendId(roomFromUrl);
      const guestId = 'guest-' + Math.floor(Math.random() * 10000);
      initPeer(guestId, roomFromUrl); 
    }
  }, []);

  const initPeer = (customId, autoCallId = null) => {
    const finalId = customId || myId;
    if (!finalId.trim()) return alert("Придумай ID комнаты!");

    const newPeer = new Peer(finalId.trim(), {
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
      },
    });

    newPeer.on('open', (id) => {
      setMyId(id);
      setIsStarted(true);
      // Если это гость, он автоматически звонит хосту
      if (autoCallId) {
        setTimeout(() => startConnect(newPeer, autoCallId), 1500);
      }
    });

    newPeer.on('call', (call) => {
      setIsStarted(true);
      call.answer(stream);
      call.on('stream', (rs) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = rs;
      });
    });

    newPeer.on('connection', (c) => {
      setConn(c);
      setIsStarted(true);
      c.on('data', (data) => setMessages((prev) => [...prev, { side: 'partner', text: data }]));
    });

    setPeer(newPeer);
  };

  const startConnect = (activePeer = peer, targetId = friendId) => {
    if (!targetId || !activePeer) return;
    const call = activePeer.call(targetId, stream);
    if (call) {
      call.on('stream', (rs) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = rs;
      });
    }
    const connection = activePeer.connect(targetId);
    setConn(connection);
    connection.on('data', (data) => setMessages((prev) => [...prev, { side: 'partner', text: data }]));
  };

  const shareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${myId}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка скопирована!");
  };

  const sendMsg = () => {
    if (conn && inputText.trim()) {
      conn.send(inputText);
      setMessages((prev) => [...prev, { side: 'me', text: inputText }]);
      setInputText('');
    }
  };

  return (
    <div className="h-screen w-full bg-[#050508] text-slate-200 overflow-hidden relative font-sans">
      <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
      
      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl z-[100] p-6 text-center">
          <div className="max-w-xs animate-in fade-in zoom-in duration-500">
            <h1 className="text-4xl font-thin tracking-[0.3em] mb-12 text-indigo-400">VIBE ROOM</h1>
            <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <input 
                placeholder="Придумай имя комнаты..." 
                className="bg-transparent border-b border-white/20 py-2 outline-none text-center text-lg text-white" 
                value={myId} 
                onChange={(e) => setMyId(e.target.value.replace(/\s+/g, '-'))} 
              />
              <button onClick={() => initPeer()} className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 p-4 rounded-2xl transition-all font-bold">
                <UserCheck size={20} /> СОЗДАТЬ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 z-50 flex flex-col gap-2">
         <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest block">Room ID</span>
            <span className="text-sm font-mono text-white/90">{myId}</span>
         </div>
         <button onClick={shareLink} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-[10px] transition-all">
            <Share2 size={14} /> COPY LINK
         </button>
      </div>

      <div className="absolute top-6 right-6 w-40 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-50 bg-black">
        <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      </div>

      <div className="absolute inset-0 p-6 flex flex-col justify-end pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto flex flex-col gap-2 mb-24 max-h-[40vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-2xl text-sm backdrop-blur-xl border ${m.side === 'me' ? 'self-end bg-indigo-500/20 border-indigo-500/30' : 'self-start bg-white/5 border-white/10'}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-3xl p-4 rounded-[2.5rem] border border
