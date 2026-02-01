<template>
  <div class="skeleton-container loading-container">
    <div class="skeleton-header">
      <div class="skeleton-title"></div>
      <div class="skeleton-subtitle"></div>
    </div>
    <div class="skeleton-list">
      <div class="skeleton-item" v-for="i in count" :key="i">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-sender"></div>
          <div class="skeleton-line skeleton-subject"></div>
          <div class="skeleton-line skeleton-preview"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkeletonLoader',
  props: {
    count: {
      type: Number,
      default: 4
    }
  }
}
</script>

<style lang="scss" scoped>
@use "../../scss/color" as *;

.skeleton-container {
  padding: 1rem;
}

.skeleton-header {
  margin-bottom: 1.5rem;
  
  .skeleton-title {
    height: 24px;
    width: 150px;
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: $radius;
    margin-bottom: 0.5rem;
  }
  
  .skeleton-subtitle {
    height: 14px;
    width: 200px;
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: $radius;
  }
}

.skeleton-list {
  background: var(--color-surface);
  border-radius: $radius-lg;
  box-shadow: $shadow;
  overflow: hidden;
}

.skeleton-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid $gray-100;
  
  &:last-child {
    border-bottom: none;
  }
  
  .skeleton-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    margin-right: 1rem;
    flex-shrink: 0;
  }
  
  .skeleton-content {
    flex: 1;
  }
  
  .skeleton-line {
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: $radius;
    margin-bottom: 0.5rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .skeleton-sender {
    height: 14px;
    width: 40%;
  }
  
  .skeleton-subject {
    height: 16px;
    width: 80%;
  }
  
  .skeleton-preview {
    height: 12px;
    width: 60%;
  }
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}
</style>
