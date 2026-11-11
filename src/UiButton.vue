<script setup lang="ts">
withDefaults(defineProps<{ type?: 'button' | 'submit'; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' }>(), { type: 'button', disabled: false, loading: false, variant: 'primary' })
</script>

<template>
  <button :type="type" class="button" :class="`button--${variant}`" :disabled="disabled || loading" :aria-busy="loading">
    <span v-if="loading" class="button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
