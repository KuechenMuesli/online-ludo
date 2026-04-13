export function getAbsolutePosition(playerID, progress) {
	const startOffsets = { '0': 0, '1': 26 };
	return (progress - 1 + startOffsets[playerID]) % 52;
}

export function isSafeField(absolutePos) {
	const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];
	return safePositions.includes(absolutePos);
}

function executeMove(G, ctx, events, tokenIndex) {
	const currentPlayer = ctx.currentPlayer;
	const progress = G.players[currentPlayer].tokens[tokenIndex];
	const roll = G.diceRoll;

	if (progress === 0) {
		if (roll === 6) {
			G.players[currentPlayer].tokens[tokenIndex] = 1;
			G.diceRoll = null;
			G.hasRolled = false;
			if (G.sixesRolled >= 3) { G.sixesRolled = 0; events.endTurn(); }
		}
		return;
	}

	const newProgress = progress + roll;
	const absPos = getAbsolutePosition(currentPlayer, newProgress);
	G.players[currentPlayer].tokens[tokenIndex] = newProgress;

	const hasWon = G.players[currentPlayer].tokens.every(t => t === 57);
	if (hasWon) {
		G.winner = currentPlayer;
		G.diceRoll = null;
		G.hasRolled = false;
		events.setPhase('gameover');
		return;
	}

	let captured = false;
	let reachedBox = (newProgress === 57);

	if (newProgress <= 51 && !isSafeField(absPos)) {
		const opponent = currentPlayer === '0' ? '1' : '0';
		G.players[opponent].tokens.forEach((oppProg, oppIdx) => {
			if (oppProg >= 1 && oppProg <= 51) {
				if (absPos === getAbsolutePosition(opponent, oppProg)) {
					G.players[opponent].tokens[oppIdx] = 0;
					captured = true;
				}
			}
		});
	}

	let getsBonusRoll = (captured || reachedBox || (roll === 6 && G.sixesRolled < 3));

	G.diceRoll = null;
	G.hasRolled = false;

	if (!getsBonusRoll) {
		G.sixesRolled = 0;
		events.endTurn();
	}
}

function StartRoll({ G, ctx, playerID }) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (G.hasRolled || G.isRolling) return;
	G.isRolling = true;
}

function FinishRoll({ G, ctx, playerID, events }, result) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (!G.isRolling) return;

	G.isRolling = false;
	G.diceRoll = result;
	G.lastDiceRoll = G.diceRoll;
	G.hasRolled = true;

	if (G.diceRoll === 6) G.sixesRolled += 1;

	const p = G.players[ctx.currentPlayer];
	const validMoves = [];

	p.tokens.forEach((t, idx) => {
		if (t === 0 && G.diceRoll === 6) validMoves.push(idx);
		else if (t > 0 && t + G.diceRoll <= 57) validMoves.push(idx);
	});

	if (validMoves.length === 0) {
		if (G.diceRoll === 6 && G.sixesRolled < 3) {
			G.diceRoll = null;
			G.hasRolled = false;
		} else {
			G.diceRoll = null;
			G.hasRolled = false;
			G.sixesRolled = 0;
			events.endTurn();
		}
	} else if (validMoves.length === 1) {
		executeMove(G, ctx, events, validMoves[0]);
	}
}

function MoveToken({ G, ctx, playerID, events }, tokenIndex) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (!G.hasRolled) return;

	const progress = G.players[ctx.currentPlayer].tokens[tokenIndex];
	const roll = G.diceRoll;
	if (progress === 0 && roll !== 6) return;
	if (progress > 0 && progress + roll > 57) return;

	executeMove(G, ctx, events, tokenIndex);
}

function UpdateSkin({ G, playerID }, pid, base64Image) {
	const id = playerID !== undefined ? playerID : pid;
	G.skins[id] = base64Image;
}

function ChangeColor({ G, playerID }, pid, colorHex) {
	const id = playerID !== undefined ? playerID : pid;
	G.colors[id] = colorHex;
}

function ToggleReady({ G, playerID }, pid) {
	const id = playerID !== undefined ? playerID : pid;
	G.ready[id] = !G.ready[id];
}

function RequestRematch({ G, events, playerID }, pid) {
	const id = playerID !== undefined ? playerID : pid;
	G.rematchRequested[id] = true;

	if (G.rematchRequested['0'] && G.rematchRequested['1']) {
		G.players['0'].tokens = [0, 0, 0, 0];
		G.players['1'].tokens = [0, 0, 0, 0];
		G.diceRoll = null;
		G.lastDiceRoll = 1;
		G.hasRolled = false;
		G.isRolling = false;
		G.sixesRolled = 0;
		G.winner = null;
		G.rematchRequested = { '0': false, '1': false };

		events.setPhase('play');
	}
}

export const LudoGame = {
	name: 'p2p-ludo',
	setup: () => ({
		players: { '0': { tokens: [0, 0, 0, 0] }, '1': { tokens: [0, 0, 0, 0] } },
		skins: { '0': null, '1': null },
		colors: { '0': '#d32f2f', '1': '#fbc02d' },
		ready: { '0': false, '1': false },
		rematchRequested: { '0': false, '1': false },
		winner: null,
		diceRoll: null,
		lastDiceRoll: 1,
		hasRolled: false,
		isRolling: false,
		sixesRolled: 0,
	}),

	phases: {
		lobby: {
			start: true,
			next: 'play',
			turn: { activePlayers: { all: 'active' } },
			moves: { ChangeColor, ToggleReady, UpdateSkin },
			endIf: ({ G }) => (G.ready['0'] && G.ready['1']),
		},
		play: {
			moves: { StartRoll, FinishRoll, MoveToken, UpdateSkin },
			turn: {
				activePlayers: { currentPlayer: 'playing', others: 'playing' },
				stages: { playing: {} }
			}
		},
		gameover: {
			turn: { activePlayers: { all: 'active' } },
			moves: { RequestRematch, UpdateSkin }
		}
	}
};
