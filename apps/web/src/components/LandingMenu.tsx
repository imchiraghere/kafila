'use client';

import React, { useState } from 'react';
import { Team, MUDDAS, NAMES_P } from '@mantar-jantar/shared';

interface LandingMenuProps {
  onStartGame: (name: string, team: Team, muddaIndex: number, mode: 'online' | 'offline') => void;
  statusText: string;
}

export function LandingMenu({ onStartGame, statusText }: LandingMenuProps) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState<Team>('P');
  const [muddaIndex, setMuddaIndex] = useState(0);

  const handleStart = (mode: 'online' | 'offline') => {
    const finalName = name.trim() || (team === 'P' ? 'Bunty from Burari' : 'SHO Yadav');
    onStartGame(finalName, team, muddaIndex, mode);
  };

  return (
    <div id="menu">
      <div className="card">
        <h1>
          JANTAR MANTAR <span>CHALO</span>
        </h1>
        <div className="hi">जंतर मंतर चलो! ✊🚧👮 · Multiplayer</div>
        <p className="tag">
          Build a kafila, dodge the police, reach <b>Jantar Mantar</b> and hold the dharna. Or be the police and stop them.
        </p>

        <input
          id="name"
          maxLength={18}
          placeholder="Your name (e.g. Bunty from Burari)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStart('online');
          }}
        />

        {/* Roles Selection */}
        <div className="roles">
          <div
            className={`role ${team === 'P' ? 'sel' : ''}`}
            data-r="P"
            onClick={() => setTeam('P')}
          >
            <div className="ic">✊</div>
            <b>Andolankari</b>
            <p>Walk into people to grow your kafila. Reach Jantar Mantar.</p>
            <div className="keys">
              🖱️ Point to walk · <kbd>Click</kbd> to shout naara / act
              <br />
              Hold <kbd>Click</kbd> at a barricade to push
            </div>
          </div>

          <div
            className={`role ${team === 'C' ? 'sel' : ''}`}
            data-r="C"
            onClick={() => setTeam('C')}
          >
            <div className="ic">👮</div>
            <b>Dilli Police</b>
            <p>Break kafilas with the lathi, lift leaders onto the bus. Watch out for big crowds!</p>
            <div className="keys">
              🖱️ Point to walk · <kbd>Click</kbd> lathi
              <br />
              <kbd>Right-click</kbd> or <kbd>E</kbd> tear gas
            </div>
          </div>
        </div>

        {/* Muddas Chips */}
        <div className="mlab">CHOOSE YOUR CAUSE / MUDDA:</div>
        <div className="muddas">
          {MUDDAS.map((m, idx) => (
            <button
              key={m.k}
              type="button"
              className={`mchip ${muddaIndex === idx ? 'sel' : ''}`}
              style={{ '--mc': m.c } as React.CSSProperties}
              onClick={() => setMuddaIndex(idx)}
            >
              {m.e} {m.n}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="btns">
          <button
            type="button"
            className="btn"
            id="play"
            onClick={() => handleStart('online')}
          >
            PLAY ONLINE ▶
          </button>
          <button
            type="button"
            className="btn"
            id="practice"
            onClick={() => handleStart('offline')}
          >
            Practice offline
          </button>
        </div>

        <div id="status">
          <b>●</b> {statusText || 'Ready to enter Delhi'}
        </div>

        <div className="help">
          <kbd>M</kbd> mute · <kbd>Q</kbd> graphics · <kbd>T</kbd> switch team · <kbd>Esc</kbd> menu
        </div>

        <div className="disc">
          Satire. All characters, shops and brands are fictional. 🤖 = AI player.
          <br />
          Built as an independent recreation with HTML5 Canvas, Next.js, and WebSockets.
        </div>
      </div>
    </div>
  );
}
