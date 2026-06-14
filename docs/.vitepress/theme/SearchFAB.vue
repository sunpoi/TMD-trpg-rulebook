<template>
  <a href="/search" class="search-fab" title="全书搜索">
    🔍
  </a>
</template>

<style scoped>
.search-fab {
  position: fixed;
  bottom: 40px;
  right: 30px;
  width: 56px;
  height: 56px;
  background-color: var(--vp-c-brand); /* 使用主题色 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 999; /* 确保永远在最上层 */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
}

.search-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 手机端稍微变小一点，防止挡住太多文字 */
@media (max-width: 768px) {
  .search-fab {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}
</style>
