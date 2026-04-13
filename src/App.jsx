import React, { useState, useEffect, useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { P2P } from '@boardgame.io/p2p';
import { LudoGame } from './Game.js';
import { LudoBoard } from './Board.jsx';

export default function App() {
  const [matchID, setMatchID] = useState('');
  const [playerID, setPlayerID] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    if (joinCode) {
      setMatchID(joinCode.toUpperCase());
      setPlayerID('1');

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const GameClient = useMemo(() => {
    if (playerID === null) return null;

    return Client({
      game: LudoGame,
      board: LudoBoard,
      debug: false,
      multiplayer: P2P({
        isHost: playerID === '0',
        peerOptions: {
          config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
        },
      }),
    });
  }, [playerID]);

  if (playerID !== null && GameClient) {
    return <GameClient matchID={matchID} playerID={playerID} />;
  }

  return (
    <div className="app-container">
      <img className="header-image" src="../header_image.png" alt="header-image"/>
      <div className="menu-card">
        <div className="menu-header">
          <h1 className="menu-title">Ludo</h1>
          <p className="menu-subtitle">Approved von Henry</p>
        </div>

        <div className="menu-section">
          <button
            className="btn-primary"
            onClick={() => {
              setMatchID(Math.random().toString(36).substring(2, 6).toUpperCase());
              setPlayerID('0');
            }}
          >
            Neues Spiel erstellen
          </button>
        </div>

        <div className="menu-divider">
          <span>ODER</span>
        </div>

        <div className="menu-section">
          <p className="input-label">Hast du einen Code?</p>
          <input
            className="join-input"
            placeholder="Z.B. A1B2"
            value={matchID}
            maxLength={4}
            onChange={e => setMatchID(e.target.value.toUpperCase())}
          />
          <button
            className="btn-secondary"
            disabled={!matchID || matchID.length < 4}
            onClick={() => setPlayerID('1')}
          >
            Spiel beitreten
          </button>
        </div>
      </div>

      <style>{`
        /* FIX: Überschreibt die lästigen Standard-Regeln von Vite/React */
        #root {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #2b3b75; 
        }

        .app-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100vw;
          min-height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          background-color: #2b3b75;
          background-image: radial-gradient(#3a4b86 15%, transparent 16%), radial-gradient(#3a4b86 15%, transparent 16%);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .header-image {
          width: 200px;
        }

        .menu-card {
          background: white;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          width: 100%;
          max-width: 280px;
          text-align: center;
          animation: slide-up 0.5s ease-out;
        }

        .menu-header {
          margin-bottom: 30px;
        }

        .menu-title {
          margin: 0;
          font-size: 36px;
          color: #1e2c5e;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .menu-subtitle {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: bold;
        }

        .menu-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-primary {
          background: #d32f2f;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(211, 47, 47, 0.3);
        }
        .btn-primary:hover {
          background: #b71c1c;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(211, 47, 47, 0.4);
        }

        .btn-secondary {
          background: #3498db;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-2px);
        }
        .btn-secondary:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          transform: none;
        }

        .menu-divider {
          margin: 25px 0;
          position: relative;
          text-align: center;
        }
        .menu-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #eee;
          z-index: 1;
        }
        .menu-divider span {
          background: white;
          padding: 0 15px;
          color: #999;
          font-size: 12px;
          font-weight: bold;
          position: relative;
          z-index: 2;
        }

        .input-label {
          margin: 0 0 2px 0;
          font-size: 13px;
          color: #555;
          font-weight: bold;
          text-align: left;
        }

        .join-input {
          padding: 16px;
          background-color: #f4f6f9;
          color: #1e2c5e;
          border: 2px solid #e1e4e8;
          border-radius: 12px;
          font-size: 22px;
          font-weight: 800;
          text-align: center;
          letter-spacing: 4px;
          text-transform: uppercase;
          outline: none;
          transition: all 0.3s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
        }
        
        .join-input:focus {
          background-color: #ffffff;
          border-color: #3498db;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02), 0 0 0 4px rgba(52, 152, 219, 0.2);
        }
        
        .join-input::placeholder {
          color: #aab7c4;
          letter-spacing: 1px;
          font-weight: 600;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
