<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useTimer } from '@vuetify/v0'
import UiButton from './UiButton.vue'
import logo from './assets/trufols-logo.webp'
import introGlow from './assets/trufols-glow.svg'
import roundGlow from './assets/trufols-glow-round.svg'
import { chooseMove, createLineGame, playMove } from './line-game.mjs'

const props = defineProps({ active: Boolean })
const player = 'TRUE'
const computer = 'FALSE'
const settings = { size: 6, target: 4, marks: [player, computer] }
const rows = Array.from({ length: settings.size }, (_, row) =>
  Array.from({ length: settings.size }, (_, col) => row * settings.size + col))
const demoTiles = {
  4: { mark: computer, delay: '1.5s' },
  7: { mark: player, delay: '-.25s' },
  11: { mark: computer, delay: '6.2s' },
  14: { mark: player, delay: '-2s' },
  22: { mark: player, delay: '3s' },
  30: { mark: computer, delay: '4.6s' },
}

const game = shallowRef(createLineGame(settings))
const round = shallowRef(0)
const wins = shallowRef(0)
const losses = shallowRef(0)
const plural = new Intl.PluralRules('ru')
const finished = computed(() => Boolean(game.value.winner) || game.value.draw)
const canPlay = computed(() => props.active && round.value > 0 && !finished.value && game.value.turn === player)
const status = computed(() => {
  if (game.value.winner === player) return 'Вы выиграли за TRUE'
  if (game.value.winner === computer) return 'Компьютер выиграл за FALSE'
  if (game.value.draw) return 'Ничья'
  return game.value.turn === player ? 'Ваш ход за TRUE' : 'Ход компьютера за FALSE'
})

const timer = useTimer(() => {
  if (!props.active || finished.value || game.value.turn !== computer) return
  const index = chooseMove(game.value)
  if (index !== null) takeTurn(index)
}, { duration: 480 })

function formatCount(count) {
  return `${count} ${plural.select(count) === 'few' ? 'раза' : 'раз'}`
}

watch(() => props.active, active => {
  if (active) timer.resume()
  else timer.pause()
}, { flush: 'sync' })

function takeTurn(index) {
  const next = playMove(game.value, index)
  if (next === game.value) return false
  game.value = next
  if (next.winner === player) wins.value++
  if (next.winner === computer) losses.value++
  return true
}

function move(index, event) {
  if (event.detail === 0 || !canPlay.value) return
  if (takeTurn(index) && !finished.value) timer.start()
}

function start() {
  timer.stop()
  game.value = createLineGame(settings)
  round.value++
}
</script>

<template>
  <section class="game" :class="{ 'game--round': round > 0 }" aria-labelledby="game-title">
    <img class="game-glow" :src="round ? roundGlow : introGlow" alt="" />
    <div v-if="active" class="game-logo"><img :src="logo" alt="" decoding="async" /></div>
    <div class="game-heading">
      <h2 id="game-title">
        <template v-if="round">Раунд:{{ round }}</template>
        <template v-else>Сыграйте в Трюфолс</template>
      </h2>
      <p v-if="game.draw">Ничья</p>
      <p v-else-if="round">Постарайтесь не фолснуться!</p>
      <p v-else>Как крестики-нолики только трюфолс!</p>
    </div>
    <div class="game-actions">
      <UiButton v-if="!round || finished" class="game-action" variant="secondary" @click="start">
        {{ round ? 'Еще разок сыграть' : 'НАЧАТЬ-С' }}
      </UiButton>
    </div>
    <p v-if="round" class="sr-only" role="status" aria-atomic="true">{{ status }}</p>
    <p id="game-instructions" class="sr-only">Вы играете за TRUE. Соберите четыре отметки подряд по горизонтали, вертикали или диагонали.</p>
    <div class="game-grid" role="grid" aria-label="Поле Трюфолс" aria-describedby="game-instructions">
      <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="game-row" role="row">
        <div v-for="(index, col) in row" :key="index" role="gridcell">
          <button
            class="game-cell"
            type="button"
            :data-cell="index"
            tabindex="-1"
            :disabled="!canPlay || Boolean(game.board[index])"
            :aria-label="`Строка ${rowIndex + 1}, столбец ${col + 1}: ${game.board[index] || 'пусто'}`"
            @click="move(index, $event)"
          >
            <span v-if="game.board[index]" class="game-mark"
              :class="{ 'game-mark--winning': game.winningCells.includes(index) }">
              {{ game.board[index] }}
            </span>
            <span v-else-if="active && !round && demoTiles[index]" class="game-demo-tile" aria-hidden="true"
              :style="{ animationDelay: demoTiles[index].delay }">
              {{ demoTiles[index].mark }}
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="game-score">
      <p v-if="round < 2 && !finished">Ваши победы: 0</p>
      <template v-else>
        <p>Вы фолснулись {{ formatCount(losses) }}</p>
        <p v-if="wins">Вы трюнулись: {{ formatCount(wins) }}</p>
        <p v-else>Вы еще не трюнулись!</p>
      </template>
    </div>
  </section>
</template>
