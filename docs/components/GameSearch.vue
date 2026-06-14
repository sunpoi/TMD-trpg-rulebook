<template>
  <div class="game-search">
    <div class="search-box">
      <input
        v-model="keyword"
        @keyup.enter="doSearch"
        placeholder="输入规则、专长或物品，按回车键全书搜索..."
        class="search-input"
      />
      <button @click="doSearch" class="search-btn">搜索</button>
    </div>

    <div v-if="isSearching" class="loading">⏳ 正在全书检索中，请稍候...</div>

    <div v-if="!isSearching && hasSearched" class="result-info">
      ✅ 找到了 <strong>{{ results.length }}</strong> 条结果：
    </div>

    <div class="results-list" v-if="!isSearching">
      <div v-for="(item, index) in results" :key="index" class="result-item">
        <a :href="item.link" class="result-title">{{ item.title }}</a>
        <p class="result-snippet" v-html="highlight(item.snippet)"></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const keyword = ref("");
const results = ref([]);
const isSearching = ref(false);
const hasSearched = ref(false);

// 全局缓存变量
let searchDB = null;
let dbFetchPromise = null; // 核心：请求锁

// 获取数据库的核心函数（带单例锁）
const getSearchDB = () => {
  if (searchDB) return Promise.resolve(searchDB); // 如果已经有了，直接返回
  if (dbFetchPromise) return dbFetchPromise; // 如果正在下载中，返回同一个 Promise，让大家一起等，绝不重复发请求！

  // 发起请求并上锁
  dbFetchPromise = fetch("/search-db.json")
    .then((res) => res.json())
    .then((data) => {
      searchDB = data;
      return data;
    })
    .catch((err) => {
      console.error("获取搜索数据失败:", err);
      dbFetchPromise = null; // 失败后把锁解开，允许重试
      return [];
    });

  return dbFetchPromise;
};

// 魔法优化：当用户一进入搜索页面，趁他打字的时间，偷偷在后台预加载数据！
onMounted(() => {
  getSearchDB();
});

const doSearch = async () => {
  if (!keyword.value.trim()) return;
  isSearching.value = true;
  hasSearched.value = true;
  results.value = [];

  // 延迟 50ms，让浏览器的 Loading 动画先渲染出来
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 等待数据库加载完成（如果预加载好了，这里是瞬间通过的）
  const db = await getSearchDB();

  const kw = keyword.value.trim().toLowerCase();
  const tempResults = [];

  // 简单粗暴但极速的遍历匹配
  for (const page of db) {
    const titleMatch = page.title.toLowerCase().includes(kw);
    const contentIndex = page.content.toLowerCase().indexOf(kw);

    if (titleMatch || contentIndex > -1) {
      // 截取匹配到的上下文片段（前后各取 50 个字）
      let snippet = "";
      if (contentIndex > -1) {
        const start = Math.max(0, contentIndex - 30);
        const end = Math.min(page.content.length, contentIndex + 60);
        snippet =
          (start > 0 ? "..." : "") + page.content.substring(start, end) + "...";
      } else {
        snippet = page.content.substring(0, 80) + "...";
      }

      tempResults.push({
        title: page.title,
        link: page.link,
        snippet: snippet,
      });
    }
  }

  results.value = tempResults;
  isSearching.value = false;
};

// 关键字标红高亮
const highlight = (text) => {
  if (!keyword.value) return text;
  const reg = new RegExp(`(${keyword.value})`, "gi");
  return text.replace(
    reg,
    '<span style="color: #ff4a4a; font-weight: bold;">$1</span>',
  );
};
</script>

<style scoped>
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;

  /* ================= 新增：吸顶魔法 ================= */
  position: sticky;
  /* VitePress 顶部的导航栏默认高度是 64px，所以我们让它停在导航栏下面 */
  top: var(--vp-nav-height, 64px);
  z-index: 10; /* 确保它浮在搜索结果上面 */
  background-color: var(--vp-c-bg); /* 使用主题背景色，防止下面的文字透上来 */
  padding: 15px 0 10px 0; /* 上下加点内边距，更好看 */
  border-bottom: 1px solid var(--vp-c-divider); /* 加一条浅色底边线区分内容 */
  /* ================================================== */
}
.search-input {
  flex: 1;
  padding: 10px 15px;
  border: 2px solid #ccc;
  border-radius: 8px;
  font-size: 16px;
  background: transparent;
  color: inherit;
}
.search-btn {
  padding: 0 20px;
  background: #3eaf7c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.loading {
  margin: 20px 0;
  font-size: 18px;
  color: #666;
}
.result-info {
  margin-bottom: 15px;
  font-size: 16px;
}
.result-item {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.result-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--vp-c-brand);
  text-decoration: none;
}
.result-snippet {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
