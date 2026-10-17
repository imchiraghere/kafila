'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Team, NEWS } from '@mantar-jantar/shared';
import { GameClient } from '../game/client';
import { isMuted, setMuted } from '../game/audio';

interface GameViewProps {
  name: string;
  team: Team;
  muddaIndex: number;
  mode: 'online' | 'offline';
  onOpenMenu: () => void;
}

export function GameView({
  name,
  team,
  muddaIndex,
  mode,
  onOpenMenu
}: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const clientRef = useRef<GameClient | null>(null);

  const [status, setStatus] = useState('');
  const [score, setScore] = useState(0);
  const [kafila, setKafila] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [gameOverMsg, setGameOverMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const defaultWs = !isLocal ? 'wss://kafila-server.vercel.app/ws' : 'ws://localhost:4000/ws';
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL && (!process.env.NEXT_PUBLIC_WS_URL.includes('localhost') || isLocal))
      ? process.env.NEXT_PUBLIC_WS_URL
      : defaultWs;

    const client = new GameClient({
      canvas: canvasRef.current,
      canvas3D: canvas3DRef.current || undefined,
      name,
      team,
      mudda: muddaIndex,
      mode,
      wsUrl,
      onStatusChange: (st) => setStatus(st),
      onGameOver: (msg) => setGameOverMsg(msg),
      onScoreUpdate: (sc, k) => {
        setScore(sc);
        setKafila(k);
      }
    });

    clientRef.current = client;
    client.start();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenMenu();
      if (e.key.toLowerCase() === 'm') {
        const nextMute = !isMuted();
        setMuted(nextMute);
        setMutedState(nextMute);
      }
      if (e.key.toLowerCase() === 'v') {
        setViewMode((prev) => (prev === '3d' ? '2d' : '3d'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      client.stop();
      clientRef.current = null;
    };
  }, [name, team, muddaIndex, mode, onOpenMenu]);

  const toggleMute = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    setMutedState(nextMute);
  };

  const toggleView = () => {
    const next = viewMode === '3d' ? '2d' : '3d';
    setViewMode(next);
    clientRef.current?.setViewMode(next);
  };

  const tickerText = NEWS.join('   ◆   ');

  return (
    <>
      <canvas
        id="c-3d"
        ref={canvas3DRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          display: viewMode === '3d' ? 'block' : 'none',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      <canvas
        id="c"
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          zIndex: 2
        }}
      />

      {/* In-Game HUD */}
      <div className="hud">
        <div className="hud-pill">
          <span>{team === 'P' ? '✊ Protester' : '👮 Dilli Police'}</span>
          <span>|</span>
          <span>Score: {score}</span>
          {team === 'P' && (
            <>
              <span>|</span>
              <span>Kafila: {kafila}</span>
            </>
          )}
        </div>

        <button type="button" className="hud-btn" onClick={toggleView}>
          {viewMode === '3d' ? '🌐 3D View' : '🗺️ 2D View'} (V)
        </button>

        <button type="button" className="hud-btn" onClick={toggleMute}>
          {muted ? '🔇 Unmute' : '🔊 Mute'}
        </button>

        <button type="button" className="hud-btn" onClick={onOpenMenu}>
          ⚙ Menu (Esc)
        </button>
      </div>

      {/* Game Over Banner */}
      {gameOverMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(29, 26, 22, 0.95)',
            border: '3px solid #ff9933',
            color: '#fff',
            padding: '24px 36px',
            borderRadius: '16px',
            textAlign: 'center',
            zIndex: 8,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}
        >
          <h2 style={{ fontSize: '28px', color: '#ff9933', marginBottom: '8px' }}>
            ROUND OVER!
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>{gameOverMsg}</p>
          <button
            type="button"
            className="btn"
            id="play"
            style={{ fontSize: '16px', padding: '10px 24px' }}
            onClick={onOpenMenu}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Mobile Control Buttons */}
      <div id="mob">
        <button
          type="button"
          className="mb"
          id="bAct"
          onClick={() => clientRef.current?.triggerMobileAction('act')}
        >
          {team === 'P' ? 'NAARA' : 'LATHI'}
        </button>
        <button
          type="button"
          className="mb b3"
          id="bE"
          onClick={() => clientRef.current?.triggerMobileAction('lift')}
        >
          {team === 'P' ? 'PUSH' : 'LIFT'}
        </button>
        <button
          type="button"
          className="mb b2"
          id="bGas"
          onClick={() => clientRef.current?.triggerMobileAction('gas')}
        >
          {team === 'P' ? 'RALLY' : 'GAS'}
        </button>
        <button
          type="button"
          className="mb b4"
          id="bRun"
          onClick={() => clientRef.current?.triggerMobileAction('run')}
        >
          DASH
        </button>
      </div>

      {/* Bottom Delhi News Ticker */}
      <div className="ticker-bar">
        <div className="ticker-content">{tickerText}</div>
      </div>
    </>
  );
}
