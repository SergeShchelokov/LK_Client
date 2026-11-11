const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function createLineGame({ size = 3, target = 3, marks = ["X", "O"] } = {}) {
  if (!Number.isInteger(size) || size < 2 || !Number.isInteger(target) || target < 2 || target > size) {
    throw new RangeError("Choose an integer target between 2 and the board size.");
  }
  if (marks.length !== 2 || marks.some(mark => typeof mark !== "string" || !mark.trim()) || marks[0] === marks[1]) {
    throw new TypeError("Use two distinct, nonempty player marks.");
  }

  return {
    size,
    target,
    marks: [...marks],
    board: Array(size * size).fill(null),
    turn: marks[0],
    winner: null,
    winningCells: [],
    draw: false,
    lastMove: null,
  };
}

function otherMark(game) {
  return game.marks.find(mark => mark !== game.turn);
}

function getWinningCells(board, size, target, index) {
  const mark = board[index];
  const row = Math.floor(index / size);
  const column = index % size;
  const winning = new Set();

  for (const [rowStep, columnStep] of directions) {
    const line = [index];

    for (const sign of [-1, 1]) {
      let r = row + rowStep * sign;
      let c = column + columnStep * sign;

      while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === mark) {
        line.push(r * size + c);
        r += rowStep * sign;
        c += columnStep * sign;
      }
    }

    if (line.length >= target) {
      for (const cell of line) winning.add(cell);
    }
  }

  return [...winning].sort((a, b) => a - b);
}

export function playMove(game, index) {
  if (game.winner || game.draw || !Number.isInteger(index) || game.board[index] !== null) {
    return game;
  }

  const board = game.board.slice();
  board[index] = game.turn;
  const winningCells = getWinningCells(board, game.size, game.target, index);
  const winner = winningCells.length ? game.turn : null;
  const draw = !winner && !board.includes(null);

  return {
    ...game,
    board,
    turn: winner || draw ? game.turn : otherMark(game),
    winner,
    winningCells,
    draw,
    lastMove: index,
  };
}

export function chooseMove(game) {
  if (game.winner || game.draw) return null;

  const emptyCells = [];
  game.board.forEach((mark, index) => {
    if (mark === null) emptyCells.push(index);
  });

  const winningMove = emptyCells.find(index => playMove(game, index).winner === game.turn);
  if (winningMove !== undefined) return winningMove;

  const opponent = { ...game, turn: otherMark(game) };
  const blockingMove = emptyCells.find(index => playMove(opponent, index).winner === opponent.turn);
  if (blockingMove !== undefined) return blockingMove;

  const center = (game.size - 1) / 2;
  const distanceToCenter = index => Math.abs(Math.floor(index / game.size) - center) + Math.abs(index % game.size - center);
  emptyCells.sort((a, b) => distanceToCenter(a) - distanceToCenter(b) || a - b);
  return emptyCells[0] ?? null;
}
