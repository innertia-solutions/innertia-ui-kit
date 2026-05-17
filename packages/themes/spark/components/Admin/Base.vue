<script setup lang="ts">
const props = defineProps<{
  floating?: boolean
  user?: { name?: string; email?: string } | null
}>()

const emit = defineEmits<{ logout: [] }>()

const isOpen = ref(false)
const open  = () => { isOpen.value = true }
const close = () => { isOpen.value = false }

provide('vantage:sidebar', { isOpen, open, close })

const userInitial = computed(() =>
  props.user?.name?.charAt(0).toUpperCase() ?? props.user?.email?.charAt(0).toUpperCase() ?? 'U'
)
</script>

<template>
  <div class="bg-slate-50 dark:bg-slate-950 min-h-screen">

    <!-- Mobile backdrop -->
    <Transition
      enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300"
      leave-to-class="opacity-0"   leave-active-class="transition-opacity duration-300"
    >
      <div v-if="isOpen" class="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click="close" />
    </Transition>

    <!-- Sidebar -->
    <aside
      tabindex="-1"
      aria-label="Sidebar"
      :class="[
        'fixed inset-y-0 start-0 z-60 w-65',
        'transition-transform duration-300 lg:translate-x-0',
        isOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
        floating ? 'p-3' : '',
      ]"
    >
      <div
        :class="[
          'flex flex-col h-full',
          floating
            ? 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'
            : 'bg-white dark:bg-slate-800 border-e border-slate-200 dark:border-slate-700',
        ]"
      >
        <!-- Logo + mobile close -->
        <header class="flex items-center gap-x-1 px-3 pt-4 pb-2 shrink-0">
          <div class="flex-1 min-w-0">
            <slot name="logo" />
          </div>
          <button
            type="button"
            class="lg:hidden size-7 inline-flex justify-center items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            @click="close"
          >
            <svg class="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Search -->
        <div v-if="$slots.search" class="px-3 pb-2 shrink-0">
          <slot name="search" />
        </div>

        <!-- Nav menu (scrollable) -->
        <div class="flex-1 min-h-0 overflow-y-auto
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-slate-200
          dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          <slot name="menu" />
        </div>

        <!-- User footer -->
        <div class="shrink-0 border-t border-slate-100 dark:border-slate-700/60 px-3 py-3 space-y-2">

          <!-- User info + logout -->
          <div v-if="user" class="flex items-center gap-x-2.5 px-1">
            <div class="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
              {{ userInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{{ user.name ?? user.email }}</p>
              <p v-if="user.name && user.email" class="text-[10px] text-slate-400 dark:text-slate-500 truncate">{{ user.email }}</p>
            </div>
            <button
              type="button"
              class="size-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="Cerrar sesión"
              @click="emit('logout')"
            >
              <svg class="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9" />
              </svg>
            </button>
          </div>

          <!-- Controls slot (dark mode, notifications, etc.) -->
          <div v-if="$slots['user-controls']" class="flex items-center gap-x-1.5">
            <slot name="user-controls" />
          </div>

          <!-- Env / extra slot -->
          <slot name="user-footer" />
        </div>

      </div>
    </aside>

    <!-- Main content -->
    <div class="lg:ps-65 p-3">
      <slot />
    </div>

  </div>
</template>
