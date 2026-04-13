import React, { useState, useEffect } from 'react';
import { isSafeField } from './Game.js';

// --- Static Data & Constants ---
const COLORS = {
	0: '#d32f2f', // Red (Spieler 1)
	1: '#fbc02d', // Yellow (Spieler 2)
	green: '#388e3c',
	blue: '#1976d2',
	boardBg: '#ffffff',
	track: '#ffffff',
	text: '#333'
};

const trackLayout = [
	{x:6, y:13}, {x:6, y:12}, {x:6, y:11}, {x:6, y:10}, {x:6, y:9},
	{x:5, y:8}, {x:4, y:8}, {x:3, y:8}, {x:2, y:8}, {x:1, y:8}, {x:0, y:8},
	{x:0, y:7},
	{x:0, y:6}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6},
	{x:6, y:5}, {x:6, y:4}, {x:6, y:3}, {x:6, y:2}, {x:6, y:1}, {x:6, y:0},
	{x:7, y:0},
	{x:8, y:0}, {x:8, y:1}, {x:8, y:2}, {x:8, y:3}, {x:8, y:4}, {x:8, y:5},
	{x:9, y:6}, {x:10,y:6}, {x:11,y:6}, {x:12,y:6}, {x:13,y:6}, {x:14,y:6},
	{x:14,y:7},
	{x:14,y:8}, {x:13,y:8}, {x:12,y:8}, {x:11,y:8}, {x:10,y:8}, {x:9, y:8},
	{x:8, y:9}, {x:8, y:10},{x:8, y:11},{x:8, y:12},{x:8, y:13},{x:8, y:14},
	{x:7, y:14}, {x:6, y:14}
];

// --- Visual Helpers ---

function getTokenCoordinates(playerID, progress, tokenIndex) {
	if (progress === 0) {
		const offsets = [{x: 1.5, y: 1.5}, {x: 3.5, y: 1.5}, {x: 1.5, y: 3.5}, {x: 3.5, y: 3.5}];
		const baseOrigin = playerID === '0' ? {x: 0, y: 9} : {x: 9, y: 0};
		return { x: baseOrigin.x + offsets[tokenIndex].x, y: baseOrigin.y + offsets[tokenIndex].y };
	}
	if (progress <= 51) {
		const absPos = (progress - 1 + (playerID === '0' ? 0 : 26)) % 52;
		return trackLayout[absPos];
	}
	if (progress <= 56) {
		const step = progress - 51;
		return playerID === '0' ? { x: 7, y: 14 - step } : { x: 7, y: step };
	}
	if (progress === 57) {
		return playerID === '0' ? { x: 7.5, y: 8 } : { x: 7.5, y: 7 };
	}
	return null;
}

function canTokenMove(progress, roll) {
	if (!roll) return false;
	if (progress === 0) return roll === 6;
	return (progress + roll) <= 57;
}

function getCellLayout(count, index) {
	if (count === 1) return { scale: 1, dx: 0, dy: 0 };
	if (count === 2) return { scale: 0.65, ...[{ dx: -0.22, dy: 0 }, { dx: 0.22, dy: 0 }][index] };
	if (count === 3) return { scale: 0.55, ...[{ dx: -0.2, dy: -0.2 }, { dx: 0.2, dy: -0.2 }, { dx: 0, dy: 0.2 }][index] };
	if (count >= 4) return { scale: 0.5, ...[{ dx: -0.2, dy: -0.2 }, { dx: 0.2, dy: -0.2 }, { dx: -0.2, dy: 0.2 }, { dx: 0.2, dy: 0.2 }][index] };
	return { scale: 1, dx: 0, dy: 0 };
}

const DieFace = ({ value, isRolling }) => {
	const dots = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
	return (
		<div style={{
			width: '60px', height: '60px', backgroundColor: 'white', border: '3px solid #333', borderRadius: '12px',
			display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '7px', gap: '3px', boxShadow: '0 5px 0 #bbb',
			animation: isRolling ? 'roll3d 0.8s ease-out' : 'none', transformOrigin: '50% 50%'
		}}>
			{value && [...Array(9)].map((_, i) => (
				<div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
					{dots[value] && dots[value].includes(i) && (
						<div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#333' }} />
					)}
				</div>
			))}
		</div>
	);
};

export function LudoBoard({ ctx, G, moves, playerID, matchID = "LOCAL" }) {
	const isMyTurn = playerID === ctx.currentPlayer;
	const myColor = COLORS[playerID];

	const [localIsRolling, setLocalIsRolling] = useState(false);
	const [tempDiceValue, setTempDiceValue] = useState(G.diceRoll);
	const [copiedCode, setCopiedCode] = useState(false);

	const [visualProgress, setVisualProgress] = useState({
		'0': [...G.players['0'].tokens],
		'1': [...G.players['1'].tokens]
	});

	const isAnimatingTokens = JSON.stringify(visualProgress) !== JSON.stringify({
		'0': G.players['0'].tokens,
		'1': G.players['1'].tokens
	});

	useEffect(() => {
		const stepInterval = setInterval(() => {
			setVisualProgress(prev => {
				let hasChanges = false;
				const nextState = { '0': [...prev['0']], '1': [...prev['1']] };
				for (let p of ['0', '1']) {
					for (let i = 0; i < 4; i++) {
						const target = G.players[p].tokens[i];
						const current = nextState[p][i];
						if (current !== target) {
							hasChanges = true;
							if (target === 0) nextState[p][i] = 0;
							else if (current === 0 && target > 0) nextState[p][i] = 1;
							else if (current < target) nextState[p][i] = current + 1;
							else nextState[p][i] = target;
						}
					}
				}
				if (!hasChanges) {
					clearInterval(stepInterval);
					return prev;
				}
				return nextState;
			});
		}, 150);
		return () => clearInterval(stepInterval);
	}, [G.players]);

	useEffect(() => {
		if (!localIsRolling) setTempDiceValue(G.diceRoll);
	}, [G.diceRoll, localIsRolling]);

	const handleRollClick = () => {
		if (!isMyTurn || G.hasRolled || isAnimatingTokens) return;
		setLocalIsRolling(true);
		const scrambleInterval = setInterval(() => setTempDiceValue(Math.floor(Math.random() * 6) + 1), 100);
		setTimeout(() => {
			clearInterval(scrambleInterval);
			moves.RollDice();
			setLocalIsRolling(false);
		}, 800);
	};

	const handleCopyCode = () => {
		const shareLink = `${window.location.origin}/?join=${matchID}`;
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(shareLink).then(() => {
				setCopiedCode(true);
				setTimeout(() => setCopiedCode(false), 2000);
			}).catch(err => console.error("Clipboard API failed: ", err));
		}
	};

	return (
		<div className="ludo-container">
			<div className="ludo-sidebar">
				<div className="ludo-code-card">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<p style={{ margin: 0, color: '#666', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Game Code</p>
						<button onClick={handleCopyCode} style={{ background: copiedCode ? '#e8f8f5' : '#f0f0f0', color: copiedCode ? '#27ae60' : '#555', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}>
							{copiedCode ? '✓ Copied Link' : 'Copy Link'}
						</button>
					</div>
					<h3 style={{ margin: '10px 0 0 0', color: COLORS.text, fontSize: '24px', letterSpacing: '2px' }}>{matchID}</h3>
				</div>

				<div className="ludo-info-card" style={{ borderTop: `8px solid ${myColor}` }}>
					<h2 style={{ margin: '0 0 10px 0', color: COLORS.text }}>Ludo P2P</h2>
					<p style={{ margin: 0, color: '#666' }}>You are: <span style={{ fontWeight: 'bold', color: myColor }}>Player {playerID}</span></p>
					<p style={{ fontWeight: 'bold', color: isMyTurn ? '#2ecc71' : '#95a5a6', marginTop: '10px' }}>
						{isMyTurn ? "● Your Turn" : "○ Waiting for opponent..."}
					</p>
				</div>

				<div className="ludo-dice-card">
					{tempDiceValue ? <DieFace value={tempDiceValue} isRolling={localIsRolling} /> : (
						<div style={{ width: '60px', height: '60px', border: '2px dashed #ccc', borderRadius: '10px', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
					)}
					<button disabled={!isMyTurn || G.hasRolled || localIsRolling || isAnimatingTokens} onClick={handleRollClick}
									style={{
										padding: '12px 30px', fontSize: '18px', fontWeight: 'bold',
										backgroundColor: isMyTurn && !G.hasRolled && !localIsRolling && !isAnimatingTokens ? '#333' : '#eee',
										color: isMyTurn && !G.hasRolled && !localIsRolling && !isAnimatingTokens ? 'white' : '#999',
										border: 'none', borderRadius: '8px', cursor: isMyTurn && !G.hasRolled && !localIsRolling && !isAnimatingTokens ? 'pointer' : 'not-allowed', transition: 'all 0.1s'
									}}>
						{localIsRolling ? 'Rolling...' : 'Roll Dice'}
					</button>
				</div>
			</div>

			<div className="ludo-board-wrapper">
				<svg className="ludo-svg" viewBox="0 0 15 15">
					<defs>
						{/* Pattern for Safety Fields */}
						<pattern id="safePattern" x="0" y="0" width="0.2" height="0.2" patternUnits="userSpaceOnUse">
							<circle cx="0.1" cy="0.1" r="0.04" fill="#666" opacity="0.2" />
						</pattern>

						<g id="star">
							<polygon points="0,-0.3 0.1,-0.1 0.35,-0.1 0.15,0.05 0.25,0.3 0,0.15 -0.25,0.3 -0.15,0.05 -0.35,-0.1 -0.1,-0.1" fill="white" opacity="0.8" />
						</g>
						<g id="dark-star">
							<polygon points="0,-0.3 0.1,-0.1 0.35,-0.1 0.15,0.05 0.25,0.3 0,0.15 -0.25,0.3 -0.15,0.05 -0.35,-0.1 -0.1,-0.1" fill="#333" opacity="0.3" />
						</g>

						<g id="arrow-down"><polygon points="0.2,0.2 0.8,0.2 0.5,0.8" fill="white" opacity="0.9" /></g>
						<g id="arrow-up"><polygon points="0.2,0.8 0.8,0.8 0.5,0.2" fill="white" opacity="0.9" /></g>
						<g id="arrow-right"><polygon points="0.2,0.2 0.2,0.8 0.8,0.5" fill="white" opacity="0.9" /></g>
						<g id="arrow-left"><polygon points="0.8,0.2 0.8,0.8 0.2,0.5" fill="white" opacity="0.9" /></g>

						<radialGradient id="redToken" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#ff7a7a"/><stop offset="100%" stopColor="#b71c1c"/></radialGradient>
						<radialGradient id="yellowToken" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#fff59d"/><stop offset="100%" stopColor="#f57f17"/></radialGradient>
					</defs>

					{/* 4 Colored Bases */}
					<rect x="0" y="0" width="6" height="6" rx="0.5" fill={COLORS.green} stroke="#333" strokeWidth="0.05" />
					<rect x="9" y="0" width="6" height="6" rx="0.5" fill={COLORS[1]} stroke="#333" strokeWidth="0.05" />
					<rect x="0" y="9" width="6" height="6" rx="0.5" fill={COLORS[0]} stroke="#333" strokeWidth="0.05" />
					<rect x="9" y="9" width="6" height="6" rx="0.5" fill={COLORS.blue} stroke="#333" strokeWidth="0.05" />

					<rect x="1" y="1" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="10" y="1" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="1" y="10" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="10" y="10" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />

					<text x="3" y="14.6" fill="white" fontSize="0.75" fontWeight="bold" textAnchor="middle" style={{fontFamily: "system-ui"}}>Spieler 1</text>
					<text x="12" y="0.8" fill="white" fontSize="0.75" fontWeight="bold" textAnchor="middle" style={{fontFamily: "system-ui"}}>Spieler 2</text>

					<g fill="#a5d6a7"><circle cx="2" cy="2" r="0.4" /><circle cx="4" cy="2" r="0.4" /><circle cx="2" cy="4" r="0.4" /><circle cx="4" cy="4" r="0.4" /></g>
					<g fill="#fdd835"><circle cx="11" cy="2" r="0.4" /><circle cx="13" cy="2" r="0.4" /><circle cx="12" cy="3" r="0.4" /></g>

					{/* Track with Safety Visuals */}
					{trackLayout.map((c, i) => {
						const isSafe = isSafeField(i);
						return (
							<g key={i}>
								<rect x={c.x} y={c.y} width="1" height="1" fill="white" stroke="#e0e0e0" strokeWidth="0.03" />
								{isSafe && <rect x={c.x} y={c.y} width="1" height="1" fill="url(#safePattern)" />}
							</g>
						);
					})}

					{/* Home Stretches */}
					{[1,2,3,4,5].map(step => (
						<React.Fragment key={`home-${step}`}>
							<rect x={step} y={7} width="1" height="1" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />
							<rect x={7} y={step} width="1" height="1" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
							<rect x={14-step} y={7} width="1" height="1" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
							<rect x={7} y={14-step} width="1" height="1" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />
						</React.Fragment>
					))}

					{/* Start Spaces */}
					<rect x="1" y="6" width="1" height="1" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />
					<rect x="8" y="1" width="1" height="1" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
					<rect x="13" y="8" width="1" height="1" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
					<rect x="6" y="13" width="1" height="1" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />

					{/* Center */}
					<polygon points="6,6 9,6 7.5,7.5" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
					<polygon points="9,6 9,9 7.5,7.5" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
					<polygon points="6,9 9,9 7.5,7.5" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />
					<polygon points="6,6 6,9 7.5,7.5" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />

					{/* Safety Stars */}
					<use href="#star" x="1.5" y="6.5" />
					<use href="#dark-star" x="6.5" y="2.5" /> {/* Green Start + 8 */}

					<use href="#star" x="8.5" y="1.5" />
					<use href="#dark-star" x="12.5" y="6.5" /> {/* Yellow Start + 8 */}

					<use href="#star" x="13.5" y="8.5" />
					<use href="#dark-star" x="8.5" y="12.5" /> {/* Blue Start + 8 */}

					<use href="#star" x="6.5" y="13.5" />
					<use href="#dark-star" x="2.5" y="8.5" /> {/* Red Start + 8 */}

					<use href="#arrow-right" x="0" y="7" />
					<use href="#arrow-down" x="7" y="0" />
					<use href="#arrow-left" x="14" y="7" />
					<use href="#arrow-up" x="7" y="14" />

					{/* Tokens */}
					{(() => {
						const tokensToRender = [];
						const occupancyMap = {};
						Object.keys(visualProgress).forEach(pID => {
							visualProgress[pID].forEach((prog, idx) => {
								const pos = getTokenCoordinates(pID, prog, idx);
								if (pos) {
									const key = `${pos.x},${pos.y}`;
									if (!occupancyMap[key]) occupancyMap[key] = [];
									occupancyMap[key].push({ pID, idx, prog, pos });
								}
							});
						});

						Object.values(occupancyMap).forEach(cellTokens => {
							const count = cellTokens.length;
							cellTokens.forEach((token, i) => tokensToRender.push({ ...token, ...getCellLayout(count, i) }));
						});

						return tokensToRender.map(({ pID, idx, pos, scale, dx, dy }) => {
							const trueProgress = G.players[pID].tokens[idx];
							const isEligibleToken = isMyTurn && G.hasRolled && !localIsRolling && !isAnimatingTokens &&
								pID === playerID && canTokenMove(trueProgress, G.diceRoll);

							return (
								<g key={`${pID}-${idx}`} transform={`translate(${pos.x + 0.5 + dx}, ${pos.y + 0.5 + dy}) scale(${scale})`}
									 onClick={() => isEligibleToken && moves.MoveToken(idx)}
									 style={{ cursor: isEligibleToken ? 'pointer' : 'default', transition: 'transform 0.15s linear' }}>
									<circle cx="0.05" cy="0.05" r="0.45" fill="rgba(0,0,0,0.3)" />
									<circle cx="0" cy="0" r="0.4" fill={`url(#${pID === '0' ? 'red' : 'yellow'}Token)`} stroke="white" strokeWidth="0.05"/>
									{isEligibleToken && (
										<circle cx="0" cy="0" r="0.5" fill="none" stroke={COLORS[pID]} strokeWidth="0.05" style={{ animation: 'ring 1.5s infinite' }} />
									)}
								</g>
							);
						});
					})()}
				</svg>

				<style>{`
          .ludo-container {
            display: flex; justify-content: center; align-items: flex-start;
            gap: 40px; padding: 40px; font-family: system-ui, sans-serif;
            background-color: #2b3b75;
            background-image: radial-gradient(#3a4b86 15%, transparent 16%), radial-gradient(#3a4b86 15%, transparent 16%);
            background-size: 30px 30px; background-position: 0 0, 15px 15px;
            min-height: 100vh;
          }
          .ludo-sidebar { width: 300px; display: flex; flex-direction: column; gap: 20px; }
          .ludo-code-card, .ludo-info-card, .ludo-dice-card { background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 20px; }
          .ludo-dice-card { height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; }
          .ludo-board-wrapper { position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border-radius: 16px; width: 600px; max-width: 100%; background: #4a62ab; padding: 10px;}
          .ludo-svg { width: 100%; height: auto; display: block; background: #fff; border-radius: 10px; border: 4px solid #1e2c5e; box-sizing: border-box; }
          @media (max-width: 960px) {
            .ludo-container { flex-direction: column; align-items: center; padding: 15px; gap: 20px; }
            .ludo-sidebar { display: contents; }
            .ludo-code-card, .ludo-info-card, .ludo-dice-card { width: 100%; max-width: 600px; box-sizing: border-box; }
            .ludo-board-wrapper { order: 3; margin: 0 auto; }
          }
          @keyframes ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
          @keyframes roll3d { 0% { transform: scale(1) rotate(0deg); } 30% { transform: scale(0.6) rotateX(180deg) rotateY(180deg); } 60% { transform: scale(1.1) rotateX(360deg) rotateY(180deg) rotateZ(180deg); } 100% { transform: scale(1) rotateX(360deg) rotateY(360deg) rotateZ(360deg); } }
        `}</style>
			</div>
		</div>
	);
}
