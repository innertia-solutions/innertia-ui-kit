<script setup>
import { IconSearch, IconLayoutColumns, IconGripVertical, IconMinus, IconMaximize, IconX, IconPlus, IconChevronLeft, IconCheck, IconChevronDown } from '@tabler/icons-vue'

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
  autoClosePreview:  { type: Boolean, default: true },
})

const resolvedEndpoint = computed(() => props.table?.endpoint ?? props.endpoint)
const resolvedName     = computed(() => props.table?.name     ?? props.name)

const emit = defineEmits(['row-click', 'loaded'])
const slots = useSlots()
const forwardedSlots = computed(() => {
  const excluded = new Set(['toolbar', 'preview'])
  return Object.fromEntries(Object.entries(slots).filter(([k]) => !excluded.has(k)))
})

const search        = ref('')
const activeFilters = ref({})
const tableRef      = ref(null)

// ─── Filter config ─────────────────────────────────────────────────────────────
const filtersConfig = computed(() =>
  props.filters?.length ? props.filters : props.columns.filter(c => c.filterType)
)

const hasFilterableColumns = computed(() => filtersConfig.value.length > 0)

// ─── Notion-style filter ───────────────────────────────────────────────────────
const showFilterPanel  = ref(false)
const filterMenuStep   = ref('columns') // 'columns' | 'value'
const pendingCol       = ref(null)
const pendingValue     = ref(null)   // string for text/select, { singleDate, from, to } for daterange
const pendingDateOp    = ref('before') // 'before' | 'after' | 'between'
const filterMenuRef    = ref(null)
const filterAddBtnRef  = ref(null)
const filterMenuStyle  = ref({})

const dateOps = [
  { value: 'before',  label: 'antes de' },
  { value: 'after',   label: 'después de' },
  { value: 'between', label: 'entre' },
]

const activeFilterList = computed(() =>
  filtersConfig.value
    .filter(col => {
      const v = activeFilters.value[col.key]
      if (col.filterType === 'daterange') return v?.from || v?.to
      return v !== null && v !== undefined && v !== ''
    })
    .map(col => {
      const v = activeFilters.value[col.key]
      let displayOp = '', displayVal = ''
      if (col.filterType === 'daterange') {
        if (v.from && v.to) { displayOp = 'entre'; displayVal = `${v.from} y ${v.to}` }
        else if (v.from) { displayOp = 'después de'; displayVal = v.from }
        else { displayOp = 'antes de'; displayVal = v.to }
      } else if (col.filterType === 'select') {
        displayOp = 'es'
        displayVal = col.filterOptions?.find(o => o.value === v)?.label ?? v
      } else {
        displayOp = 'contiene'; displayVal = v
      }
      return { key: col.key, label: col.label, displayOp, displayVal, col }
    })
)

const activeFilterCount = computed(() => activeFilterList.value.length)

const mergedParams = computed(() => ({
  ...props.params,
  ...activeFilters.value,
}))

const removeFilter = (key) => {
  const u = { ...activeFilters.value }; delete u[key]; activeFilters.value = u
}

const openFilterMenu = async () => {
  filterMenuStep.value = 'columns'
  pendingCol.value = null
  showFilterPanel.value = true
  await nextTick()
  const rect = filterAddBtnRef.value?.getBoundingClientRect()
  if (rect) filterMenuStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
}

const toggleFilterMenu = async () => {
  if (showFilterPanel.value) { closeFilterMenu() } else { await openFilterMenu() }
}

const closeFilterMenu = () => {
  showFilterPanel.value = false
  filterMenuStep.value = 'columns'
  pendingCol.value = null
  pendingValue.value = null
}

const selectFilterColumn = (col) => {
  pendingCol.value = col
  const existing = activeFilters.value[col.key]
  if (col.filterType === 'daterange') {
    if (existing?.from && existing?.to) { pendingDateOp.value = 'between'; pendingValue.value = { from: existing.from, to: existing.to, singleDate: '' } }
    else if (existing?.from) { pendingDateOp.value = 'after'; pendingValue.value = { singleDate: existing.from, from: '', to: '' } }
    else if (existing?.to) { pendingDateOp.value = 'before'; pendingValue.value = { singleDate: existing.to, from: '', to: '' } }
    else { pendingDateOp.value = 'before'; pendingValue.value = { singleDate: '', from: '', to: '' } }
  } else {
    pendingValue.value = existing ?? ''
  }
  filterMenuStep.value = 'value'
}

const applyPendingFilter = () => {
  if (!pendingCol.value) return
  const col = pendingCol.value
  let v
  if (col.filterType === 'daterange') {
    if (pendingDateOp.value === 'between') v = { from: pendingValue.value.from, to: pendingValue.value.to }
    else if (pendingDateOp.value === 'after') v = { from: pendingValue.value.singleDate }
    else v = { to: pendingValue.value.singleDate }
  } else {
    v = pendingValue.value
  }
  activeFilters.value = { ...activeFilters.value, [col.key]: v || null }
  closeFilterMenu()
}

const openEditFilter = async (col) => {
  selectFilterColumn(col)
  showFilterPanel.value = true
  await nextTick()
  const rect = filterAddBtnRef.value?.getBoundingClientRect()
  if (rect) filterMenuStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
}

const onFilterMenuOutsideClick = (e) => {
  if (filterMenuRef.value && !filterMenuRef.value.contains(e.target) &&
      filterAddBtnRef.value && !filterAddBtnRef.value.contains(e.target)) {
    closeFilterMenu()
  }
}
watch(showFilterPanel, v => {
  if (v) document.addEventListener('mousedown', onFilterMenuOutsideClick)
  else document.removeEventListener('mousedown', onFilterMenuOutsideClick)
})

// ─── Preview panel ─────────────────────────────────────────────────────────────
const previewRow      = ref(null)
const currentRatio    = ref(props.splitRatio)
const containerRef    = ref(null)
const previewEnabled  = ref(false)
const paginationHeight = ref(0)

const previewCacheKey = computed(() => `table-preview-${resolvedName.value}`)

const previewFromCache = ref(false)
const previewPanelRef = ref(null)
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
    collapseDock()
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

const onEsc = (e) => { if (e.key === 'Escape') { if (previewRow.value) closePreview(); else collapseDock() } }

// ─── Auto-close preview on outside click ──────────────────────────────────────
const onDocMousedown = (e) => {
  if (props.autoClosePreview && previewRow.value && previewPanelRef.value && !previewPanelRef.value.contains(e.target)) {
    closePreview()
  }
}

// ─── Dock (minimizar preview) ──────────────────────────────────────────────────
const {
  docked,
  dock, undock: undockItem, isActive,
  activeDockId, activeDockRect,
  expandDock, collapseDock,
} = useDockedPreviews()
const route = useRoute()

function minimizePreview() {
  if (!previewRow.value) return
  const label    = previewRow.value.name ?? previewRow.value.title ?? previewRow.value.email ?? String(previewRow.value.id)
  const subtitle = previewRow.value.email ?? previewRow.value.description ?? null
  dock({
    id:        `${resolvedName.value}-${previewRow.value.id}`,
    label,
    subtitle,
    row:       { ...previewRow.value },
    tableName: resolvedName.value,
    route:     route.path,
  })
  closePreview()
}

// Item que debe mostrarse como mini-preview flotante (pertenece a esta tabla)
const floatingItem = computed(() =>
  activeDockId.value
    ? docked.value.find(d => d.id === activeDockId.value && d.tableName === resolvedName.value) ?? null
    : null
)

// Posición del panel flotante: centrado sobre el tab que lo abrió
const floatingPanelStyle = computed(() => {
  const rect   = activeDockRect.value
  const panelW = 384
  const bottom = 52
  if (!rect || typeof window === 'undefined') return { bottom: bottom + 'px', right: '16px' }
  const tabCenter = rect.left + rect.width / 2
  let right = window.innerWidth - tabCenter - panelW / 2
  right = Math.max(8, Math.min(right, window.innerWidth - panelW - 8))
  return { bottom: bottom + 'px', right: right + 'px' }
})

function expandToFull(item) {
  previewRow.value = item.row
  undockItem(item.id)
}

// Escuchar evento de restauración (fallback cuando la tabla no estaba montada)
onMounted(() => {
  useNuxtApp().hooks.hook('preview:restore', (item) => {
    if (item.tableName === resolvedName.value) previewRow.value = item.row
  })
})

onMounted(async () => {
  previewEnabled.value = !!slots.preview
  window.addEventListener('keydown', onEsc)
  document.addEventListener('mousedown', onDocMousedown)
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
  document.removeEventListener('mousedown', onDocMousedown)
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

// ─── Expose ───────────────────────────────────────────────────────────────────
const getSelectedRows = () => tableRef.value?.getSelectedRows()
const reload          = () => tableRef.value?.reload()
const clearCache      = () => tableRef.value?.clearCache()
const exportTable     = (format, allPages, filteredRows) => tableRef.value?.exportTable(format, allPages, filteredRows)

defineExpose({ getSelectedRows, reload, clearCache, exportTable, tableRef, closePreview })
</script>

<template>
  <div class="relative" ref="containerRef">

    <!-- Toolbar row (no card) -->
    <div class="flex flex-wrap items-center gap-2 mb-2">

      <!-- Search -->
      <div v-if="showSearch" class="flex-1 min-w-48 max-w-xs">
        <Forms.Input v-model="search" type="search" :placeholder="searchPlaceholder" :icon-left="IconSearch" size="sm" />
      </div>

      <!-- + Filtros button -->
      <div v-if="showFilters && hasFilterableColumns" ref="filterAddBtnRef" class="relative">
        <button
          type="button"
          @click="toggleFilterMenu"
          :class="[
            'inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-lg border transition-colors',
            activeFilterList.length
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300'
              : 'border-card-line bg-card text-muted-foreground-1 hover:bg-muted-hover'
          ]"
        >
          <IconPlus class="size-3.5" />
          Filtros{{ activeFilterList.length ? ` (${activeFilterList.length})` : '' }}
        </button>
      </div>

      <!-- Slot for custom toolbar buttons -->
      <slot name="toolbar" />

      <!-- Columnas button -->
      <button
        ref="columnButtonRef"
        type="button"
        @click="showColumnPanel = !showColumnPanel"
        :class="[
          'py-1.5 px-3 inline-flex items-center gap-2 text-sm font-medium rounded-lg border transition-colors',
          showColumnPanel
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300'
            : 'border-card-line bg-card text-muted-foreground-1 hover:bg-muted-hover'
        ]"
      >
        <IconLayoutColumns class="size-4" />
        Columnas
      </button>

      <TableExportable v-if="showExport" :table-ref="tableRef" :name="resolvedName" :columns="columns" />
    </div>

    <!-- Filter chips row (shown when filters active) -->
    <div v-if="activeFilterList.length" class="flex flex-wrap items-center gap-1.5 mb-2">
      <div
        v-for="chip in activeFilterList"
        :key="chip.key"
        class="inline-flex items-center text-xs rounded-lg border border-card-line bg-card overflow-hidden"
      >
        <span class="px-2.5 py-1 text-foreground font-medium border-r border-card-line bg-surface">{{ chip.label }}</span>
        <span class="px-2 py-1 text-muted-foreground">{{ chip.displayOp }}</span>
        <button
          type="button"
          @click.stop="openEditFilter(chip.col)"
          class="inline-flex items-center gap-1 px-2 py-1 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-x border-card-line"
        >
          {{ chip.displayVal }}
          <IconChevronDown class="size-3 opacity-60" />
        </button>
        <button
          type="button"
          @click.stop="removeFilter(chip.key)"
          class="px-1.5 py-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <IconX class="size-3" />
        </button>
      </div>
    </div>

    <!-- Table + preview overlay inside a minimal border box -->
    <div class="relative overflow-hidden rounded-xl border border-card-line">

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
          ref="previewPanelRef"
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

            <!-- Barra de acciones del preview -->
            <div class="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-card-line">
              <div class="flex-1 min-w-0">
                <slot name="preview-header" :row="previewRow" :close="closePreview" />
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover transition-colors"
                  title="Minimizar"
                  @click.stop="minimizePreview"
                >
                  <IconMinus class="size-3.5" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover transition-colors"
                  title="Cerrar"
                  @click.stop="closePreview"
                >
                  <IconX class="size-3.5" />
                </button>
              </div>
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

    <!-- ── Floating mini-preview (dock expand, estilo Gmail) ── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="floatingItem"
          class="fixed z-[60] w-96 flex flex-col bg-card border border-card-line rounded-t-xl shadow-2xl overflow-hidden"
          :style="{ ...floatingPanelStyle, maxHeight: 'min(480px, calc(100vh - 60px))' }"
        >
          <div class="flex items-center gap-2 px-3 py-2.5 border-b border-card-line shrink-0 bg-surface select-none">
            <span class="size-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
              {{ (floatingItem.label?.[0] ?? '?').toUpperCase() }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-foreground truncate leading-tight">{{ floatingItem.label }}</p>
              <p v-if="floatingItem.subtitle" class="text-xs text-muted-foreground truncate">{{ floatingItem.subtitle }}</p>
            </div>
            <button type="button" title="Expandir" class="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover transition-colors" @click.stop="expandToFull(floatingItem)">
              <IconMaximize class="size-3.5" />
            </button>
            <button type="button" title="Minimizar" class="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover transition-colors" @click.stop="collapseDock()">
              <IconMinus class="size-3.5" />
            </button>
            <button type="button" title="Cerrar" class="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" @click.stop="undockItem(floatingItem.id)">
              <IconX class="size-3.5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto min-h-0">
            <slot name="preview" :row="floatingItem.row" :close="() => undockItem(floatingItem.id)" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Filter menu — teleported to body -->
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
          v-if="showFilterPanel"
          ref="filterMenuRef"
          class="fixed z-[60] bg-dropdown border border-dropdown-line rounded-xl shadow-2xl min-w-52 overflow-hidden"
          :style="filterMenuStyle"
        >

          <!-- Step 1: column picker -->
          <template v-if="filterMenuStep === 'columns'">
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-2.5 pb-1">Filtrar por</p>
            <div class="pb-1.5">
              <button
                v-for="col in filtersConfig"
                :key="col.key"
                type="button"
                @click.stop="selectFilterColumn(col)"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted-hover transition-colors"
              >
                <span class="flex-1 text-left text-foreground">{{ col.label }}</span>
                <span v-if="activeFilters[col.key]" class="text-[10px] font-semibold text-indigo-500 uppercase">activo</span>
              </button>
            </div>
          </template>

          <!-- Step 2: value input -->
          <template v-else-if="filterMenuStep === 'value' && pendingCol">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-card-line bg-surface">
              <button
                type="button"
                @click.stop="filterMenuStep = 'columns'"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconChevronLeft class="size-4" />
              </button>
              <span class="text-sm font-medium text-foreground">{{ pendingCol.label }}</span>
            </div>
            <div class="p-3 space-y-2.5">

              <!-- text -->
              <input
                v-if="pendingCol.filterType === 'text'"
                v-model="pendingValue"
                type="text"
                autofocus
                @keydown.enter.stop="applyPendingFilter"
                @keydown.escape.stop="closeFilterMenu"
                placeholder="Buscar..."
                class="w-full rounded-lg border border-card-line bg-card text-foreground py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />

              <!-- select -->
              <div v-else-if="pendingCol.filterType === 'select'" class="space-y-0.5">
                <button
                  v-for="opt in pendingCol.filterOptions"
                  :key="opt.value"
                  type="button"
                  @click.stop="pendingValue = opt.value; applyPendingFilter()"
                  :class="[
                    'w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors text-left',
                    pendingValue === opt.value
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                      : 'hover:bg-muted-hover text-foreground'
                  ]"
                >
                  <span class="flex-1">{{ opt.label }}</span>
                  <IconCheck v-if="pendingValue === opt.value" class="size-3.5 shrink-0 text-indigo-500" />
                </button>
              </div>

              <!-- daterange -->
              <div v-else-if="pendingCol.filterType === 'daterange'" class="space-y-2">
                <div class="flex gap-1">
                  <button
                    v-for="op in dateOps"
                    :key="op.value"
                    type="button"
                    @click.stop="pendingDateOp = op.value"
                    :class="[
                      'flex-1 py-1 text-xs rounded-lg border transition-colors',
                      pendingDateOp === op.value
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                        : 'border-card-line text-muted-foreground hover:bg-muted-hover'
                    ]"
                  >
                    {{ op.label }}
                  </button>
                </div>
                <template v-if="pendingDateOp === 'between'">
                  <input type="date" v-model="pendingValue.from" class="w-full rounded-lg border border-card-line bg-card text-foreground py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <input type="date" v-model="pendingValue.to" class="w-full rounded-lg border border-card-line bg-card text-foreground py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </template>
                <input v-else type="date" v-model="pendingValue.singleDate" class="w-full rounded-lg border border-card-line bg-card text-foreground py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <button
                v-if="pendingCol.filterType !== 'select'"
                type="button"
                @click.stop="applyPendingFilter"
                class="w-full py-1.5 text-sm font-medium text-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </template>

        </div>
      </Transition>
    </Teleport>

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
