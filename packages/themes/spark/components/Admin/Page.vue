<script setup>
import * as TablerIcons from '@tabler/icons-vue'

const props = defineProps({
  title:       { type: String,  default: '' },
  description: { type: String,  default: '' },
  icon:        { type: String,  default: '' },
  color:       { type: String,  default: 'slate' },
})

const slots = useSlots()

const iconComponent = computed(() => props.icon ? TablerIcons[props.icon] ?? null : null)

const iconColorClass = computed(() => ({
  slate:  'bg-slate-100  dark:bg-slate-800  text-slate-600  dark:text-slate-400',
  blue:   'bg-blue-100   dark:bg-blue-900/30  text-blue-600   dark:text-blue-400',
  green:  'bg-green-100  dark:bg-green-900/30 text-green-600  dark:text-green-400',
  amber:  'bg-amber-100  dark:bg-amber-900/30 text-amber-600  dark:text-amber-400',
  red:    'bg-red-100    dark:bg-red-900/30   text-red-600    dark:text-red-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  rose:   'bg-rose-100   dark:bg-rose-900/30  text-rose-600   dark:text-rose-400',
  gray:   'bg-slate-100  dark:bg-slate-800    text-slate-600  dark:text-slate-400',
}[props.color] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'))
</script>

<template>
  <div class="space-y-4">

    <!-- Page header card -->
    <div v-if="title" class="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm px-4 py-3">
      <div class="flex items-center gap-x-4 min-w-0">
        <div v-if="iconComponent" class="shrink-0 size-10 rounded-xl flex items-center justify-center" :class="iconColorClass">
          <component :is="iconComponent" class="size-5" stroke="1.5" />
        </div>
        <div class="min-w-0">
          <div class="flex items-baseline gap-x-2 flex-wrap">
            <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h1>
            <template v-if="description">
              <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 self-center hidden sm:block" />
              <p class="text-sm text-slate-400 dark:text-slate-500">{{ description }}</p>
            </template>
          </div>
          <div v-if="$slots.breadcrumb" class="flex items-center gap-x-1 mt-0.5">
            <slot name="breadcrumb" />
          </div>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-x-2 shrink-0 ms-4">
        <slot name="actions" />
      </div>
    </div>

    <!-- Tabs (receives color prop) -->
    <div v-if="$slots.tabs">
      <slot name="tabs" :color="color" />
    </div>

    <!-- Page content -->
    <slot />

  </div>
</template>
