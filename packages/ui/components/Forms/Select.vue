<script setup lang="ts">
const props = defineProps<{
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  error?: string | null
  label?: string
  hint?: string
}>()

const modelValue = defineModel<string | null>({ default: null })
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      {{ label }}
    </label>

    <select
      v-model="modelValue"
      :disabled="disabled"
      class="py-2 px-3 block w-full rounded-lg text-sm border focus:ring-0 focus:outline-none disabled:opacity-50 transition-colors"
      :class="[
        error
          ? 'border-red-400 dark:border-red-500 text-slate-800 dark:text-slate-300 bg-white dark:bg-transparent'
          : 'border-gray-200 dark:border-slate-700 focus:border-gray-400 text-slate-800 dark:text-slate-300 bg-white dark:bg-transparent',
      ]"
    >
      <option value="" disabled>{{ placeholder ?? 'Seleccionar...' }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <p v-if="error" class="text-xs text-red-500 dark:text-red-400 mt-1">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-slate-400 mt-1">{{ hint }}</p>
  </div>
</template>
