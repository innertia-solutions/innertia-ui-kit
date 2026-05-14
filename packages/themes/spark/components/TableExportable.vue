<script setup>
import {
  IconFileTypeXls,
  IconCodeDots,
  IconFileTypePdf,
  IconFileTypeCsv,
  IconDownload,
} from '@tabler/icons-vue'

// Modal with format selector, pre-filled filename, columns checkboxes
const props = defineProps({
  tableRef: { type: Object, default: null },
  name: { type: String, default: 'export' },
  columns: { type: Array, default: () => [] }, // [{ key, label }]
})

const isOpen = ref(false)
const format = ref('xlsx')
const filename = ref(props.name)
const selectedColumns = ref([])

watch(() => props.columns, (cols) => {
  selectedColumns.value = cols.map(c => c.key)
}, { immediate: true })

watch(() => props.name, (v) => { filename.value = v })

const formats = [
  { value: 'xlsx', label: 'Excel', icon: 'xlsx' },
  { value: 'csv', label: 'CSV', icon: 'csv' },
  { value: 'pdf', label: 'PDF', icon: 'pdf' },
  { value: 'json', label: 'JSON', icon: 'json' },
]

const toggleColumn = (key) => {
  const idx = selectedColumns.value.indexOf(key)
  if (idx >= 0) selectedColumns.value.splice(idx, 1)
  else selectedColumns.value.push(key)
}

const toggleAll = () => {
  if (selectedColumns.value.length === props.columns.length)
    selectedColumns.value = []
  else
    selectedColumns.value = props.columns.map(c => c.key)
}

const allSelected = computed(() => selectedColumns.value.length === props.columns.length)
const indeterminate = computed(() => selectedColumns.value.length > 0 && !allSelected.value)

const doExport = () => {
  if (props.tableRef) {
    props.tableRef.exportTable(format.value, true, true)
  }
  isOpen.value = false
}

const open = () => { isOpen.value = true }

defineExpose({ open })
</script>

<template>
  <div>
    <button
      type="button"
      @click="isOpen = true"
      class="py-1.5 sm:py-2 px-2.5 inline-flex items-center gap-x-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <IconDownload class="shrink-0 size-4" stroke="1.5" />
      Exportar
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="isOpen = false"
        >
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
          >
            <div
              v-if="isOpen"
              class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
            >
              <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 class="font-semibold text-slate-800 dark:text-slate-100">Exportar tabla</h3>
                <button
                  type="button"
                  @click="isOpen = false"
                  class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg class="size-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div class="px-6 py-5 space-y-5">
                <!-- Format selector -->
                <div>
                  <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Formato</p>
                  <div class="grid grid-cols-4 gap-2">
                    <button
                      v-for="f in formats"
                      :key="f.value"
                      type="button"
                      @click="format = f.value"
                      :class="[
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-colors',
                        format === f.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      ]"
                    >
                      <IconFileTypeXls v-if="f.value === 'xlsx'" class="size-5" stroke="1.5" />
                      <IconFileTypeCsv v-else-if="f.value === 'csv'" class="size-5" stroke="1.5" />
                      <IconFileTypePdf v-else-if="f.value === 'pdf'" class="size-5" stroke="1.5" />
                      <IconCodeDots v-else class="size-5" stroke="1.5" />
                      {{ f.label }}
                    </button>
                  </div>
                </div>

                <!-- Filename -->
                <div>
                  <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Nombre de archivo
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="filename"
                      type="text"
                      class="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span class="text-sm text-slate-400">.{{ format }}</span>
                  </div>
                </div>

                <!-- Columns -->
                <div v-if="columns.length > 0">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Columnas</p>
                    <button
                      type="button"
                      @click="toggleAll"
                      class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {{ allSelected ? 'Deseleccionar todas' : 'Seleccionar todas' }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    <label
                      v-for="col in columns"
                      :key="col.key"
                      class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedColumns.includes(col.key)"
                        @change="toggleColumn(col.key)"
                        class="rounded border-gray-300 dark:bg-slate-700 dark:border-slate-600 text-indigo-600"
                      />
                      <span class="text-sm text-slate-700 dark:text-slate-200 truncate">{{ col.label }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  @click="isOpen = false"
                  class="py-2 px-4 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  @click="doExport"
                  class="py-2 px-4 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                >
                  <IconDownload class="size-4" stroke="1.5" />
                  Exportar
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
