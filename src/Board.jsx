import React, { useState, useEffect } from 'react';
import { isSafeField } from './Game.js';

const SKIN_CONFIG = {
	dice: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
	boardBackground: null
};

const COLORS = {
	0: '#d32f2f', 1: '#fbc02d', green: '#388e3c', blue: '#1976d2', text: '#333'
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
		return playerID === '0' ? { x: 7, y: 8 } : { x: 7, y: 6 };
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

const DieFace = ({ value, isRolling, canRoll }) => {
	const cssClass = `die-face ${canRoll ? 'dice-pulse' : ''}`;

	if (value && SKIN_CONFIG.dice[value]) {
		return <img src={SKIN_CONFIG.dice[value]} className={cssClass} alt={`Dice`} style={{ width: '70px', height: '70px', animation: isRolling ? 'roll3d 0.8s ease-out' : 'none', borderRadius: '12px' }} />;
	}
	const dots = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
	return (
		<div className={cssClass} style={{ width: '70px', height: '70px', backgroundColor: 'white', border: '3px solid #333', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '8px', gap: '4px', animation: isRolling ? 'roll3d 0.8s ease-out infinite' : 'none' }}>
			{value && [...Array(9)].map((_, i) => (
				<div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
					{dots[value] && dots[value].includes(i) && <div style={{ width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#333' }} />}
				</div>
			))}
		</div>
	);
};

export function LudoBoard({ ctx, G, moves, playerID, matchID = "LOCAL" }) {
	const isMyTurn = playerID === ctx.currentPlayer;
	const myColor = COLORS[playerID];

	const [tempDiceValue, setTempDiceValue] = useState(G.lastDiceRoll || 1);
	const [copiedCode, setCopiedCode] = useState(false);

	const [visualProgress, setVisualProgress] = useState({ '0': [...G.players['0'].tokens], '1': [...G.players['1'].tokens] });
	const isAnimatingTokens = JSON.stringify(visualProgress) !== JSON.stringify({ '0': G.players['0'].tokens, '1': G.players['1'].tokens });

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
							else if (current < target) nextState[p][i] = current + 1;
							else nextState[p][i] = target;
						}
					}
				}
				if (!hasChanges) { clearInterval(stepInterval); return prev; }
				return nextState;
			});
		}, 150);
		return () => clearInterval(stepInterval);
	}, [G.players]);

	// Synchronisiert die Scramble-Animation über das Netzwerk
	useEffect(() => {
		let interval;
		if (G.isRolling) {
			interval = setInterval(() => setTempDiceValue(Math.floor(Math.random() * 6) + 1), 100);
		} else {
			setTempDiceValue(G.lastDiceRoll || 1);
		}
		return () => clearInterval(interval);
	}, [G.isRolling, G.lastDiceRoll]);

	const canRoll = isMyTurn && !G.hasRolled && !G.isRolling && !isAnimatingTokens;
	const needsToMove = isMyTurn && G.hasRolled && !G.isRolling && !isAnimatingTokens;

	const handleRollClick = () => {
		if (!canRoll) return;

		// Startet die Animation bei beiden Spielern
		moves.StartRoll();

		// Beendet die Animation nach 800ms
		setTimeout(() => {
			moves.FinishRoll();
		}, 800);
	};

	const handleCopyCode = () => {
		const shareLink = `${window.location.origin}/?join=${matchID}`;
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(shareLink).then(() => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); });
		}
	};

	const handleImageUpload = (event) => {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const MAX_SIZE = 120;
				let width = img.width; let height = img.height;
				if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
				else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
				canvas.width = width; canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, width, height);
				moves.UpdateSkin(playerID, canvas.toDataURL('image/webp', 0.8));
			};
			img.src = e.target.result;
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="ludo-container">

			<div className="ludo-control-panel" style={{ borderTop: `8px solid ${myColor}` }}>

				<div className="ludo-panel-top">
					<div className="ludo-panel-section">
						<span className="ludo-label">Game Code</span>
						<div className="ludo-value-row">
							<h3 className="ludo-value">{matchID}</h3>
							<button className="ludo-action-btn" onClick={handleCopyCode}>
								{copiedCode ? '✓' : 'Copy'}
							</button>
						</div>
					</div>

					<div className="ludo-panel-section" style={{ alignItems: 'flex-end' }}>
						<span className="ludo-label">Spieler</span>
						<div className="ludo-value-row">
							<h3 className="ludo-value" style={{ color: myColor }}>{playerID}</h3>
							<label className="ludo-action-btn skin-btn">
								📷 Skin
								<input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
							</label>
							{G.skins[playerID] && (
								<button className="ludo-action-btn skin-remove-btn" onClick={() => moves.UpdateSkin(playerID, null)}>✕</button>
							)}
						</div>
					</div>
				</div>

				<div className="ludo-dice-wrapper" onClick={handleRollClick}>
					<DieFace value={tempDiceValue} isRolling={G.isRolling} canRoll={canRoll} />
					{needsToMove && (
						<p className="ludo-action-hint">Wähle eine Figur</p>
					)}
				</div>

			</div>

			<div className="ludo-board-wrapper">
				<svg className="ludo-svg" viewBox="0 0 15 15">
					<defs>
						<pattern id="safePattern" x="0" y="0" width="0.2" height="0.2" patternUnits="userSpaceOnUse">
							<circle cx="0.1" cy="0.1" r="0.04" fill="#666" opacity="0.2" />
						</pattern>
						<clipPath id="circleClip"><circle cx="0" cy="0" r="0.4" /></clipPath>
						<g id="star"><polygon points="0,-0.3 0.1,-0.1 0.35,-0.1 0.15,0.05 0.25,0.3 0,0.15 -0.25,0.3 -0.15,0.05 -0.35,-0.1 -0.1,-0.1" fill="white" opacity="0.8" /></g>
						<g id="dark-star"><polygon points="0,-0.3 0.1,-0.1 0.35,-0.1 0.15,0.05 0.25,0.3 0,0.15 -0.25,0.3 -0.15,0.05 -0.35,-0.1 -0.1,-0.1" fill="#333" opacity="0.3" /></g>
						<g id="arrow-down"><polygon points="0.2,0.2 0.8,0.2 0.5,0.8" fill="white" opacity="0.9" /></g>
						<g id="arrow-up"><polygon points="0.2,0.8 0.8,0.8 0.5,0.2" fill="white" opacity="0.9" /></g>
						<g id="arrow-right"><polygon points="0.2,0.2 0.2,0.8 0.8,0.5" fill="white" opacity="0.9" /></g>
						<g id="arrow-left"><polygon points="0.8,0.2 0.8,0.8 0.2,0.5" fill="white" opacity="0.9" /></g>
						<radialGradient id="redToken" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#ff7a7a"/><stop offset="100%" stopColor="#b71c1c"/></radialGradient>
						<radialGradient id="yellowToken" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#fff59d"/><stop offset="100%" stopColor="#f57f17"/></radialGradient>
					</defs>

					{SKIN_CONFIG.boardBackground && (
						<image href={SKIN_CONFIG.boardBackground} x="0" y="0" width="15" height="15" preserveAspectRatio="none" opacity="0.9" />
					)}

					{/* Bases & Track */}
					<rect x="0" y="0" width="6" height="6" rx="0.5" fill={COLORS.green} stroke="#333" strokeWidth="0.05" />
					<rect x="9" y="0" width="6" height="6" rx="0.5" fill={COLORS[1]} stroke="#333" strokeWidth="0.05" />
					<rect x="0" y="9" width="6" height="6" rx="0.5" fill={COLORS[0]} stroke="#333" strokeWidth="0.05" />
					<rect x="9" y="9" width="6" height="6" rx="0.5" fill={COLORS.blue} stroke="#333" strokeWidth="0.05" />
					<rect x="1" y="1" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="10" y="1" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="1" y="10" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />
					<rect x="10" y="10" width="4" height="4" rx="0.5" fill="white" stroke="#333" strokeWidth="0.05" />

					{trackLayout.map((c, i) => {
						const isSafe = isSafeField(i);
						return (
							<g key={i}>
								<rect x={c.x} y={c.y} width="1" height="1" fill="white" stroke="#e0e0e0" strokeWidth="0.03" />
								{isSafe && <rect x={c.x} y={c.y} width="1" height="1" fill="url(#safePattern)" />}
							</g>
						);
					})}

					{[1,2,3,4,5].map(step => (
						<React.Fragment key={`home-${step}`}>
							<rect x={step} y={7} width="1" height="1" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />
							<rect x={7} y={step} width="1" height="1" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
							<rect x={14-step} y={7} width="1" height="1" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
							<rect x={7} y={14-step} width="1" height="1" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />
						</React.Fragment>
					))}

					<rect x="1" y="6" width="1" height="1" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />
					<rect x="8" y="1" width="1" height="1" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
					<rect x="13" y="8" width="1" height="1" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
					<rect x="6" y="13" width="1" height="1" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />

					<polygon points="6,6 9,6 7.5,7.5" fill={COLORS[1]} stroke="#333" strokeWidth="0.02" />
					<polygon points="9,6 9,9 7.5,7.5" fill={COLORS.blue} stroke="#333" strokeWidth="0.02" />
					<polygon points="6,9 9,9 7.5,7.5" fill={COLORS[0]} stroke="#333" strokeWidth="0.02" />
					<polygon points="6,6 6,9 7.5,7.5" fill={COLORS.green} stroke="#333" strokeWidth="0.02" />

					<use href="#star" x="1.5" y="6.5" /> <use href="#dark-star" x="6.5" y="2.5" />
					<use href="#star" x="8.5" y="1.5" /> <use href="#dark-star" x="12.5" y="6.5" />
					<use href="#star" x="13.5" y="8.5" /> <use href="#dark-star" x="8.5" y="12.5" />
					<use href="#star" x="6.5" y="13.5" /> <use href="#dark-star" x="2.5" y="8.5" />
					<use href="#arrow-right" x="0" y="7" /> <use href="#arrow-down" x="7" y="0" />
					<use href="#arrow-left" x="14" y="7" /> <use href="#arrow-up" x="7" y="14" />

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
							const isEligibleToken = isMyTurn && G.hasRolled && !G.isRolling && !isAnimatingTokens &&
								pID === playerID && canTokenMove(trueProgress, G.diceRoll);

							return (
								<g key={`${pID}-${idx}`} transform={`translate(${pos.x + 0.5 + dx}, ${pos.y + 0.5 + dy}) scale(${scale})`}
									 onClick={() => isEligibleToken && moves.MoveToken(idx)}
									 style={{ cursor: isEligibleToken ? 'pointer' : 'default', transition: 'transform 0.15s linear' }}>

									<circle cx="0.05" cy="0.05" r="0.45" fill="rgba(0,0,0,0.3)" />

									{G.skins[pID] ? (
										<image href={G.skins[pID]} x="-0.4" y="-0.4" width="0.8" height="0.8" clipPath="url(#circleClip)" preserveAspectRatio="xMidYMid slice" />
									) : (
										<circle cx="0" cy="0" r="0.4" fill={`url(#${pID === '0' ? 'red' : 'yellow'}Token)`} stroke="white" strokeWidth="0.05"/>
									)}

									{G.skins[pID] && <circle cx="0" cy="0" r="0.4" fill="none" stroke="white" strokeWidth="0.05" />}
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
            display: flex; justify-content: center; align-items: center; gap: 40px; padding: 40px; 
            font-family: system-ui, sans-serif; background-color: #2b3b75; 
            background-image: radial-gradient(#3a4b86 15%, transparent 16%), radial-gradient(#3a4b86 15%, transparent 16%); 
            background-size: 30px 30px; background-position: 0 0, 15px 15px; min-height: 100vh; 
          }
          
          .ludo-control-panel { 
            width: 340px; background: white; border-radius: 16px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden;
          }
          .ludo-panel-top { 
            display: flex; justify-content: space-between; padding: 15px 20px; 
            background: #f8f9fa; border-bottom: 1px solid #eee;
          }
          .ludo-panel-section { display: flex; flex-direction: column; }
          .ludo-label { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .ludo-value-row { display: flex; align-items: center; gap: 8px; }
          .ludo-value { font-size: 22px; font-weight: 800; color: #333; margin: 0; }
          
          .ludo-action-btn { 
            background: #eee; border: none; padding: 6px 12px; border-radius: 8px; 
            font-size: 12px; font-weight: bold; color: #555; cursor: pointer; transition: 0.2s; 
          }
          .ludo-action-btn:hover { background: #ddd; }
          .skin-btn { background: #e3f2fd; color: #1976d2; padding: 4px 10px; font-size: 11px; }
          .skin-remove-btn { background: #ffebee; color: #d32f2f; padding: 4px 8px; font-size: 11px; }
          
          .ludo-dice-wrapper { 
            padding: 30px; display: flex; flex-direction: column; align-items: center; 
            justify-content: center; background: white; min-height: 140px;
          }
          .die-face { box-shadow: 0 5px 0 #bbb; transition: border-color 0.3s; }
          .dice-pulse { cursor: pointer; border-color: #2ecc71 !important; animation: pulse-green 1.5s infinite; }
          .ludo-action-hint { margin: 15px 0 0 0; font-size: 14px; font-weight: bold; color: #2ecc71; animation: fade-in 0.3s ease; }
          
          .ludo-board-wrapper { position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border-radius: 16px; width: 600px; max-width: 100%; background: #4a62ab; padding: 10px; }
          .ludo-svg { width: 100%; height: auto; display: block; background: #fff; border-radius: 10px; border: 4px solid #1e2c5e; box-sizing: border-box; }
          
          @media (max-width: 1200px) { 
            .ludo-container { flex-direction: column; padding: 15px; gap: 20px; justify-content: flex-start; } 
            .ludo-board-wrapper { order: 1; width: 100%; margin: 0 auto; }
            .ludo-control-panel { order: 2; width: 100%; max-width: 600px; } 
          }
          
          @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7), 0 5px 0 #bbb; } 70% { box-shadow: 0 0 0 15px rgba(46, 204, 113, 0), 0 5px 0 #bbb; } 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0), 0 5px 0 #bbb; } }
          @keyframes ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
          @keyframes roll3d { 0% { transform: scale(1) rotate(0deg); } 30% { transform: scale(0.6) rotateX(180deg) rotateY(180deg); } 60% { transform: scale(1.1) rotateX(360deg) rotateY(180deg) rotateZ(180deg); } 100% { transform: scale(1) rotateX(360deg) rotateY(360deg) rotateZ(360deg); } }
          @keyframes fade-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
			</div>
		</div>
	);
}
