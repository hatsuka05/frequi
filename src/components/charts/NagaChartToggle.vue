<script setup lang="ts">
const { chartEnabled } = useNagaSettings();
</script>

<template>
  <BaseCheckbox v-model="chartEnabled">
    <span class="text-nowrap">Naga chart</span>
  </BaseCheckbox>
</template>
