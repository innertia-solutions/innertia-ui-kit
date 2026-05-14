<script setup>
import { useVueTable, getCoreRowModel } from '@tanstack/vue-table'
import {
  IconArrowsSort,
  IconSortAscendingSmallBig,
  IconSortDescendingSmallBig,
  IconReload,
  IconBolt,
  IconLayoutColumns,
  IconGripVertical,
} from '@tabler/icons-vue'

const props = defineProps({
  endpoint: { type: String, required: true },
  columns: { type: Array, required: true }, // [{ key, label, sortable?, filterable?, class? }]
  params: { type: Object, default: () => ({}) },
  checkable: { type: Boolean, default: false },
  search: { type: String, default: '' },
  name: { type: String, required: true },
  cached: { type: Boolean, default: false },
  showReloadButton: { type: Boolean, default: true },
  viewMode: { type: String, default: 'table' }, // 'table' | 'grid'
  gridClass: { type: String, default: 'grid grid-cols-2 lg:grid-cols-3 gap-4' },
  clickRowToOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['update:search', 'row-click', 'loaded'])
const instance = getCurrentInstance()

// ─── API / toast ─────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

// ─── Local data ───────────────────────────────────────────────────────────────
const tableData = ref([])
const rowCount = ref(0)
const loading = ref(false)
const isDataFromCache = ref(false)
const lastDataLength = ref(10)
const lastRowHeight = ref(48)
const tableBodyRef = ref(null)
const skeletonRows = computed(() => Array.from({ length: lastDataLength.value }))
const isGridView = computed(() => props.viewMode === 'grid')

// ─── TanStack state ───────────────────────────────────────────────────────────
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const sorting = ref([])
const columnFilters = ref([])
const columnVisibility = ref({})
const columnOrder = ref([])
const rowSelection = ref({})
const isCustomPerPage = ref(false)

const makeUpdater = (stateRef) => (updater) => {
  stateRef.value = typeof updater === 'function' ? updater(stateRef.value) : updater
}

// ─── Column definitions ───────────────────────────────────────────────────────
const buildColumnDefs = () => {
  const defs = []
  if (props.checkable) {
    defs.push({
      id: 'select',
      header: 'select',
      enableSorting: false,
      enableColumnFilter: false,
      size: 48,
    })
  }
  for (const col of props.columns) {
    defs.push({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      enableSorting: col.sortable ?? false,
      enableColumnFilter: col.filterable ?? false,
      meta: { class: col.class ?? '', label: col.label },
    })
  }
  return defs
}

const columnDefs = buildColumnDefs()

const hasFilterableColumns = computed(() => props.columns.some(c => c.filterable))

// ─── TanStack table instance ──────────────────────────────────────────────────
const table = useVueTable({
  get data() { return tableData.value },
  get rowCount() { return rowCount.value },
  columns: columnDefs,
  state: {
    get pagination() { return pagination.value },
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get columnOrder() { return columnOrder.value },
    get rowSelection() { return rowSelection.value },
  },
  onPaginationChange: makeUpdater(pagination),
  onSortingChange: makeUpdater(sorting),
  onColumnFiltersChange: makeUpdater(columnFilters),
  onColumnVisibilityChange: makeUpdater(columnVisibility),
  onColumnOrderChange: makeUpdater(columnOrder),
  onRowSelectionChange: makeUpdater(rowSelection),
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  enableMultiSort: true,
  enableSortingRemoval: true,
  enableRowSelection: true,
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
const buildRequestParams = () => {
  const { sort, ...otherParams } = props.params
  return {
    search: props.search,
    page: pagination.value.pageIndex + 1,
    perPage: pagination.value.pageSize,
    sortColumns: sorting.value.map(s => ({ column: s.id, direction: s.desc ? 'desc' : 'asc' })),
    columnFilters: Object.fromEntries(columnFilters.value.map(f => [f.id, f.value])),
    ...otherParams,
  }
}

const fetchData = async () => {
  if (tableData.value.length > 0) {
    lastDataLength.value = tableData.value.length
    if (tableBodyRef.value?.children[0]) {
      const h = tableBodyRef.value.children[0].getBoundingClientRect().height
      if (h > 0) lastRowHeight.value = h
    }
  }

  tableData.value = []
  loading.value = true
  isDataFromCache.value = false

  try {
    const res = await api.post(props.endpoint, buildRequestParams())
    if (!res) return

    tableData.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    const m = res.meta ?? (res.current_page !== undefined ? res : null)
    rowCount.value = m?.total ?? tableData.value.length

    if (props.cached) saveToCache()
    emit('loaded', res)
  } catch (e) {
    console.error('[FullTable] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

// ─── Scheduled fetch (deduplicates concurrent state changes) ─────────────────
let fetchTimeout = null
const scheduleFetch = (delay = 0) => {
  if (fetchTimeout) clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => fetchData(), delay)
}

// ─── Cache ────────────────────────────────────────────────────────────────────
const cacheKey = computed(() =>
  props.cached && props.name ? `full_table_${props.name}` : null
)

const saveToCache = () => {
  if (!cacheKey.value || !tableData.value.length) return
  try {
    sessionStorage.setItem(cacheKey.value, JSON.stringify({
      data: tableData.value,
      rowCount: rowCount.value,
      pagination: pagination.value,
      sorting: sorting.value,
      columnFilters: columnFilters.value,
      columnVisibility: columnVisibility.value,
      columnOrder: columnOrder.value,
      search: props.search,
      timestamp: Date.now(),
    }))
  } catch (e) {
    console.warn('[FullTable] Cache save error:', e)
  }
}

const loadFromCache = () => {
  if (!cacheKey.value) return null
  try {
    const raw = sessionStorage.getItem(cacheKey.value)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.timestamp > 10 * 60 * 1000) {
      sessionStorage.removeItem(cacheKey.value)
      return null
    }
    if (cached.search !== props.search) return null
    return cached
  } catch { return null }
}

const clearCache = () => {
  if (cacheKey.value) sessionStorage.removeItem(cacheKey.value)
}

// ─── Restore guard (prevents watchers from triggering fetch during restore) ───
const isRestoring = ref(false)

const loadFromCacheOnMount = async () => {
  const cached = loadFromCache()
  if (!cached) return false

  isRestoring.value = true
  tableData.value = cached.data
  rowCount.value = cached.rowCount
  pagination.value = cached.pagination
  sorting.value = cached.sorting
  columnFilters.value = cached.columnFilters
  columnVisibility.value = cached.columnVisibility
  if (cached.columnOrder?.length) columnOrder.value = cached.columnOrder
  lastDataLength.value = cached.data.length
  isDataFromCache.value = true

  if (cached.search !== props.search) emit('update:search', cached.search)

  await nextTick()
  isRestoring.value = false
  return true
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(pagination, () => { if (!isRestoring.value) scheduleFetch(0) }, { deep: true })
watch(sorting, () => { if (!isRestoring.value) scheduleFetch(0) }, { deep: true })
watch(columnFilters, () => { if (!isRestoring.value) scheduleFetch(300) }, { deep: true })

watch(() => props.search, () => {
  if (isRestoring.value) return
  pagination.value = { ...pagination.value, pageIndex: 0 }
  scheduleFetch(500)
})

watch(() => props.params, () => {
  if (isRestoring.value) return
  pagination.value = { ...pagination.value, pageIndex: 0 }
  scheduleFetch(0)
}, { deep: true })

// ─── Lifecycle ────────────────────────────────────────────────────────────────
const initColumnOrder = () => {
  const ids = props.checkable ? ['select'] : []
  for (const col of props.columns) ids.push(col.key)
  columnOrder.value = ids
}

onMounted(async () => {
  initColumnOrder()
  try {
    const fromCache = await loadFromCacheOnMount()
    if (!fromCache) await fetchData()
  } catch (e) {
    console.error('[FullTable] Mount error:', e)
  }
})

onBeforeUnmount(() => {
  if (fetchTimeout) clearTimeout(fetchTimeout)
  if (props.cached && tableData.value.length > 0) saveToCache()
})

// ─── Column settings panel ────────────────────────────────────────────────────
const showColumnPanel = ref(false)
const columnPanelRef = ref(null)

const orderedColumns = computed(() => {
  if (!columnOrder.value.length) return props.columns
  return [...props.columns].sort((a, b) => {
    const ia = columnOrder.value.indexOf(a.key)
    const ib = columnOrder.value.indexOf(b.key)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
})

let draggedPanelKey = null
const dragOverPanelKey = ref(null)

const onPanelDragStart = (key) => { draggedPanelKey = key }
const onPanelDragOver = (e, key) => { e.preventDefault(); dragOverPanelKey.value = key }
const onPanelDragLeave = () => { dragOverPanelKey.value = null }
const onPanelDrop = (key) => {
  if (!draggedPanelKey || draggedPanelKey === key) return
  const order = [...columnOrder.value]
  const from = order.indexOf(draggedPanelKey)
  const to = order.indexOf(key)
  if (from < 0 || to < 0) return
  order.splice(from, 1)
  order.splice(to, 0, draggedPanelKey)
  columnOrder.value = order
  draggedPanelKey = null
  dragOverPanelKey.value = null
}

const handlePanelOutsideClick = (e) => {
  if (columnPanelRef.value && !columnPanelRef.value.contains(e.target)) {
    showColumnPanel.value = false
  }
}

watch(showColumnPanel, (v) => {
  if (v) document.addEventListener('mousedown', handlePanelOutsideClick)
  else document.removeEventListener('mousedown', handlePanelOutsideClick)
})

// ─── Header drag reorder ──────────────────────────────────────────────────────
let draggedHeaderId = null
const dragOverHeaderId = ref(null)

const onHeaderDragStart = (colId) => { draggedHeaderId = colId }
const onHeaderDragOver = (e, colId) => { e.preventDefault(); dragOverHeaderId.value = colId }
const onHeaderDragLeave = () => { dragOverHeaderId.value = null }
const onHeaderDrop = (colId) => {
  if (!draggedHeaderId || draggedHeaderId === colId) return
  const order = [...columnOrder.value]
  const from = order.indexOf(draggedHeaderId)
  const to = order.indexOf(colId)
  if (from < 0 || to < 0) return
  order.splice(from, 1)
  order.splice(to, 0, draggedHeaderId)
  columnOrder.value = order
  draggedHeaderId = null
  dragOverHeaderId.value = null
}

// ─── Row selection ────────────────────────────────────────────────────────────
const getSelectedRows = () => {
  const selected = table.getSelectedRowModel().rows.map(r => r.original)
  return table.getIsAllRowsSelected()
    ? { meta: { all: true }, rows: [] }
    : { meta: { all: false }, rows: selected }
}

// ─── Export ───────────────────────────────────────────────────────────────────
const exportTable = async (format, exportAllPages, exportFilteredRows) => {
  const { download } = useDownload()
  const id = crypto.randomUUID()
  toast.show({
    id, type: 'process', title: 'Descargando archivo...',
    progress: 0, progressLabel: 'Iniciando descarga', message: '', position: 'top-right',
  })

  const validFormats = ['csv', 'xlsx', 'pdf', 'json']
  const params = {
    ...buildRequestParams(),
    exportType: validFormats.includes(format) ? format : 'csv',
    exportAllPages,
    exportFilteredRows,
  }

  try {
    const { blob, headers } = await download(props.endpoint, params, {
      method: 'POST',
      onProgress: (p) => toast.update(id, { progress: p, progressLabel: `Descargando... ${p}%` }),
    })

    let fileName = 'export.' + format
    const cd = headers['content-disposition']
    if (cd) {
      const m = cd.match(/filename="(.+)"/)
      if (m?.[1]) fileName = m[1]
    }

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.setAttribute('download', fileName)
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)

    toast.update(id, { progress: 100, progressLabel: '¡Descarga completada!', message: 'El archivo se descargó correctamente.' })
    setTimeout(() => toast.remove(id), 2000)
  } catch (e) {
    toast.update(id, { progressLabel: 'Error en la descarga', message: e.message, severity: 'danger' })
    setTimeout(() => toast.remove(id), 3000)
  }
}

// ─── Per-page ─────────────────────────────────────────────────────────────────
const handlePerPageChange = (val) => {
  if (val === 'custom') { isCustomPerPage.value = true; return }
  table.setPageSize(parseInt(val))
}

const resetPerPage = () => {
  isCustomPerPage.value = false
  if (![10, 25, 50, 100].includes(pagination.value.pageSize)) table.setPageSize(10)
}

// ─── Row click ────────────────────────────────────────────────────────────────
const hasRowClickListener = computed(() => !!instance?.vnode?.props?.onRowClick)
const isRowClickEnabled = computed(() => props.clickRowToOpen || hasRowClickListener.value)

const interactiveSelector = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'summary',
  "[role='button']", "[role='link']", "[contenteditable='true']",
  '[data-row-click-ignore]', '[data-no-row-click]', '.hs-dropdown', '.dropdown',
].join(',')

const shouldIgnoreRowClick = (e) => {
  const t = e?.target
  if (!(t instanceof Element)) return false
  const el = t.closest(interactiveSelector)
  return !!el && e.currentTarget?.contains(el)
}

const handleRowClick = (row, e) => {
  if (!isRowClickEnabled.value || shouldIgnoreRowClick(e)) return
  emit('row-click', row.original, e)
}

const handleRowKeydown = (row, e) => {
  if (!isRowClickEnabled.value || shouldIgnoreRowClick(e)) return
  if (!['Enter', ' '].includes(e.key)) return
  e.preventDefault()
  emit('row-click', row.original, e)
}

// ─── Expose ───────────────────────────────────────────────────────────────────
defineExpose({
  getSelectedRows,
  loading,
  exportTable,
  reload: () => { clearCache(); fetchData() },
  clearCache,
  table,
})
</script>

<template>
  <div class="relative">

    <!-- Column settings panel -->
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
        class="absolute bottom-16 right-6 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-56 max-h-80 overflow-y-auto"
      >
        <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
          Columnas visibles
        </p>
        <div
          v-for="col in orderedColumns"
          :key="col.key"
          draggable="true"
          @dragstart="onPanelDragStart(col.key)"
          @dragover="(e) => onPanelDragOver(e, col.key)"
          @dragleave="onPanelDragLeave"
          @drop="onPanelDrop(col.key)"
          class="flex items-center gap-2 py-1.5 px-2 rounded-lg select-none transition-colors"
          :class="dragOverPanelKey === col.key
            ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-300 dark:ring-indigo-700'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-grab'"
        >
          <IconGripVertical class="size-4 text-slate-300 dark:text-slate-600 shrink-0" />
          <input
            type="checkbox"
            :checked="table.getColumn(col.key)?.getIsVisible() ?? true"
            @change="table.getColumn(col.key)?.toggleVisibility()"
            @click.stop
            class="rounded border-gray-300 dark:bg-slate-700 dark:border-slate-600 shrink-0 cursor-pointer"
          />
          <span class="text-sm text-slate-700 dark:text-slate-200 truncate">{{ col.label }}</span>
        </div>
      </div>
    </Transition>

    <!-- Table view -->
    <div v-if="!isGridView" class="overflow-x-auto relative">
      <table class="relative min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead class="relative z-20 bg-white dark:bg-slate-800">
          <template v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <!-- Main header row -->
            <tr
              class="divide-x divide-gray-200 dark:border-slate-700 dark:divide-slate-700"
              :class="{ 'border-t border-gray-200': loading || tableData.length > 0 }"
            >
              <th
                v-for="header in headerGroup.headers"
                :key="header.id"
                scope="col"
                :draggable="header.id !== 'select'"
                @dragstart="header.id !== 'select' && onHeaderDragStart(header.id)"
                @dragover="header.id !== 'select' && onHeaderDragOver($event, header.id)"
                @dragleave="onHeaderDragLeave"
                @drop="header.id !== 'select' && onHeaderDrop(header.id)"
                :class="[
                  header.id === 'select' ? 'text-center w-12' : (header.column.columnDef.meta?.class || 'min-w-52'),
                  dragOverHeaderId === header.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : '',
                  header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                ]"
                @click="header.column.getCanSort() && header.column.toggleSorting()"
              >
                <!-- Select all checkbox -->
                <template v-if="header.id === 'select'">
                  <input
                    type="checkbox"
                    :checked="table.getIsAllRowsSelected()"
                    :indeterminate="table.getIsSomeRowsSelected()"
                    @change="table.getToggleAllRowsSelectedHandler()($event)"
                    class="mx-2 shrink-0 border-gray-300 rounded-sm text-blue-900 focus:ring-blue-900 dark:bg-slate-800 dark:border-slate-600"
                  />
                </template>
                <!-- Regular column header -->
                <template v-else>
                  <div class="px-6 py-3 flex items-center gap-x-1 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-full">
                    {{ header.column.columnDef.meta?.label ?? header.id }}
                    <span v-if="header.column.getCanSort()">
                      <IconArrowsSort v-if="!header.column.getIsSorted()" class="size-4 opacity-40" />
                      <IconSortDescendingSmallBig v-else-if="header.column.getIsSorted() === 'desc'" class="size-5" />
                      <IconSortAscendingSmallBig v-else class="size-5" />
                    </span>
                  </div>
                </template>
              </th>
            </tr>

            <!-- Column filter row -->
            <tr
              v-if="hasFilterableColumns"
              class="divide-x divide-gray-200 dark:divide-slate-700 border-b border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
            >
              <th
                v-for="header in headerGroup.headers"
                :key="'f-' + header.id"
                :class="header.id === 'select' ? 'w-12' : 'px-3 py-1.5'"
              >
                <input
                  v-if="header.column.getCanFilter()"
                  :value="header.column.getFilterValue() ?? ''"
                  @input="(e) => header.column.setFilterValue(e.target.value || undefined)"
                  :placeholder="`Filtrar ${header.column.columnDef.meta?.label ?? ''}...`"
                  class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 px-2.5 py-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all"
                />
              </th>
            </tr>
          </template>
        </thead>

        <tbody ref="tableBodyRef" class="divide-y divide-gray-200 dark:divide-slate-700">
          <!-- Loading skeleton -->
          <tr
            v-if="loading"
            v-for="(_, i) in skeletonRows"
            :key="'sk-' + i"
            class="animate-pulse divide-x divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800"
          >
            <td
              v-for="header in (table.getHeaderGroups()[0]?.headers ?? [])"
              :key="'skc-' + header.id"
              :class="header.id === 'select' ? 'text-center w-12' : 'px-6'"
              :style="{ height: lastRowHeight + 'px' }"
            >
              <div v-if="header.id === 'select'" class="w-4 h-4 bg-gray-300 dark:bg-slate-600 rounded mx-auto"></div>
              <div v-else class="h-4 w-[50%] rounded bg-gray-200 dark:bg-slate-600"></div>
            </td>
          </tr>

          <!-- Empty skeleton -->
          <tr
            v-if="!loading && tableData.length === 0"
            v-for="(_, i) in skeletonRows"
            :key="'esk-' + i"
            class="divide-x divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800"
          >
            <td
              v-for="header in (table.getHeaderGroups()[0]?.headers ?? [])"
              :key="'eskc-' + header.id"
              :class="header.id === 'select' ? 'text-center w-12' : 'px-6'"
              :style="{ height: lastRowHeight + 'px' }"
            >
              <div v-if="header.id === 'select'" class="w-4 h-4 bg-gray-200 dark:bg-slate-600 rounded mx-auto"></div>
              <div v-else class="h-4 w-[50%] rounded bg-gray-100 dark:bg-slate-700"></div>
            </td>
          </tr>

          <!-- Data rows -->
          <tr
            v-else
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            @click="(e) => handleRowClick(row, e)"
            @keydown="(e) => handleRowKeydown(row, e)"
            :tabindex="isRowClickEnabled ? 0 : undefined"
            class="divide-x divide-gray-200 dark:divide-slate-700 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-900 transition-colors"
            :class="{
              'cursor-pointer': isRowClickEnabled,
              'bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-50/60': row.getIsSelected(),
            }"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              :class="[
                cell.column.id === 'select'
                  ? 'text-center w-12'
                  : 'px-6 py-3 text-sm text-slate-600 dark:text-slate-300',
                cell.column.id !== 'select' ? cell.column.columnDef.meta?.class ?? '' : '',
              ]"
              @click.stop="cell.column.id === 'select' ? null : undefined"
            >
              <!-- Select checkbox -->
              <template v-if="cell.column.id === 'select'">
                <div @click.stop>
                  <input
                    type="checkbox"
                    :checked="row.getIsSelected()"
                    :disabled="!row.getCanSelect()"
                    @change="row.getToggleSelectedHandler()($event)"
                    class="rounded border-gray-300 dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
              </template>
              <!-- Data cell with slot -->
              <template v-else>
                <slot :name="cell.column.id" :row="row.original" :value="cell.getValue()">
                  {{ cell.getValue() }}
                </slot>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state overlays -->
      <div
        v-if="!loading && tableData.length === 0 && !search && !columnFilters.length"
        class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 rounded-xl"
      >
        <slot name="empty">
          <p class="text-slate-400 dark:text-slate-500 text-lg font-medium italic">No hay registros</p>
        </slot>
      </div>

      <div
        v-if="!loading && tableData.length === 0 && (search || columnFilters.length)"
        class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 rounded-xl"
      >
        <slot name="empty-search">
          <p class="text-slate-400 dark:text-slate-500 text-lg font-medium italic">No hay registros en la búsqueda</p>
        </slot>
      </div>
    </div>

    <!-- Grid view -->
    <div v-else class="relative">
      <div v-if="loading" :class="gridClass">
        <div v-for="(_, i) in skeletonRows" :key="'gsk-' + i" class="animate-pulse">
          <slot name="grid-skeleton">
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div class="space-y-3">
                <div class="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                <div class="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
                <div class="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/4"></div>
              </div>
            </div>
          </slot>
        </div>
      </div>

      <div v-else-if="tableData.length > 0" :class="gridClass">
        <slot
          name="grid-item"
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          :row="row.original"
          :tanstack-row="row"
          :is-selected="row.getIsSelected()"
          :checkable="checkable"
          :toggle-row="() => row.toggleSelected()"
        >
          <div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow relative"
            :class="{ 'ring-2 ring-indigo-400 dark:ring-indigo-600': row.getIsSelected() }">
            <div v-if="checkable" class="absolute top-2 left-2 z-10">
              <input type="checkbox" :checked="row.getIsSelected()" @change="row.toggleSelected()"
                class="rounded border-gray-300 dark:bg-slate-800 dark:border-slate-600" />
            </div>
            <div class="space-y-2" :class="{ 'pt-6': checkable }">
              <div v-for="cell in row.getVisibleCells().filter(c => c.column.id !== 'select')" :key="cell.id" class="flex justify-between">
                <span class="text-sm text-gray-500 dark:text-slate-400">{{ cell.column.columnDef.meta?.label ?? cell.column.id }}:</span>
                <span class="text-sm text-gray-900 dark:text-slate-100">
                  <slot :name="cell.column.id" :row="row.original" :value="cell.getValue()">{{ cell.getValue() }}</slot>
                </span>
              </div>
            </div>
          </div>
        </slot>
      </div>

      <div v-else class="flex items-center justify-center py-12">
        <slot v-if="!search && !columnFilters.length" name="empty">
          <p class="text-gray-500 dark:text-slate-400 text-lg">No hay registros</p>
        </slot>
        <slot v-else name="empty-search">
          <p class="text-gray-500 dark:text-slate-400 text-lg">No hay registros en la búsqueda</p>
        </slot>
      </div>
    </div>

    <!-- Pagination & controls bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-y-4 sm:gap-y-0 mt-4 px-6 pb-6">
      <!-- Left: reload, total, cache, columns button -->
      <div class="flex items-center gap-x-4 flex-wrap gap-y-2">
        <!-- Reload button -->
        <div v-if="showReloadButton" class="flex items-center gap-x-2">
          <IconReload
            v-if="!loading"
            class="size-4 cursor-pointer text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
            @click="() => { clearCache(); isDataFromCache.value = false; fetchData() }"
          />
          <div v-else>
            <svg class="animate-spin size-4 text-slate-400 dark:text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" opacity=".25" />
              <path d="M22 12a10 10 0 0 1-10 10" />
            </svg>
          </div>
        </div>

        <!-- Total records -->
        <p class="text-sm text-gray-800 dark:text-slate-200 font-medium">{{ rowCount }} registros</p>

        <!-- Cache badge -->
        <div v-if="isDataFromCache && cached" class="group relative flex items-center">
          <div class="flex items-center gap-x-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-help hover:bg-emerald-500/20 transition-colors">
            <IconBolt class="size-3.5 fill-current" />
            <span class="text-[10px] font-bold uppercase tracking-wider">Instant</span>
          </div>
          <div class="absolute bottom-full mb-2 left-0 hidden group-hover:block w-48 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl z-50">
            <div class="font-bold mb-1 flex items-center gap-x-1.5 text-emerald-400">
              <IconBolt class="size-3" /> Datos en Caché
            </div>
            Los datos se cargaron instantáneamente desde la memoria local. Actualice para sincronizar con el servidor.
            <div class="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>

        <!-- Columns panel button -->
        <button
          @click="showColumnPanel = !showColumnPanel"
          class="flex items-center gap-x-1.5 py-1 px-2.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent"
          :class="showColumnPanel ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' : ''"
        >
          <IconLayoutColumns class="size-4" />
          Columnas
        </button>
      </div>

      <!-- Right: per-page + pagination -->
      <div class="flex items-center gap-x-8">
        <!-- Per page selector -->
        <div class="flex items-center gap-x-2">
          <label class="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Filas:</label>
          <select
            v-if="!isCustomPerPage"
            :value="pagination.pageSize"
            @change="(e) => handlePerPageChange(e.target.value)"
            class="bg-slate-100 dark:bg-slate-800 border-none text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-lg focus:ring-0 cursor-pointer py-1 pl-2 pr-8"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option value="custom">Otro...</option>
          </select>
          <div v-else class="flex items-center gap-x-1">
            <input
              type="number"
              :value="pagination.pageSize"
              @change="(e) => table.setPageSize(parseInt(e.target.value) || 10)"
              min="1" max="500"
              class="w-14 bg-slate-100 dark:bg-slate-800 border-none text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 py-1 px-2"
            />
            <button @click="resetPerPage" class="text-[10px] text-indigo-500 font-bold hover:underline">Volver</button>
          </div>
        </div>

        <!-- Pagination nav -->
        <nav class="flex justify-end items-center gap-x-1" aria-label="Pagination">
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10 disabled:opacity-30"
            :disabled="!table.getCanPreviousPage()"
            @click="table.previousPage()"
          >
            <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div class="flex items-center gap-x-1 mx-2">
            <span class="size-8 flex items-center justify-center text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white">
              {{ pagination.pageIndex + 1 }}
            </span>
            <span class="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mx-1">de</span>
            <span class="text-[10px] font-bold text-gray-400 dark:text-slate-500">{{ table.getPageCount() }}</span>
          </div>
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10 disabled:opacity-30"
            :disabled="!table.getCanNextPage()"
            @click="table.nextPage()"
          >
            <svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
