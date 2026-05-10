<script setup lang="ts">
import { useRoute } from 'vue-router'

interface Tab {
  label: string
  to: string
  icon?: any
  exact?: boolean
}

const props = withDefaults(defineProps<{
  tabs: Tab[]
  activeClass?: string
}>(), {
  activeClass: 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm',
})

const route = useRoute()

const isActive = (tab: Tab) =>
  tab.exact ? route.path === tab.to : route.path.startsWith(tab.to)
</script>

<template>
  <div class="flex items-center gap-x-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="flex items-center gap-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all"
      :class="isActive(tab)
        ? activeClass
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
    >
      <component :is="tab.icon" v-if="tab.icon" class="size-4" />
      {{ tab.label }}
    </NuxtLink>
  </div>
</template>
