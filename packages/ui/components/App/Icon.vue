<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { IconClockHour10 } from "@tabler/icons-vue";

interface Props {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  showTime?: boolean;
  color?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  animated: true,
  showTime: false,
  color: "text-current",
  class: "",
});

const currentTime = ref(new Date());
const rotation = ref(0);
let timeInterval: NodeJS.Timeout | null = null;
let animationInterval: NodeJS.Timeout | null = null;

const iconSizes = {
  xs: "w-5 h-5",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
  "2xl": "w-24 h-24",
};

const iconSize = computed(() => iconSizes[props.size]);

// Formatear tiempo digital
const digitalTime = computed(() => {
  return currentTime.value.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

const updateTime = () => {
  currentTime.value = new Date();
};

const updateAnimation = () => {
  if (props.animated) {
    rotation.value += 1; // Rotar 1 grado cada frame
    if (rotation.value >= 360) rotation.value = 0;
  }
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);

  if (props.animated) {
    animationInterval = setInterval(updateAnimation, 100); // Animación suave
  }
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (animationInterval) clearInterval(animationInterval);
});
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Icono de reloj animado -->
    <div class="relative">
      <IconClockHour10
        :class="[
          iconSize,
          props.color || 'text-current',
          props.class,
          'transition-transform duration-300',
        ]"
        :style="{ transform: `rotate(${rotation}deg)` }"
        aria-hidden="true"
      />
    </div>

    <!-- Tiempo digital (opcional) -->
    <div
      v-if="showTime"
      :class="[
        'font-mono text-lg font-semibold',
        props.color || 'text-current',
      ]"
    >
      {{ digitalTime }}
    </div>
  </div>
</template>
