<script setup lang="ts">
const isOpen = ref(false)
const open = () => { isOpen.value = true }
const close = () => { isOpen.value = false }

provide('vantage:sidebar', { isOpen, open, close })
</script>

<template>
  <div class="bg-slate-50 dark:bg-slate-900 min-h-screen">

    <!-- Backdrop mobile -->
    <Transition enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300"
                leave-to-class="opacity-0"   leave-active-class="transition-opacity duration-300">
      <div v-if="isOpen" class="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click="close" />
    </Transition>

    <!-- Sidebar -->
    <aside
      tabindex="-1"
      aria-label="Sidebar"
      :class="[
        'fixed inset-y-0 start-0 z-60 w-65 h-full',
        'bg-white dark:bg-slate-800 border-e border-slate-200 dark:border-slate-700',
        'transition-transform duration-300',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
      ]"
    >
      <div class="flex flex-col h-full pt-3 lg:pt-6">

        <!-- Logo + close mobile -->
        <header class="h-11.5 ps-2 pe-2 lg:ps-5 flex items-center gap-x-1 shrink-0">
          <slot name="logo" />
          <div class="lg:hidden ms-auto">
            <button type="button"
              class="w-6 h-7 inline-flex justify-center items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="close">
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="7 8 3 12 7 16" />
                <line x1="21" x2="11" y1="12" y2="12" />
                <line x1="21" x2="11" y1="6"  y2="6"  />
                <line x1="21" x2="11" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <!-- Menu scrollable -->
        <div class="flex-1 min-h-0 mt-1.5 overflow-y-auto
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-slate-100
          [&::-webkit-scrollbar-thumb]:bg-slate-300
          dark:[&::-webkit-scrollbar-track]:bg-slate-700
          dark:[&::-webkit-scrollbar-thumb]:bg-slate-500">
          <slot name="menu" />
        </div>

        <!-- User footer -->
        <div class="shrink-0 border-t border-slate-200 dark:border-slate-700 p-5">
          <slot name="user-footer" />
        </div>

      </div>
    </aside>

    <!-- Main content -->
    <slot />

  </div>
</template>
