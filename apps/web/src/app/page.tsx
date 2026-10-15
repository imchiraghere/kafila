'use client';

import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.body.appendChild(s);
      });
    };

    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const isProd = process.env.NODE_ENV === 'production' || (window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
          (window as any).__JM_WS_URL__ = process.env.NEXT_PUBLIC_WS_URL || (isProd ? 'wss://kafila-server.vercel.app/ws' : '');
          (window as any).__JM_SERVER_URL__ = process.env.NEXT_PUBLIC_SERVER_HTTP_URL || (isProd ? 'https://kafila-server.vercel.app' : '');
        }
        await loadScript('/shared/world.js');
        await loadScript('/shared/sim.js');
        await loadScript('/client.js');
      } catch (err) {
        console.error('Failed to load game scripts:', err);
      }
    })();
  }, []);

  return (
    <>
      <canvas id="c"></canvas>
      <div id="mob">
        <button className="mb" id="bAct">
          NAARA
        </button>
        <button className="mb b3" id="bE">
          LIFT
        </button>
        <button className="mb b2" id="bGas">
          GAS
        </button>
        <button className="mb b4" id="bRun">
          DASH
        </button>
        <button className="mb b5" id="bMap">
          🗺️ MAP
        </button>
      </div>
      <div id="menu">
        <div className="card">
          <h1>
            JANTAR MANTAR <span>CHALO</span>
          </h1>
          <div className="hi">जंतर मंतर चलो! ✊🚧👮 · Multiplayer</div>
          <p className="tag">
            Build a kafila, dodge the police, reach <b>Jantar Mantar</b> and hold the dharna. Or be the police and stop them.
          </p>
          <input id="name" maxLength={18} placeholder="Your name (e.g. Bunty from Burari)" />
          <div className="roles">
            <div className="role sel" data-r="P">
              <div className="ic">✊</div>
              <b>Andolankari</b>
              <p>Walk into people to grow your kafila. Reach Jantar Mantar.</p>
              <div className="keys">
                🖱️ Point to walk · <kbd>Click</kbd> to act
                <br />
                Hold <kbd>Click</kbd> at a barricade to push
              </div>
            </div>
            <div className="role" data-r="C">
              <div className="ic">👮</div>
              <b>Dilli Police</b>
              <p>Break kafilas with the lathi, lift leaders onto the bus. Watch out for big crowds!</p>
              <div className="keys">
                🖱️ Point to walk · <kbd>Click</kbd> lathi
                <br />
                <kbd>Right-click</kbd> tear gas
                <br />
                Your constables lift whoever your lathi exposes
              </div>
            </div>
          </div>
          <div className="muddas" id="muddas"></div>
          <div className="room-control">
            <div className="room-label">
              🌐 <b>Multiplayer Room:</b> <span id="room-badge" style={{ color: '#c0392b', fontWeight: 800 }}>Main Dharna</span>
            </div>
            <div className="room-row">
              <select id="room-select" className="room-select">
                <option value="main">Main Dharna (Jantar Mantar)</option>
                <option value="north-campus">DU North Campus Rally</option>
                <option value="border-morcha">Border Morcha (Singhu / Ghazipur)</option>
                <option value="custom">✏️ Custom Room Code…</option>
              </select>
              <input id="room-custom" className="room-custom" placeholder="Enter custom room code" maxLength={24} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="btns">
            <button className="btn" id="play">
              PLAY ONLINE ▶
            </button>
            <button className="btn" id="practice">
              Practice offline
            </button>
          </div>
          <div id="status">Checking server…</div>
          <div className="help">
            <kbd>M</kbd> or <kbd>Tab</kbd> map · <kbd>U</kbd> mute · <kbd>Q</kbd> graphics · <kbd>T</kbd> switch team · <kbd>Esc</kbd> menu
          </div>
          <div className="disc">
            Satire. All characters, shops and brands are fictional. 🤖 = AI player.
            <br />
            <span style={{ display: 'inline-block', marginTop: '6px', fontWeight: 600, color: '#7a6650', lineHeight: 1.6 }}>
              Design &amp; Developed by <b style={{ color: '#b33927' }}>Boogiy Man</b>
              <br />
              © {new Date().getFullYear()} Boogiy Man · All Rights Reserved.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
