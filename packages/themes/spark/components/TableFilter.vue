<script setup>
// Reusable filter panel — reads filterType from column definitions
// Column definition: { key, label, filterType: 'text' | 'select' | 'daterange', filterOptions?: [{value, label}] }

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }, // { [key]: value }
  columns: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue'])

const filterableColumns = computed(() =>
  props.columns.filter(c => c.filterType)
)

const localFilters = ref({ ...props.modelValue })

watch(() => props.modelValue, (v) => {
  localFilters.value = { ...v }
}, { deep: true })

const updateFilter = (key, value) => {
  localFilters.value[key] = value
  emit('update:modelValue', { ...localFilters.value })
}

const clearAll = () => {
  localFilters.value = {}
  emit('update:modelValue', {})
}

const activeCount = computed(() =>
  Object.values(localFilters.value).filter(v => v !== null && v !== undefined && v !== '').length
)
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <template v-for="col in filterableColumns" :key="col.key">
      <!-- text filter -->
      <div v-if="col.filterType === 'text'" class="flex flex-col gap-1 min-w-40">
        <label class="text-xs text-slate-500 dark:text-slate-400">{{ col.label }}</label>
        <input
          type="text"
          :value="localFilters[col.key] ?? ''"
          @input="updateFilter(col.key, $event.target.value)"
          :placeholder="`Filtrar ${col.label.toLowerCase()}...`"
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <!-- select filter -->
      <div v-else-if="col.filterType === 'select'" class="flex flex-col gap-1 min-w-40">
        <label class="text-xs text-slate-500 dark:text-slate-400">{{ col.label }}</label>
        <select
          :value="localFilters[col.key] ?? ''"
          @change="updateFilter(col.key, $event.target.value || null)"
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          <option
            v-for="opt in col.filterOptions ?? []"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
      </div>

      <!-- daterange filter -->
      <div v-else-if="col.filterType === 'daterange'" class="flex flex-col gap-1">
        <label class="text-xs text-slate-500 dark:text-slate-400">{{ col.label }}</label>
        <div class="flex items-center gap-1.5">
          <input
            type="date"
            :value="localFilters[col.key]?.from ?? ''"
            @change="updateFilter(col.key, { ...localFilters[col.key], from: $event.target.value || null })"
            class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span class="text-slate-400 text-sm">—</span>
          <input
            type="date"
            :value="localFilters[col.key]?.to ?? ''"
            @change="updateFilter(col.key, { ...localFilters[col.key], to: $event.target.value || null })"
            class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </template>

    <button
      v-if="activeCount > 0"
      type="button"
      @click="clearAll"
      class="py-2 px-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 self-end"
    >
      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      Limpiar ({{ activeCount }})
    </button>
  </div>
</template>
