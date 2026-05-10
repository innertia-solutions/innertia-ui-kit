<script setup lang="ts">
import { ref, computed } from 'vue'
import { IconEye, IconEyeOff } from '@tabler/icons-vue'

const props = defineProps<{
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  disabled?: boolean
  error?: string | null
  label?: string
  hint?: string
  iconLeft?: object | Function | null
  autocomplete?: string
}>()

const modelValue = defineModel<string | number | null>({ default: '' })

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type ?? 'text'
})

const baseClasses = 'py-2 px-3 block w-full rounded-lg text-sm text-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-0 focus:border-gray-400 focus:outline-none disabled:opacity-50 dark:bg-transparent dark:text-slate-300 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500'
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      {{ label }}
    </label>

    <div class="relative">
      <!-- Ícono izquierdo -->
      <div v-if="iconLeft" class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
        <component :is="iconLeft" class="size-4" />
      </div>

      <input
        v-model="modelValue"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :class="[
          baseClasses,
          iconLeft ? 'ps-9' : '',
          type === 'password' ? 'pe-10' : '',
          error ? '!border-red-400 dark:!border-red-500' : '',
        ]"
      />

      <!-- Toggle contraseña -->
      <button
        v-if="type === 'password'"
        type="button"
        tabindex="-1"
        class="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        @click="showPassword = !showPassword"
      >
        <component :is="showPassword ? IconEyeOff : IconEye" class="size-4" />
      </button>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-xs text-red-500 dark:text-red-400 mt-1">{{ error }}</p>

    <!-- Hint -->
    <p v-else-if="hint" class="text-xs text-slate-400 mt-1">{{ hint }}</p>
  </div>
</template>
