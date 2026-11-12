<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ label: string; type?: string; error?: string; required?: boolean; readonly?: boolean; maxlength?: number; min?: string | number; max?: string | number; step?: string | number; placeholder?: string; id?: string; help?: string }>(), { type: 'text' })
const model = defineModel<T>({ required: true })
const uid = useId()
function update(event: Event) { const value = (event.target as HTMLInputElement).value; model.value = (props.type === 'number' ? Number(value) : value) as T }
</script>

<template>
  <div class="ui-field" :class="{ 'ui-field--invalid': error }">
    <label :for="id ?? uid">{{ label }}<span v-if="required" aria-hidden="true">*</span></label>
    <input :id="id ?? uid" :value="model" :type="type" :readonly="readonly" :required="required" :maxlength="maxlength" :min="min" :max="max" :step="step" :placeholder="placeholder" :aria-invalid="!!error" :aria-describedby="error || help ? `${id ?? uid}-message` : undefined" v-bind="$attrs" @input="update" />
    <small v-if="error || help" :id="`${id ?? uid}-message`" :class="{ 'input-error': error }" :role="error ? 'alert' : undefined">{{ error || help }}</small>
  </div>
</template>
