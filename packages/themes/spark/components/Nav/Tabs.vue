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
  color?: string
  activeClass?: string
}>(), {
  color: 'blue',
})

const colorTextClass = computed(() => ({
  blue:   'text-blue-600   dark:text-blue-400',
  gray:   'text-slate-700  dark:text-slate-200',
  slate:  'text-slate-700  dark:text-slate-200',
  green:  'text-green-600  dark:text-green-400',
  amber:  'text-amber-600  dark:text-amber-400',
  red:    'text-red-600    dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
  rose:   'text-rose-600   dark:text-rose-400',
}[props.color] ?? 'text-blue-600 dark:text-blue-400'))

const resolvedActiveClass = computed(() =>
  props.activeClass ?? `bg-white dark:bg-slate-800 shadow-sm ${colorTextClass.value}`
)

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
        ? resolvedActiveClass
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
    >
      <component :is="tab.icon" v-if="tab.icon" class="size-4" />
      {{ tab.label }}
    </NuxtLink>
  </div>
</template>
