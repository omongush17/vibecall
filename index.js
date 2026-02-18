import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from "react-dom/client"; // Добавили эту строку
import Peer from 'peerjs';
import { Video, VideoOff, Mic, MicOff, Send, PhoneOff, Copy, Share2 } from 'lucide-react';

// Инициализация (тот самый код запуска)
const root = createRoot(document.getElementById("root"));
root.render(<App />);import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  PhoneOff,
  Copy,
  Share2,
} from "lucide-react";

const App = () => {
  const [myId, setMyId] = useState("");
  const [friendId, setFriendId] = useState("");
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const myVideo = useRef();
  const remoteVideo = useRef();

  useEffect(() => {
    const newPeer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    newPeer.on("open", (id) => {
      setMyId(id);
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get("room");
      if (roomFromUrl) {
        setFriendId(roomFromUrl);
        setTimeout(() => {
          const btn = document.getElementById("connect-btn");
          if (btn) btn.click();
        }, 1000);
      }
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        if (myVideo.current) myVideo.current.srcObject = s;
        newPeer.on("call", (call) => {
          setIsConnected(true);
          call.answer(s);
          call.on("stream", (rs) => {
            if (remoteVideo.current) remoteVideo.current.srcObject = rs;
          });
        });
      })
      .catch((err) => console.error("Media error:", err));

    newPeer.on("connection", (c) => {
      setConn(c);
      c.on("data", (data) =>
        setMessages((prev) => [...prev, { side: "partner", text: data }])
      );
    });

    setPeer(newPeer);
    return () => newPeer.destroy();
  }, []);

  const startConnect = () => {
    if (!friendId || !peer) return;
    setIsConnected(true);
    const call = peer.call(friendId, stream);
    call.on("stream", (rs) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = rs;
    });
    const connection = peer.connect(friendId);
    setConn(connection);
    connection.on("data", (data) =>
      setMessages((prev) => [...prev, { side: "partner", text: data }])
    );
  };

  const shareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${myId}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка скопирована!");
  };

  const sendMsg = () => {
    if (conn && inputText.trim()) {
      conn.send(inputText);
      setMessages((prev) => [...prev, { side: "me", text: inputText }]);
      setInputText("");
    }
  };

  return (
    <div className="h-screen w-full bg-[#050508] text-slate-200 overflow-hidden relative font-sans">
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />

      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-lg z-10 text-center p-6">
          <div className="max-w-xs pointer-events-auto">
            <h1 className="text-3xl font-thin tracking-[0.2em] mb-8 text-indigo-400">
              VIBE ROOM
            </h1>
            <button
              onClick={shareLink}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all mb-4"
            >
              <Share2 size={20} /> Скопировать ссылку
            </button>
            <p className="text-[10px] opacity-30 tracking-widest uppercase">
              Waiting for your partner...
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-6 right-6 w-40 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-50 bg-black">
        <video
          ref={myVideo}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>

      <div className="absolute inset-0 p-6 flex flex-col justify-end pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto flex flex-col gap-2 mb-24 max-h-[40vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl text-sm backdrop-blur-xl border ${
                m.side === "me"
                  ? "self-end bg-indigo-500/20 border-indigo-500/30"
                  : "self-start bg-white/5 border-white/10"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 pointer-events-auto">
          {!isConnected && (
            <div className="flex bg-white/5 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/10">
              <input
                placeholder="ID..."
                className="bg-transparent px-4 py-2 outline-none w-32 text-sm"
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
              />
              <button
                id="connect-btn"
                onClick={startConnect}
                className="bg-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black"
              >
                CONNECT
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-3xl p-4 rounded-[2.5rem] border border-white/10">
            <button className="p-3 bg-white/5 rounded-full">
              <Mic size={20} />
            </button>
            <button className="p-3 bg-white/5 rounded-full">
              <Video size={20} />
            </button>
            <div className="w-48 sm:w-64 bg-white/5 rounded-2xl px-4 flex items-center border border-white/5">
              <input
                className="bg-transparent flex-1 py-3 text-xs outline-none"
                placeholder="Message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              />
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-3 bg-red-500/20 text-red-500 rounded-full"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default App;

