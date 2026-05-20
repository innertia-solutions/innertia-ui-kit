<script setup>
import { IconSearch, IconAdjustmentsHorizontal, IconLayoutColumns, IconGripVertical } from '@tabler/icons-vue'

const props = defineProps({
  table:             { type: Object,  default: null },
  endpoint:          { type: String,  default: '' },
  columns:           { type: Array,   required: true },
  name:              { type: String,  default: '' },
  params:            { type: Object,  default: () => ({}) },
  checkable:         { type: Boolean, default: false },
  cached:            { type: Boolean, default: false },
  showReloadButton:  { type: Boolean, default: true },
  clickRowToOpen:    { type: Boolean, default: false },
  searchPlaceholder: { type: String,  default: 'Buscar...' },
  showSearch:        { type: Boolean, default: true },
  showFilters:       { type: Boolean, default: true },
  showExport:        { type: Boolean, default: true },
  filters:           { type: Array,   default: () => [] },
  splitRatio:        { type: Number,  default: 60 },
})

const resolvedEndpoint = computed(() => props.table?.endpoint ?? props.endpoint)
const resolvedName     = computed(() => props.table?.name     ?? props.name)

const emit = defineEmits(['row-click', 'loaded'])
const slots = useSlots()
const forwardedSlots = computed(() => {
  const excluded = new Set(['toolbar', 'preview'])
  return Object.fromEntries(Object.entries(slots).filter(([k]) => !excluded.has(k)))
})

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
const paginationHeight = ref(0)

const previewCacheKey = computed(() => `table-preview-${resolvedName.value}`)

const previewFromCache = ref(false)
const closePreview = () => { previewRow.value = null }

const previewTab  = ref('datos')
const tableMeta   = ref(null)

const hasHistory = computed(() => !!tableMeta.value?.has_history)
const resolvedHistoryEndpoint = computed(() => {
  if (!hasHistory.value || !previewRow.value?.id || !tableMeta.value?.entity_type) return null
  return `history/${tableMeta.value.entity_type}/${previewRow.value.id}`
})

watch(previewRow, () => { previewTab.value = 'datos' })

const handleRowClick = (row) => {
  if (previewEnabled.value) {
    previewRow.value = previewRow.value?.id === row.id ? null : row
  } else {
    emit('row-click', row)
  }
}

// Persist preview row in session cache when table cache is enabled
watch(previewRow, (row) => {
  if (!props.cached) return
  if (row) sessionStorage.setItem(previewCacheKey.value, JSON.stringify(row))
  else sessionStorage.removeItem(previewCacheKey.value)
})

// When data reloads, update previewRow with fresh data — close silently if deleted
const handleLoaded = (res) => {
  emit('loaded', res)
  if (res?.meta) tableMeta.value = res.meta
  if (previewRow.value && Array.isArray(res?.data)) {
    const fresh = res.data.find(r => r.id === previewRow.value.id)
    if (fresh) previewRow.value = fresh
    else closePreview()
  }
}

// Track pagination bar height so the overlay never covers it
let paginationObserver = null
watch(() => tableRef.value?.paginationBarRef, (el) => {
  paginationObserver?.disconnect()
  paginationObserver = null
  if (!el) return
  paginationHeight.value = el.offsetHeight
  paginationObserver = new ResizeObserver(() => {
    paginationHeight.value = el.offsetHeight
  })
  paginationObserver.observe(el)
}, { flush: 'post' })

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
onMounted(async () => {
  previewEnabled.value = !!slots.preview
  window.addEventListener('keydown', onEsc)
  // Restore preview from session cache — mark as from-cache to skip enter animation
  if (props.cached && previewEnabled.value) {
    try {
      const raw = sessionStorage.getItem(previewCacheKey.value)
      if (raw) {
        previewFromCache.value = true
        previewRow.value = JSON.parse(raw)
        await nextTick()
        previewFromCache.value = false
      }
    } catch {}
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc)
  paginationObserver?.disconnect()
})

// ─── Column panel ─────────────────────────────────────────────────────────────
const showColumnPanel   = ref(false)
const columnPanelRef    = ref(null)
const columnButtonRef   = ref(null)
const columnPanelStyle  = ref({})

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
  if (
    columnPanelRef.value && !columnPanelRef.value.contains(e.target) &&
    columnButtonRef.value && !columnButtonRef.value.contains(e.target)
  ) {
    showColumnPanel.value = false
  }
}
const onFilterPanelOutsideClick = (e) => {
  if (filterPanelRef.value && !filterPanelRef.value.contains(e.target)) {
    showFilterPanel.value = false
  }
}

watch(showColumnPanel, async (v) => {
  if (v) {
    await nextTick()
    const rect = columnButtonRef.value?.getBoundingClientRect()
    if (rect) {
      columnPanelStyle.value = {
        top:   rect.bottom + 6 + 'px',
        right: window.innerWidth - rect.right + 'px',
      }
    }
    document.addEventListener('mousedown', onColumnPanelOutsideClick)
  } else {
    document.removeEventListener('mousedown', onColumnPanelOutsideClick)
  }
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
    <div class="bg-card border border-card-line rounded-2xl shadow-sm overflow-hidden">

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-card-line">
        <div v-if="showSearch" class="flex-1 min-w-48">
          <Forms.Input v-model="search" type="search" :placeholder="searchPlaceholder" :icon-left="IconSearch" size="sm" />
        </div>

        <div v-if="showFilters && hasFilterableColumns" class="relative">
          <button
            type="button"
            @click="showFilterPanel = !showFilterPanel"
            :class="[
              'py-1.5 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
              showFilterPanel || activeFilterCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
                : 'border-card-line bg-card text-muted-foreground-1 hover:bg-muted-hover'
            ]"
          >
            <IconAdjustmentsHorizontal class="size-4" stroke="1.5" />
            Filtros{{ activeFilterCount > 0 ? ` (${activeFilterCount})` : '' }}
          </button>

          <!-- Filter panel — anchored below button -->
          <Transition
            enter-active-class="transition ease-out duration-150"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="showFilterPanel"
              ref="filterPanelRef"
              class="absolute top-full left-0 z-50 mt-1.5 bg-dropdown border border-dropdown-line rounded-xl shadow-2xl p-3 min-w-56 max-h-96 overflow-y-auto"
            >
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Filtros</p>
              <TableFilter v-model="activeFilters" :columns="filtersConfig" />
            </div>
          </Transition>
        </div>

        <slot name="toolbar" />

        <button
          ref="columnButtonRef"
          type="button"
          @click="showColumnPanel = !showColumnPanel"
          :class="[
            'py-1.5 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
            showColumnPanel
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
              : 'border-card-line bg-card text-muted-foreground-1 hover:bg-muted-hover'
          ]"
        >
          <IconLayoutColumns class="size-4" />
          Columnas
        </button>

        <TableExportable v-if="showExport" :table-ref="tableRef" :name="resolvedName" :columns="columns" />
      </div>

      <!-- Contenido: tabla siempre full width + preview overlay -->
      <div class="relative overflow-hidden">

        <!-- Tabla -->
        <Table
          ref="tableRef"
          :endpoint="resolvedEndpoint"
          :columns="columns"
          :name="resolvedName"
          :params="mergedParams"
          :search="search"
          :checkable="checkable"
          :cached="cached"
          :show-reload-button="showReloadButton"
          :click-row-to-open="clickRowToOpen"
          :preview-row-id="previewRow?.id ?? null"
          :preview-mode="!!previewEnabled"
          @row-click="handleRowClick"
          @loaded="handleLoaded"
          @page-change="closePreview"
          @per-page-change="closePreview"
        >
          <template v-for="(_, name) in forwardedSlots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </Table>

        <!-- Preview panel overlay — slides in from right, tapa la tabla -->
        <Transition
          :enter-active-class="previewFromCache ? '' : 'transition ease-out duration-200'"
          :enter-from-class="previewFromCache ? '' : 'opacity-0 translate-x-6'"
          :enter-to-class="previewFromCache ? '' : 'opacity-100 translate-x-0'"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-6"
        >
          <div
            v-if="previewRow && previewEnabled"
            class="absolute top-0 right-0 z-30 flex bg-card border-l border-card-line shadow-[-4px_0_16px_rgba(0,0,0,0.06)]"
            :style="{ width: (100 - currentRatio) + '%', bottom: paginationHeight + 'px' }"
          >
            <!-- Resize handle -->
            <div
              class="w-1 shrink-0 cursor-col-resize bg-surface hover:bg-indigo-300 dark:hover:bg-indigo-600 transition-colors"
              @mousedown="startResize"
            />
            <!-- Preview -->
            <div class="flex flex-col flex-1 overflow-hidden">

              <!-- Fixed header — always visible regardless of active tab -->
              <div v-if="$slots['preview-header']" class="shrink-0 border-b border-card-line">
                <slot name="preview-header" :row="previewRow" :close="closePreview" />
              </div>

              <!-- Scrollable content -->
              <div class="flex-1 overflow-y-auto min-h-0">
                <slot v-if="previewTab === 'datos'" name="preview" :row="previewRow" :close="closePreview" />
                <Table.PreviewTimeline
                  v-else-if="previewTab === 'bitacora' && resolvedHistoryEndpoint"
                  :endpoint="resolvedHistoryEndpoint"
                />
              </div>

              <!-- Tabs — bottom -->
              <div v-if="hasHistory" class="shrink-0 flex border-t border-card-line">
                <button
                  type="button"
                  @click="previewTab = 'datos'"
                  :class="[
                    'flex-1 py-2.5 text-xs font-semibold transition-colors border-r border-card-line border-t-2 -mt-px',
                    previewTab === 'datos'
                      ? 'border-t-card text-foreground'
                      : 'border-t-transparent text-muted-foreground hover:text-foreground hover:bg-muted-hover'
                  ]"
                >
                  Datos
                </button>
                <button
                  type="button"
                  @click="resolvedHistoryEndpoint && (previewTab = 'bitacora')"
                  :disabled="!resolvedHistoryEndpoint"
                  :class="[
                    'flex-1 py-2.5 text-xs font-semibold transition-colors border-t-2 -mt-px',
                    !resolvedHistoryEndpoint
                      ? 'border-t-transparent text-muted-foreground/40 cursor-not-allowed'
                      : previewTab === 'bitacora'
                        ? 'border-t-card text-foreground'
                        : 'border-t-transparent text-muted-foreground hover:text-foreground hover:bg-muted-hover'
                  ]"
                >
                  Bitácora
                </button>
              </div>

            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- Column panel — teleported to body to escape overflow-hidden -->
    <Teleport to="body">
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
          class="fixed z-50 bg-dropdown border border-dropdown-line rounded-xl shadow-2xl p-3 min-w-56 max-h-80 overflow-y-auto"
          :style="columnPanelStyle"
        >
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
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
              : 'hover:bg-muted-hover cursor-grab'"
          >
            <IconGripVertical class="size-4 text-muted-foreground-2 shrink-0" />
            <input
              type="checkbox"
              :checked="tableRef?.table.getColumn(col.key)?.getIsVisible() ?? true"
              @change="tableRef?.table.getColumn(col.key)?.toggleVisibility()"
              @click.stop
              class="rounded border-card-line bg-surface shrink-0 cursor-pointer"
            />
            <span class="text-sm text-foreground truncate">{{ col.label }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
