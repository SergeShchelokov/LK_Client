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

  const { size, target, turn } = game;
  const board = game.board.map(mark => mark === null ? 0 : mark === turn ? 1 : -1);
  const moves = board.flatMap((mark, index) => mark === 0 ? [index] : []);
  if (!moves.length) return null;

  const center = (size - 1) / 2;
  const distance = index => Math.abs(Math.floor(index / size) - center) + Math.abs(index % size - center);
  moves.sort((a, b) => distance(a) - distance(b) || a - b);
  const lines = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + dr * (target - 1);
        const endCol = col + dc * (target - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
        lines.push(Array.from({ length: target }, (_, step) => (row + dr * step) * size + col + dc * step));
      }
    }
  }
  const weights = Array.from({ length: target }, (_, count) => count ? 4 ** (count - target) : 0);
  const mate = lines.length + 10;

  function inspect(side) {
    let score = 0;
    let win = -1;
    let block = -1;
    let fork = false;
    for (const line of lines) {
      let own = 0;
      let opponent = 0;
      let empty = -1;
      for (const index of line) {
        if (board[index] === side) own++;
        else if (board[index] === -side) opponent++;
        else empty = index;
      }
      if (own && opponent) continue;
      if (own === target - 1 && empty >= 0) win = empty;
      if (opponent === target - 1 && empty >= 0) {
        fork ||= block !== -1 && block !== empty;
        block = empty;
      }
      score += (weights[own] ?? 0) - (weights[opponent] ?? 0);
    }
    return { score, win, block, fork };
  }

  function search(side, depth, ply, alpha, beta) {
    if (ply === moves.length) return 0;
    const { score, win, block, fork } = inspect(side);
    if (win !== -1) return mate - ply - 1;
    // Two distinct winning squares cannot both be covered in a single turn.
    if (fork) return -mate + ply + 2;
    if (depth === 0) return score;
    let best = -Infinity;
    for (const index of block === -1 ? moves : [block]) {
      if (board[index]) continue;
      board[index] = side;
      const value = -search(-side, depth - 1, ply + 1, -beta, -alpha);
      board[index] = 0;
      if (value > best) best = value;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return best;
  }

  const { win, block } = inspect(1);
  if (win !== -1) return win;
  if (block !== -1) return block;

  const forkThreats = [];
  if (size === 6 && target > 2 && board.filter(mark => mark === -1).length >= target - 2) {
    for (const reply of moves) {
      board[reply] = -1;
      if (inspect(1).fork) forkThreats.push(reply);
      board[reply] = 0;
    }
  }

  let candidates = moves;
  if (forkThreats.length) {
    // Break ties by leaving the opponent fewer viable forks.
    const ranked = moves.map(index => {
      board[index] = 1;
      let forkReplies = 0;
      for (const reply of forkThreats) {
        if (reply === index) continue;
        board[reply] = -1;
        const { fork, win } = inspect(1);
        if (fork && win === -1) forkReplies++;
        board[reply] = 0;
      }
      board[index] = 0;
      return { index, forkReplies };
    });
    ranked.sort((a, b) => a.forkReplies - b.forkReplies);
    candidates = ranked.map(({ index }) => index);
  }

  let bestMove = candidates[0];
  let bestScore = -Infinity;
  for (const index of candidates) {
    board[index] = 1;
    // This move plus three replies: two turns per player.
    const score = -search(-1, 3, 1, -Infinity, -bestScore);
    board[index] = 0;
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }
  return bestMove;
}
