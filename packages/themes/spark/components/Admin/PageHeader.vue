<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h1>
      <p v-if="description" class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
    </div>
    <div class="flex items-center gap-x-2">
      <slot name="actions" />
    </div>
  </div>
</template>
