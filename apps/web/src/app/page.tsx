'use client';

import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const baseSrc = src.split('?')[0];
        const existing = document.querySelector(`script[data-script="${baseSrc}"]`);
        if (existing || (baseSrc.includes('client.js') && (window as any).__jm)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.setAttribute('data-script', baseSrc);
        s.async = false;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.body.appendChild(s);
      });
    };

    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const isProd = !isLocal;

          let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
          let httpUrl = process.env.NEXT_PUBLIC_SERVER_HTTP_URL;

          if (isProd) {
            if (!wsUrl || wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
              wsUrl = 'wss://kafila-server.vercel.app/ws';
            }
            if (!httpUrl || httpUrl.includes('localhost') || httpUrl.includes('127.0.0.1')) {
              httpUrl = 'https://kafila-server.vercel.app';
            }
          } else {
            wsUrl = wsUrl || 'ws://localhost:4000/ws';
            httpUrl = httpUrl || 'http://localhost:4000';
          }

          (window as any).__JM_WS_URL__ = wsUrl;
          (window as any).__JM_SERVER_URL__ = httpUrl;
        }
        const v = Date.now();
        await loadScript('/three.min.js?v=' + v);
        await loadScript('/shared/world.js?v=' + v);
        await loadScript('/shared/sim.js?v=' + v);
        await loadScript('/renderer3d.js?v=' + v);
        await loadScript('/client.js?v=' + v);
      } catch (err) {
        console.error('Failed to load game scripts:', err);
      }
    })();
  }, []);

  return (
    <>
      <canvas id="c-3d" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'none', zIndex: 1, pointerEvents: 'none' }}></canvas>
      <canvas id="c" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 2 }}></canvas>

      {/* In-Game HUD 2D / 3D View Switcher & Settings */}
      <div id="view-switcher" className="view-switcher" style={{ display: 'none' }}>
        <div className="view-toggle-grp">
          <button type="button" id="btn-view-2d" className="vbtn" title="2D Classic View (Key: V)">
            2D VIEW
          </button>
          <button type="button" id="btn-view-3d" className="vbtn sel" title="3D Realistic View (Key: V)">
            3D VIEW
          </button>
        </div>
        <button type="button" id="btn-cam" className="vbtn cam-pill" title="Cycle 3D Camera: Isometric / Third-Person / Top-Down (Key: C)">
          🎥 ISO
        </button>
        <button type="button" id="btn-gfx" className="vbtn gfx-pill" title="Graphics Quality (Key: Q)">
          ⚙️ HIGH
        </button>
      </div>

      <div id="mob">
        <button className="mb" id="bAct">
          NAARA
        </button>
        <button className="mb bGun" id="bGun">
          🔫 RIFLE
        </button>
        <button className="mb bBomb" id="bBomb">
          💣 BOMB
        </button>
        <button className="mb bReload" id="bReload">
          🔄 RELOAD
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
        <button className="mb bView" id="bView" title="Toggle 2D / 3D (V)">
          3D 🔄
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
                🖱️ Point to walk · <kbd>Click</kbd> to act / shoot
                <br />
                <kbd>1</kbd> Slogan · <kbd>2</kbd> Rifle · <kbd>3</kbd> Bomb · <kbd>R</kbd> Reload
              </div>
            </div>
            <div className="role" data-r="C">
              <div className="ic">👮</div>
              <b>Dilli Police</b>
              <p>Break kafilas with the lathi, lift leaders onto the bus. Watch out for big crowds!</p>
              <div className="keys">
                🖱️ Point to walk · <kbd>Click</kbd> lathi / shoot
                <br />
                <kbd>Right-click</kbd> or <kbd>G</kbd> throw bomb · <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> Weapons
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
            <kbd>V</kbd> 2D/3D View · <kbd>C</kbd> Camera · <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> Weapons · <kbd>R</kbd> Reload · <kbd>G</kbd>/<kbd>B</kbd> Bomb · <kbd>M</kbd> Map · <kbd>U</kbd> Mute · <kbd>Q</kbd> Graphics · <kbd>Esc</kbd> Menu
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
