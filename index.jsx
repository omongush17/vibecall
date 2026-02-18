import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from "react-dom/client";
import Peer from 'peerjs';
import * as LucideIcons from 'lucide-react';

const { Video, VideoOff, Mic, MicOff, Send, PhoneOff, Copy, Share2 } = LucideIcons;

const App = () => {
  const [myId, setMyId] = useState('');
  const [friendId, setFriendId] = useState('');
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStarted, setIsStarted] = useState(false); // Новое: открывает интерфейс сразу
  
  const myVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    const newPeer = new Peer({
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
      },
    });
    
    newPeer.on('open', (id) => {
      setMyId(id);
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      if (roomFromUrl) {
        setFriendId(roomFromUrl);
        // Если зашли по ссылке с ID, открываем интерфейс через секунду
        setTimeout(() => setIsStarted(true), 1000);
      }
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        if (myVideo.current) myVideo.current.srcObject = s;
        newPeer.on('call', (call) => {
          setIsStarted(true);
          call.answer(s);
          call.on('stream', (rs) => {
            if (remoteVideo.current) remoteVideo.current.srcObject = rs;
          });
        });
      })
      .catch((err) => {
        console.warn("Камера не найдена, работаем без неё");
        setStream(new MediaStream());
      });

    newPeer.on('connection', (c) => {
      setConn(c);
      setIsStarted(true);
      c.on('data', (data) => setMessages((prev) => [...prev, { side: 'partner', text: data }]));
    });

    setPeer(newPeer);
    return () => newPeer && newPeer.destroy();
  }, []);

  const startConnect = () => {
    if (!friendId || !peer) return;
    setIsStarted(true); // Сразу убираем заставку
    const call = peer.call(friendId, stream);
    if (call) {
      call.on('stream', (rs) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = rs;
      });
    }
    const connection = peer.connect(friendId);
    setConn(connection);
    connection.on('data', (data) => setMessages((prev) => [...prev, { side: 'partner', text: data }]));
  };

  const shareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${myId}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка скопирована! Отправь её другу.");
    setIsStarted(true); // Убираем заставку после копирования
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
            <button onClick={shareLink} className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-3xl transition-all mb-4 active:scale-95">
              <Share2 size={24} /> Создать комнату
            </button>
            <p className="text-[10px] opacity-30 tracking-[0.2em] uppercase">Press to generate your ID</p>
          </div>
        </div>
      )}

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
          <div className="flex bg-white/5 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
              <input 
                placeholder="Partner ID..." 
                className="bg-transparent px-4 py-2 outline-none w-36 text-sm text-white" 
                value={friendId} 
                onChange={(e) => setFriendId(e.target.value)} 
              />
              <button onClick={startConnect} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">Connect</button>
          </div>

          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-3xl p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
             <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all"><Mic size={20} /></button>
             <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all"><Video size={20} /></button>
             <div className="w-48 sm:w-64 bg-white/5 rounded-2xl px-4 flex items-center border border-white/5">
                <input 
                  className="bg-transparent flex-1 py-3 text-xs outline-none text-white" 
                  placeholder="Type a message..." 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && sendMsg()} 
                />
             </div>
             <button onClick={() => window.location.reload()} className="p-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all">
                <PhoneOff size={20} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
