<script setup>
import { IconSearch, IconAdjustmentsHorizontal } from '@tabler/icons-vue'

// Standard admin table: search + filters + Table (TanStack) + export
const props = defineProps({
  endpoint: { type: String, required: true },
  columns: { type: Array, required: true },
  name: { type: String, required: true },
  params: { type: Object, default: () => ({}) },
  checkable: { type: Boolean, default: false },
  cached: { type: Boolean, default: true },
  showReloadButton: { type: Boolean, default: true },
  clickRowToOpen: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: 'Buscar...' },
  showSearch: { type: Boolean, default: true },
  showFilters: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
})

const emit = defineEmits(['row-click', 'loaded'])

const search = ref('')
const filters = ref({})
const showFilterPanel = ref(false)
const tableRef = ref(null)

const hasFilterableColumns = computed(() =>
  props.columns.some(c => c.filterType)
)

const activeFilterCount = computed(() =>
  Object.values(filters.value).filter(v => v !== null && v !== undefined && v !== '').length
)

// Merge filters into params
const mergedParams = computed(() => ({
  ...props.params,
  ...filters.value,
}))

const getSelectedRows = () => tableRef.value?.getSelectedRows()
const reload = () => tableRef.value?.reload()
const clearCache = () => tableRef.value?.clearCache()
const exportTable = (format, allPages, filteredRows) => tableRef.value?.exportTable(format, allPages, filteredRows)

defineExpose({ getSelectedRows, reload, clearCache, exportTable, tableRef })
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Search -->
      <div v-if="showSearch" class="relative flex-1 min-w-48">
        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <IconSearch class="size-4 text-slate-400" stroke="1.5" />
        </div>
        <input
          v-model="search"
          type="search"
          :placeholder="searchPlaceholder"
          class="block w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 ps-10 pe-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <!-- Filter toggle -->
      <button
        v-if="showFilters && hasFilterableColumns"
        type="button"
        @click="showFilterPanel = !showFilterPanel"
        :class="[
          'py-2 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
          showFilterPanel || activeFilterCount > 0
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        ]"
      >
        <IconAdjustmentsHorizontal class="size-4" stroke="1.5" />
        Filtros
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex items-center justify-center size-5 rounded-full bg-indigo-600 text-white text-xs font-bold"
        >{{ activeFilterCount }}</span>
      </button>

      <slot name="actions" />

      <!-- Export -->
      <TableExportable
        v-if="showExport"
        :table-ref="tableRef"
        :name="name"
        :columns="columns"
      />
    </div>

    <!-- Filter panel -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showFilterPanel && hasFilterableColumns"
        class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
      >
        <TableFilter v-model="filters" :columns="columns" />
      </div>
    </Transition>

    <!-- Table -->
    <Table
      ref="tableRef"
      :endpoint="endpoint"
      :columns="columns"
      :name="name"
      :params="mergedParams"
      :search="search"
      :checkable="checkable"
      :cached="cached"
      :show-reload-button="showReloadButton"
      :click-row-to-open="clickRowToOpen"
      @row-click="emit('row-click', $event)"
      @loaded="emit('loaded', $event)"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </Table>
  </div>
</template>
