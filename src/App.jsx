import React, { useState, useEffect, useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { P2P } from '@boardgame.io/p2p';
import { LudoGame } from './Game.js';
import { LudoBoard } from './Board.jsx';

export default function App() {
  const [matchID, setMatchID] = useState('');
  const [playerID, setPlayerID] = useState(null);

  // NEW: Check the URL on load to see if the user clicked a share link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    if (joinCode) {
      setMatchID(joinCode.toUpperCase());
      setPlayerID('1'); // Automatically join as Player 1

      // Clean up the URL in the browser bar so refreshing doesn't break things
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // useMemo prevents the client from re-initializing on every render
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
    <div style={{ padding: '50px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Ludo P2P</h1>
      <button
        style={{ padding: '10px 20px', cursor: 'pointer' }}
        onClick={() => {
          setMatchID(Math.random().toString(36).substring(2, 6).toUpperCase());
          setPlayerID('0');
        }}
      >
        Create Game (Player 0)
      </button>

      <div style={{ marginTop: '20px' }}>
        <input
          placeholder="Room Code"
          value={matchID}
          onChange={e => setMatchID(e.target.value.toUpperCase())}
          style={{ padding: '10px', marginRight: '10px', textTransform: 'uppercase' }}
        />
        <button
          style={{ padding: '10px 20px', cursor: 'pointer' }}
          onClick={() => setPlayerID('1')}
        >
          Join Game (Player 1)
        </button>
      </div>
    </div>
  );
}
