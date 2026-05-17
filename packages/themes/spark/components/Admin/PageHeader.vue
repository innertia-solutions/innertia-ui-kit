<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  sticky?: boolean
}>()
</script>

<template>
  <div :class="sticky ? 'sticky top-3 z-20' : ''">
  <div class="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm px-4 py-3">
    <div class="flex items-center gap-x-4">
      <slot name="icon" />
      <div>
        <div class="flex items-baseline gap-x-2">
          <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h1>
          <template v-if="description">
            <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 self-center"></span>
            <p class="text-sm text-slate-400 dark:text-slate-500">{{ description }}</p>
          </template>
        </div>
        <div v-if="$slots.breadcrumb" class="flex items-center gap-x-1 mt-0.5">
          <slot name="breadcrumb" />
        </div>
      </div>
    </div>
    <div class="flex items-center gap-x-2">
      <slot name="actions" />
    </div>
  </div>
  </div>
</template>
