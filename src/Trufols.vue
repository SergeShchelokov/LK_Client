<script setup>
import { nextTick, ref, shallowRef, watch } from 'vue'
import { useTimer } from '@vuetify/v0'
import UiButton from './UiButton.vue'
import { chooseMove, createLineGame, playMove } from './line-game.mjs'

const props = defineProps({ active: Boolean })
const settings = { size: 6, target: 4, marks: ['FALSE', 'TRUE'] }
const game = shallowRef(createLineGame(settings))
const focused = shallowRef(0)
const grid = ref(null)
const done = () => game.value.winner || game.value.draw

const timer = useTimer(() => {
  if (!props.active || done() || game.value.turn !== 'TRUE') return
  const move = chooseMove(game.value)
  if (move !== null) game.value = playMove(game.value, move)
}, { duration: 480 })

watch(() => props.active, active => {
  if (active) timer.resume()
  else timer.pause()
}, { flush: 'sync' })

function move(index) {
  if (!props.active || game.value.turn !== 'FALSE') return
  const next = playMove(game.value, index)
  if (next === game.value) return
  game.value = next
  if (!done()) timer.start()
}

function navigate(event, index) {
  const row = Math.floor(index / settings.size)
  const col = index % settings.size
  const next = {
    ArrowLeft: col > 0 ? index - 1 : index,
    ArrowRight: col < settings.size - 1 ? index + 1 : index,
    ArrowUp: row > 0 ? index - settings.size : index,
    ArrowDown: row < settings.size - 1 ? index + settings.size : index,
  }[event.key]
  if (next === undefined) return
  event.preventDefault()
  focused.value = next
  grid.value?.querySelector(`[data-cell="${next}"]`)?.focus()
}

async function reset() {
  timer.stop()
  game.value = createLineGame(settings)
  focused.value = 0
  await nextTick()
  grid.value?.querySelector('[data-cell="0"]')?.focus()
}
</script>

<template>
  <section class="game" aria-labelledby="game-title">
    <h2 id="game-title">Сыграйте в трюфолс</h2>
    <p class="game-subtitle">Как крестики-нолики, только трюфолс!</p>
    <p class="game-status" :class="{ 'game-status--finished': done() }" role="status" aria-atomic="true">
      {{ game.winner === 'FALSE' ? 'Вы выиграли · FALSE' : game.winner === 'TRUE' ? 'Компьютер выиграл · TRUE' : game.draw ? 'Ничья' : game.turn === 'FALSE' ? 'Твой ход · FALSE' : 'Ход компьютера · TRUE' }}
    </p>
    <div ref="grid" class="game-grid" role="grid" aria-label="Поле Трюфолс" aria-describedby="game-instructions">
      <div v-for="row in settings.size" :key="row" class="game-row" role="row">
        <div v-for="column in settings.size" :key="column" role="gridcell">
          <template v-for="index in [(row - 1) * settings.size + column - 1]" :key="index">
            <button
              class="game-cell"
              :class="{ 'game-cell--winning': game.winningCells.includes(index) }"
              type="button"
              :data-cell="index"
              :tabindex="index === focused ? 0 : -1"
              :aria-disabled="Boolean(done() || game.turn !== 'FALSE' || game.board[index])"
              :aria-label="`Строка ${row}, столбец ${column}: ${game.board[index] || 'пусто'}`"
              @focus="focused = index"
              @click="move(index)"
              @keydown="navigate($event, index)"
            >{{ game.board[index] }}</button>
          </template>
        </div>
      </div>
    </div>
    <p id="game-instructions">Собери четыре FALSE подряд по горизонтали, вертикали или диагонали.</p>
    <UiButton variant="secondary" class="game-reset" @click="reset">Новая партия</UiButton>
  </section>
</template>
