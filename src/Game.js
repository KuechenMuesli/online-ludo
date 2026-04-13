// Game.js

export function getAbsolutePosition(playerID, progress) {
	const startOffsets = { '0': 0, '1': 26 };
	return (progress - 1 + startOffsets[playerID]) % 52;
}

export function isSafeField(absolutePos) {
	const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];
	return safePositions.includes(absolutePos);
}

function StartRoll({ G, ctx, playerID }) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (G.hasRolled || G.isRolling) return;
	G.isRolling = true;
}

function FinishRoll({ G, ctx, playerID, events, random }) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (!G.isRolling) return;

	G.isRolling = false;
	G.diceRoll = random.D6();
	G.lastDiceRoll = G.diceRoll;
	G.hasRolled = true;

	if (G.diceRoll === 6) G.sixesRolled += 1;

	const p = G.players[ctx.currentPlayer];
	const canMoveAny = p.tokens.some(t => {
		if (t === 0) return G.diceRoll === 6;
		return (t + G.diceRoll) <= 57;
	});

	if (!canMoveAny) {
		if (G.diceRoll === 6 && G.sixesRolled < 3) {
			G.diceRoll = null;
			G.hasRolled = false;
		} else {
			G.diceRoll = null;
			G.hasRolled = false;
			G.sixesRolled = 0;
			events.endTurn();
		}
	}
}

function MoveToken({ G, ctx, playerID, events }, tokenIndex) {
	if (playerID !== undefined && playerID !== ctx.currentPlayer) return;
	if (!G.hasRolled) return;

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

	if (progress + roll > 57) return;

	const newProgress = progress + roll;
	const absPos = getAbsolutePosition(currentPlayer, newProgress);
	G.players[currentPlayer].tokens[tokenIndex] = newProgress;

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

function UpdateSkin({ G, playerID }, pid, base64Image) {
	const id = playerID !== undefined ? playerID : pid;
	G.skins[id] = base64Image;
}

export const LudoGame = {
	name: 'p2p-ludo',
	setup: () => ({
		players: { '0': { tokens: [0, 0, 0, 0] }, '1': { tokens: [0, 0, 0, 0] } },
		skins: { '0': null, '1': null },
		diceRoll: null,
		lastDiceRoll: 1,
		hasRolled: false,
		isRolling: false,
		sixesRolled: 0,
	}),
	moves: { StartRoll, FinishRoll, MoveToken, UpdateSkin },
	turn: {
		// Die Lösung für das Rechte-Problem: Jeder ist "playing"
		activePlayers: { currentPlayer: 'playing', others: 'playing' },
		stages: {
			// Leeres Objekt bedeutet: Erlaubt alle im globalen "moves" Block definierten Moves für die Spieler in dieser Stage.
			playing: {}
		}
	},
	endIf: ({ G }) => {
		for (let p in G.players) {
			if (G.players[p].tokens.every(t => t === 57)) return { winner: p };
		}
	},
};
