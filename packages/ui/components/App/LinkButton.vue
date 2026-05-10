<script setup>
const props = defineProps({
  size: { type: String, default: "sm", validator: (v) => ["xs","sm","md","lg"].includes(v) },
  class: { type: String, default: "" },
  iconClass: { type: String, default: "" },
  textClass: { type: String, default: "" },
  outline: { type: Boolean, default: false },
  severity: { type: String, default: "secondary", validator: (v) => ["primary","secondary","success","danger","warning","info"].includes(v) },
  icon: { type: [Object, Function], default: null },
  iconPosition: { type: String, default: "left", validator: (v) => ["left","right"].includes(v) },
  loading: { type: Boolean, default: false },
  loadingText: { type: String, default: "Cargando..." },
  disabled: { type: Boolean, default: false },
  to: { type: String, required: true },
  variant: { type: String, default: "default", validator: (v) => ["default","dropdown"].includes(v) },
  text: { type: String, default: "" },
})

const buttonProps = computed(() => ({ ...props, link: props.to, type: "link" }))
</script>
<template>
  <AppButton v-bind="buttonProps"><slot /></AppButton>
</template>
