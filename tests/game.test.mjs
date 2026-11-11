import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chooseMove, createLineGame, playMove } from '../src/line-game.mjs'

const newGame = () => createLineGame({ size: 6, target: 4, marks: ['FALSE', 'TRUE'] })

for (const [direction, moves] of [
  ['horizontal', [0, 1, 2, 3]],
  ['vertical', [0, 6, 12, 18]],
  ['diagonal ↘', [0, 7, 14, 21]],
  ['diagonal ↙', [5, 10, 15, 20]],
]) {
  test(`only four in a row wins: ${direction}`, () => {
    const rival = [30, 31, 32]
    let game = newGame()
    for (let step = 0; step < 3; step++) {
      game = playMove(playMove(game, moves[step]), rival[step])
    }
    assert.equal(game.winner, null)
    assert.equal(playMove(game, moves[0]), game)
    game = playMove(game, moves[3])
    assert.equal(game.winner, 'FALSE')
    assert.deepEqual(game.winningCells, moves)
    assert.equal(chooseMove(game), null)
    assert.equal(playMove(game, 35), game)
  })
}

test('a full board with no line is a draw', () => {
  const board = ['001100', '110011', '001100', '110011', '001100', '110011'].join('')
    .split('').map(mark => mark === '0' ? 'FALSE' : 'TRUE')
  board[0] = null
  const game = playMove({ ...newGame(), board }, 0)
  assert.equal(game.winner, null)
  assert.equal(game.draw, true)
})

test('computer plays a winning move before covering an immediate threat', () => {
  let game = newGame()
  assert.equal(chooseMove(playMove(game, 0)), 14)
  for (const index of [0, 6, 1, 7, 2]) game = playMove(game, index)
  assert.equal(chooseMove(game), 3)
  game = { ...game, board: game.board.map((mark, i) => i === 8 ? 'TRUE' : mark) }
  assert.equal(chooseMove(game), 9)
})

const position = (human, computer) => {
  const game = newGame()
  return {
    ...game,
    turn: 'TRUE',
    board: game.board.map((_, index) => human.includes(index) ? 'FALSE' : computer.includes(index) ? 'TRUE' : null),
  }
}
const free = game => game.board.flatMap((mark, index) => mark === null ? [index] : [])
const winsAt = (game, turn) => free(game).filter(index => playMove({ ...game, turn }, index).winner === turn)

test('computer blocks the square that would let FALSE create a fork', () => {
  const game = position([7, 9, 35], [29, 31])
  assert.deepEqual(winsAt(playMove({ ...game, turn: 'FALSE' }, 8), 'FALSE'), [6, 10])
  const next = playMove(game, chooseMove(game))
  for (const move of free(next)) assert.ok(winsAt(playMove(next, move), 'FALSE').length < 2)
})

test('computer creates two separate winning threats', () => {
  const game = position([0, 6, 35], [13, 14])
  const next = playMove(game, chooseMove(game))
  assert.deepEqual(winsAt(next, 'TRUE'), [12, 16])
  assert.deepEqual(winsAt(next, 'FALSE'), [])
})

test('computer sets up a fork on its second move against every reply', () => {
  const game = [0, 25, 30, 10, 4, 32, 22].reduce(playMove, newGame())
  const next = playMove(game, chooseMove(game))
  assert.deepEqual(winsAt(next, 'TRUE'), [])
  for (const move of free(next)) {
    const reply = playMove(next, move)
    assert.equal(reply.winner, null)
    const attack = playMove(reply, chooseMove(reply))
    assert.ok(attack.winner === 'TRUE' || (winsAt(attack, 'TRUE').length >= 2 && !winsAt(attack, 'FALSE').length), `reply at ${move}`)
  }
})
