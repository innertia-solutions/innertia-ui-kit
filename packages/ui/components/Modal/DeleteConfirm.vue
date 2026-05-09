<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    size="sm"
    :closable="!loading"
    :backdrop-dismiss="!loading"
    :show-header="false"
    :show-footer="false"
  >
    <!-- Close Button -->
    <div class="absolute top-3 right-3">
      <button
        type="button"
        :disabled="loading"
        class="size-8 shrink-0 flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-400 dark:focus:bg-gray-600"
        aria-label="Close"
        @click="closeModal"
      >
        <span class="sr-only">Cerrar</span>
        <svg
          class="shrink-0 size-4"
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
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="p-5 sm:p-10">
      <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">
        {{ title || "Confirmar eliminación" }}
      </h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
        {{
          message ||
          "Esta acción es irreversible. ¿Estás seguro de que deseas continuar?"
        }}
      </p>
    </div>

    <!-- Footer -->
    <div class="pb-5 px-5 sm:px-10 flex justify-center items-center gap-x-3">
      <button
        type="button"
        :disabled="loading"
        class="py-2.5 px-3 w-full inline-flex justify-center items-center gap-x-1.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
        @click="closeModal"
      >
        {{ cancelText || "Cancelar" }}
      </button>
      <button
        type="button"
        :class="[
          'py-2.5 px-3 w-full inline-flex justify-center items-center gap-x-1.5 text-sm font-medium rounded-xl border border-transparent text-white disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden',
          dangerMode
            ? 'bg-red-500 hover:bg-red-600 focus:bg-red-600'
            : 'bg-purple-500 hover:bg-purple-600 focus:bg-purple-600',
        ]"
        :disabled="loading"
        @click="handleConfirm"
      >
        <svg
          v-if="loading"
          class="w-4 h-4 animate-spin mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
        {{ loading ? loadingText : confirmText || "Confirmar" }}
      </button>
    </div>
  </Modal>
</template>

<script setup>
import { ref } from "vue";

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  confirmText: {
    type: String,
    default: "",
  },
  cancelText: {
    type: String,
    default: "",
  },
  loadingText: {
    type: String,
    default: "Procesando...",
  },
  dangerMode: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

// State
const loading = ref(false);

// Exponer loading para que el padre pueda controlarlo
defineExpose({
  loading,
  setLoading: (value) => { loading.value = value },
  closeModal: () => {
    loading.value = false;
    emit("update:modelValue", false);
  }
});

// Methods
const closeModal = () => {
  if (!loading.value) {
    emit("update:modelValue", false);
    emit("cancel");
  }
};

const handleConfirm = () => {
  if (loading.value) return; // Prevenir doble click
  
  loading.value = true;
  
  // Emitir el evento confirm
  emit("confirm");
  
  // El loading se mantiene activo
  // Para desactivarlo, el padre debe llamar a una función o cerrar el modal
};
</script>
