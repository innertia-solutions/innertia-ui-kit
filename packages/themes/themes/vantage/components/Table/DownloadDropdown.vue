<script setup>
import {
  IconFileTypeXls,
  IconCodeDots,
  IconFileTypePdf,
  IconFileTypeCsv,
  IconDownload,
} from "@tabler/icons-vue";

const props = defineProps({
  tableRef: { type: Object, required: true },
});

const exportAllPages = ref(true);
const exportFilteredRows = ref(true);

const exportTable = (format) => {
  if (props.tableRef) {
    props.tableRef.exportTable(
      format,
      exportAllPages.value,
      exportFilteredRows.value
    );
  }
};
</script>
<template>
  <div
    class="hs-dropdown [--auto-close:inside] [--placement:bottom-right] relative inline-block"
  >
    <button
      id="hs-as-table-table-export-dropdown"
      type="button"
      class="py-1.5 sm:py-2 px-2.5 inline-flex items-center gap-x-1.5 text-sm sm:text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
      aria-haspopup="menu"
      aria-expanded="false"
      aria-label="Dropdown"
    >
      <IconDownload class="shrink-0 size-4" stroke="1.5" />
      Exportar
    </button>
    <div
      class="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden divide-y divide-slate-200 min-w-48 z-10 bg-white shadow-md rounded-lg p-2 mt-2 dark:divide-slate-700 dark:bg-slate-800 dark:border dark:border-slate-700 border-t border-slate-200 dark:border-slate-700"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="hs-as-table-table-export-dropdown"
    >
      <div class="py-2 first:pt-0 last:pb-0">
        <a
          class="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 dark:focus:bg-slate-700 dark:focus:text-slate-300"
          href="#"
          @click="exportTable('xlsx')"
        >
          <IconFileTypeXls class="shrink-0 size-5" stroke="1.5" />
          Excel
        </a>
        <a
          class="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 dark:focus:bg-slate-700 dark:focus:text-slate-300"
          href="#"
          @click="exportTable('csv')"
        >
          <IconFileTypeCsv class="shrink-0 size-5" stroke="1.5" />
          CSV
        </a>
        <a
          class="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 dark:focus:bg-slate-700 dark:focus:text-slate-300"
          href="#"
          @click="exportTable('pdf')"
        >
          <IconFileTypePdf class="shrink-0 size-5" stroke="1.5" />
          PDF
        </a>
        <a
          class="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300 dark:focus:bg-slate-700 dark:focus:text-slate-300"
          href="#"
          @click="exportTable('json')"
        >
          <IconCodeDots class="shrink-0 size-5" stroke="1.5" />
          JSON
        </a>
      </div>
      <!-- checkbox - todas las paginas -->
      <div
        class="flex flex-col gap-y-2 py-2 px-3"
        data-hs-dropdown-ignore-click
      >
        <label
          class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
        >
          <input
            type="checkbox"
            v-model="exportAllPages"
            class="shrink-0 border-slate-300 rounded-sm text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
          />
          Todas las páginas
        </label>

        <label
          class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
        >
          <input
            type="checkbox"
            v-model="exportFilteredRows"
            class="shrink-0 border-slate-300 rounded-sm text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
          />
          Solo filas filtradas
        </label>
      </div>
    </div>
  </div>
</template>
