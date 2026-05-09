<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps<{
  options: { value: string; label: string }[];
}>();

const modelValue = defineModel<string | null>({ default: null });

const selectRef = ref<HTMLSelectElement | null>(null);

const reinitHsSelect = async () => {
  await nextTick();

  const el = selectRef.value;
  if (!el) return;

  const instance = window.HSSelect?.getInstance?.(el);
  if (instance?.destroy) instance.destroy();

  new window.HSSelect(el);
};

watch(
  () => props.options,
  async () => {
    await reinitHsSelect();
  },
  { deep: true }
);

onMounted(() => {
  reinitHsSelect();
});
</script>

<template>
  <ClientOnly>
    <!-- Fallback mientras se monta en el cliente -->
    <template #fallback>
      <div
        class="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"
      ></div>
    </template>
    <div class="relative">
      <select
        ref="selectRef"
        class="hs-select w-full"
        :value="modelValue"
        @change="(e) => modelValue?.value ? modelValue.value = (e.target as HTMLSelectElement).value : null"
        data-hs-select='{
          "placeholder": "Select option...",
          "toggleTag": "<button type=\"button\" aria-expanded=\"false\"></button>",
          "toggleClasses": "hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative py-2 ps-4 pe-9 flex gap-x-2 text-nowrap w-full cursor-pointer bg-white border border-slate-200 rounded-lg text-start text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:focus:outline-hidden dark:focus:ring-1 dark:focus:ring-slate-600",
          "dropdownClasses": "mt-1 z-50 w-full max-h-72 p-1 space-y-0.5 bg-white border border-slate-200 rounded-lg overflow-hidden overflow-y-auto dark:bg-slate-900 dark:border-slate-700",
          "optionClasses": "py-2 px-4 w-full text-sm text-slate-800 cursor-pointer hover:bg-slate-100 rounded-lg focus:outline-hidden focus:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800",
          "optionTemplate": "<div class=\"flex justify-between items-center w-full\"><span data-title></span><span class=\"hidden hs-selected:block\"><svg class=\"shrink-0 size-3.5 text-blue-600 dark:text-blue-500 \" xmlns=\"http:.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"20 6 9 17 4 12\"/></svg></span></div>"
        }'
      >
        <option disabled value="">Selecciona</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <div class="absolute top-1/2 end-2.5 -translate-y-1/2">
        <svg
          class="shrink-0 size-4 text-slate-500 dark:text-slate-500"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m7 15 5 5 5-5"></path>
          <path d="m7 9 5-5 5 5"></path>
        </svg>
      </div>
    </div>
  </ClientOnly>
</template>
