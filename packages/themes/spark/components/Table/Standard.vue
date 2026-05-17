<script setup>
import { IconSearch, IconAdjustmentsHorizontal, IconLayoutColumns, IconGripVertical } from '@tabler/icons-vue'

const props = defineProps({
  endpoint:          { type: String,  required: true },
  columns:           { type: Array,   required: true },
  name:              { type: String,  required: true },
  params:            { type: Object,  default: () => ({}) },
  checkable:         { type: Boolean, default: false },
  cached:            { type: Boolean, default: true },
  showReloadButton:  { type: Boolean, default: true },
  clickRowToOpen:    { type: Boolean, default: false },
  searchPlaceholder: { type: String,  default: 'Buscar...' },
  showSearch:        { type: Boolean, default: true },
  showFilters:       { type: Boolean, default: true },
  showExport:        { type: Boolean, default: true },
  filters:           { type: Array,   default: () => [] },
  splitRatio:        { type: Number,  default: 60 },
})

const emit = defineEmits(['row-click', 'loaded'])
const slots = useSlots()

const search       = ref('')
const activeFilters = ref({})
const showFilterPanel = ref(false)
const filterPanelRef  = ref(null)
const tableRef     = ref(null)

// ─── Filter config ─────────────────────────────────────────────────────────────
const filtersConfig = computed(() =>
  props.filters?.length ? props.filters : props.columns.filter(c => c.filterType)
)

const hasFilterableColumns = computed(() => filtersConfig.value.length > 0)

const activeFilterCount = computed(() =>
  Object.values(activeFilters.value).filter(v => v !== null && v !== undefined && v !== '').length
)

const mergedParams = computed(() => ({
  ...props.params,
  ...activeFilters.value,
}))

// ─── Preview panel ─────────────────────────────────────────────────────────────
const previewRow      = ref(null)
const currentRatio    = ref(props.splitRatio)
const containerRef    = ref(null)
const previewEnabled  = ref(false)

const closePreview = () => { previewRow.value = null }

const handleRowClick = (row) => {
  if (previewEnabled.value) {
    previewRow.value = previewRow.value?.id === row.id ? null : row
  } else {
    emit('row-click', row)
  }
}

const startResize = (e) => {
  e.preventDefault()
  const onMove = (ev) => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const ratio = ((ev.clientX - rect.left) / rect.width) * 100
    currentRatio.value = Math.min(80, Math.max(25, ratio))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const onEsc = (e) => { if (e.key === 'Escape' && previewRow.value) closePreview() }
onMounted(() => {
  previewEnabled.value = !!slots.preview
  window.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

// ─── Column panel ─────────────────────────────────────────────────────────────
const showColumnPanel = ref(false)
const columnPanelRef  = ref(null)

const orderedColumns = computed(() => {
  if (!tableRef.value) return props.columns.filter(c => c.label)
  const ids = tableRef.value.table.getAllLeafColumns().map(c => c.id).filter(id => id !== 'select')
  return ids.map(id => props.columns.find(c => c.key === id)).filter(c => c?.label)
})

let draggedKey = null
const dragOverKey = ref(null)

const onDragStart = (key) => { draggedKey = key }
const onDragOver  = (e, key) => { e.preventDefault(); dragOverKey.value = key }
const onDragLeave = () => { dragOverKey.value = null }
const onDrop = (key) => {
  if (!draggedKey || draggedKey === key) return
  const ids = tableRef.value?.table.getAllLeafColumns().map(c => c.id) ?? []
  const from = ids.indexOf(draggedKey)
  const to   = ids.indexOf(key)
  if (from < 0 || to < 0) return
  ids.splice(from, 1)
  ids.splice(to, 0, draggedKey)
  const selIdx = ids.indexOf('select')
  if (selIdx > 0) { ids.splice(selIdx, 1); ids.unshift('select') }
  tableRef.value?.setColumnOrder(ids)
  draggedKey = null
  dragOverKey.value = null
}

const onColumnPanelOutsideClick = (e) => {
  if (columnPanelRef.value && !columnPanelRef.value.contains(e.target)) {
    showColumnPanel.value = false
  }
}
const onFilterPanelOutsideClick = (e) => {
  if (filterPanelRef.value && !filterPanelRef.value.contains(e.target)) {
    showFilterPanel.value = false
  }
}

watch(showColumnPanel, (v) => {
  if (v) document.addEventListener('mousedown', onColumnPanelOutsideClick)
  else document.removeEventListener('mousedown', onColumnPanelOutsideClick)
})
watch(showFilterPanel, (v) => {
  if (v) document.addEventListener('mousedown', onFilterPanelOutsideClick)
  else document.removeEventListener('mousedown', onFilterPanelOutsideClick)
})

// ─── Expose ───────────────────────────────────────────────────────────────────
const getSelectedRows = () => tableRef.value?.getSelectedRows()
const reload          = () => tableRef.value?.reload()
const clearCache      = () => tableRef.value?.clearCache()
const exportTable     = (format, allPages, filteredRows) => tableRef.value?.exportTable(format, allPages, filteredRows)

defineExpose({ getSelectedRows, reload, clearCache, exportTable, tableRef })
</script>

<template>
  <div class="relative" ref="containerRef">

    <!-- Card único -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div v-if="showSearch" class="flex-1 min-w-48">
          <Forms.Input v-model="search" type="search" :placeholder="searchPlaceholder" :icon-left="IconSearch" />
        </div>

        <button
          v-if="showFilters && hasFilterableColumns"
          type="button"
          @click="showFilterPanel = !showFilterPanel"
          :class="[
            'py-1.5 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
            showFilterPanel || activeFilterCount > 0
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          ]"
        >
          <IconAdjustmentsHorizontal class="size-4" stroke="1.5" />
          Filtros{{ activeFilterCount > 0 ? ` (${activeFilterCount})` : '' }}
        </button>

        <slot name="actions" />

        <button
          type="button"
          @click="showColumnPanel = !showColumnPanel"
          :class="[
            'py-1.5 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
            showColumnPanel
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          ]"
        >
          <IconLayoutColumns class="size-4" />
          Columnas
        </button>

        <TableExportable v-if="showExport" :table-ref="tableRef" :name="name" :columns="columns" />
      </div>

      <!-- Contenido: tabla + preview en flex -->
      <div :class="previewRow && previewEnabled ? 'flex items-stretch' : ''">

        <!-- Tabla -->
        <div
          :style="previewRow && previewEnabled ? { width: currentRatio + '%', flexShrink: 0, minWidth: 0 } : {}"
        >
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
            :preview-row-id="previewRow?.id ?? null"
            :preview-mode="!!previewEnabled"
            @row-click="handleRowClick"
            @loaded="emit('loaded', $event)"
          >
            <template v-for="(_, name) in $slots" #[name]="slotProps">
              <slot :name="name" v-bind="slotProps ?? {}" />
            </template>
          </Table>
        </div>

        <!-- Divider + preview -->
        <template v-if="previewRow && previewEnabled">
          <!-- Resize handle -->
          <div
            class="w-1 shrink-0 cursor-col-resize bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-300 dark:hover:bg-indigo-600 transition-colors"
            @mousedown="startResize"
          />
          <!-- Preview -->
          <div
            class="flex flex-col overflow-y-auto border-l border-slate-200 dark:border-slate-700"
            :style="{ width: (100 - currentRatio) + '%', flexShrink: 0, minWidth: 0 }"
          >
            <slot name="preview" :row="previewRow" :close="closePreview" />
          </div>
        </template>

      </div>
    </div>

    <!-- Filter panel — outside overflow-hidden so never clipped -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="showFilterPanel && hasFilterableColumns"
        ref="filterPanelRef"
        class="absolute top-12 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-64 max-h-96 overflow-y-auto"
      >
        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
          Filtros
        </p>
        <TableFilter v-model="activeFilters" :columns="filtersConfig" />
      </div>
    </Transition>

    <!-- Column panel — outside overflow-hidden so never clipped -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="showColumnPanel"
        ref="columnPanelRef"
        class="absolute top-12 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-56 max-h-80 overflow-y-auto"
      >
        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
          Columnas visibles
        </p>
        <div
          v-for="col in orderedColumns"
          :key="col.key"
          draggable="true"
          @dragstart="onDragStart(col.key)"
          @dragover="(e) => onDragOver(e, col.key)"
          @dragleave="onDragLeave"
          @drop="onDrop(col.key)"
          class="flex items-center gap-2 py-1.5 px-2 rounded-lg select-none transition-colors"
          :class="dragOverKey === col.key
            ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-grab'"
        >
          <IconGripVertical class="size-4 text-slate-300 dark:text-slate-600 shrink-0" />
          <input
            type="checkbox"
            :checked="tableRef?.table.getColumn(col.key)?.getIsVisible() ?? true"
            @change="tableRef?.table.getColumn(col.key)?.toggleVisibility()"
            @click.stop
            class="rounded border-gray-300 dark:bg-slate-700 dark:border-slate-600 shrink-0 cursor-pointer"
          />
          <span class="text-sm text-slate-700 dark:text-slate-200 truncate">{{ col.label }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>
