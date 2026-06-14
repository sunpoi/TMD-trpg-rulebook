<template>
  <div class="game-search">
    <div class="search-box">
      <!-- 1级分区 -->
      <select
        v-model="selectedCat1"
        class="category-select"
        @change="onCat1Change"
      >
        <option value="">📚 全部分区</option>
        <option v-for="cat in optionsCat1" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>

      <!-- 2级分区 -->
      <select
        v-if="optionsCat2.length"
        v-model="selectedCat2"
        class="category-select"
        @change="onCat2Change"
      >
        <option value="">📂 全部子类</option>
        <option v-for="cat in optionsCat2" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>

      <!-- 3级分区 -->
      <select
        v-if="optionsCat3.length"
        v-model="selectedCat3"
        class="category-select"
        @change="onCat3Change"
      >
        <option value="">📁 全部细分</option>
        <option v-for="cat in optionsCat3" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>

      <!-- 4级分区 -->
      <select
        v-if="optionsCat4.length"
        v-model="selectedCat4"
        class="category-select"
        @change="onCat4Change"
      >
        <option value="">📄 全部条目</option>
        <option v-for="cat in optionsCat4" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>

      <input
        v-model="keyword"
        @keyup.enter="doSearch"
        placeholder="输入关键字 (空格隔开可多词匹配)..."
        class="search-input"
      />
      <button @click="doSearch" class="search-btn">搜索</button>
    </div>

    <!-- 结果区域（加了 min-height 防止闪烁） -->
    <div class="results-container">
      <div v-if="isSearching" class="loading">⏳ 正在检索中，请稍候...</div>

      <div v-if="!isSearching && hasSearched" class="result-info">
        ✅ 在 <strong>{{ currentScopeName }}</strong> 中找到了
        <strong>{{ results.length }}</strong> 条结果：
      </div>

      <div class="results-list" v-if="!isSearching">
        <div v-for="(item, index) in results" :key="index" class="result-item">
          <div class="result-breadcrumb" v-if="item.breadcrumb">
            📂 {{ item.breadcrumb }}
          </div>
          <a
            :href="item.link"
            class="result-title"
            v-html="highlight(item.title)"
          ></a>
          <p class="result-snippet" v-html="highlight(item.snippet)"></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const keyword = ref("");
const selectedCat1 = ref("");
const selectedCat2 = ref("");
const selectedCat3 = ref("");
const selectedCat4 = ref("");

const results = ref([]);
const isSearching = ref(false);
const hasSearched = ref(false);

// 把数据库变成响应式，方便 computed 计算
const searchDB = ref([]);
let dbFetchPromise = null;

const sortFn = (a, b) => (parseInt(a) || 0) - (parseInt(b) || 0);

// 动态计算下拉框的选项
const optionsCat1 = computed(() => {
  const set = new Set();
  searchDB.value.forEach((p) => {
    if (p.cat1 && p.cat1 !== "其他") set.add(p.cat1);
  });
  return Array.from(set).sort(sortFn);
});

const optionsCat2 = computed(() => {
  if (!selectedCat1.value) return [];
  const set = new Set();
  searchDB.value.forEach((p) => {
    if (p.cat1 === selectedCat1.value && p.cat2) set.add(p.cat2);
  });
  return Array.from(set).sort(sortFn);
});

const optionsCat3 = computed(() => {
  if (!selectedCat2.value) return [];
  const set = new Set();
  searchDB.value.forEach((p) => {
    if (
      p.cat1 === selectedCat1.value &&
      p.cat2 === selectedCat2.value &&
      p.cat3
    )
      set.add(p.cat3);
  });
  return Array.from(set).sort(sortFn);
});

const optionsCat4 = computed(() => {
  if (!selectedCat3.value) return [];
  const set = new Set();
  searchDB.value.forEach((p) => {
    if (
      p.cat1 === selectedCat1.value &&
      p.cat2 === selectedCat2.value &&
      p.cat3 === selectedCat3.value &&
      p.cat4
    )
      set.add(p.cat4);
  });
  return Array.from(set).sort(sortFn);
});

// 当前搜索范围的名称展示
const currentScopeName = computed(() => {
  return (
    selectedCat4.value ||
    selectedCat3.value ||
    selectedCat2.value ||
    selectedCat1.value ||
    "全书"
  );
});

// 级联重置逻辑
const onCat1Change = () => {
  selectedCat2.value = "";
  selectedCat3.value = "";
  selectedCat4.value = "";
  doSearch();
};
const onCat2Change = () => {
  selectedCat3.value = "";
  selectedCat4.value = "";
  doSearch();
};
const onCat3Change = () => {
  selectedCat4.value = "";
  doSearch();
};
const onCat4Change = () => {
  doSearch();
};

const getSearchDB = () => {
  if (searchDB.value.length) return Promise.resolve(searchDB.value);
  if (dbFetchPromise) return dbFetchPromise;

  dbFetchPromise = fetch("/search-db.json")
    .then((res) => res.json())
    .then((data) => {
      searchDB.value = data;
      return data;
    })
    .catch((err) => {
      console.error("获取搜索数据失败:", err);
      dbFetchPromise = null;
      return [];
    });
  return dbFetchPromise;
};

onMounted(() => {
  getSearchDB();
});

const doSearch = async () => {
  const input = keyword.value.trim();
  if (!input && !selectedCat1.value) return;

  isSearching.value = true;
  hasSearched.value = true;
  results.value = [];

  await new Promise((resolve) => setTimeout(resolve, 50));
  const db = await getSearchDB();

  const kws = input ? input.toLowerCase().split(/\s+/) : [];
  const tempResults = [];

  for (const page of db) {
    // 4级精准过滤
    if (selectedCat1.value && page.cat1 !== selectedCat1.value) continue;
    if (selectedCat2.value && page.cat2 !== selectedCat2.value) continue;
    if (selectedCat3.value && page.cat3 !== selectedCat3.value) continue;
    if (selectedCat4.value && page.cat4 !== selectedCat4.value) continue;

    const titleLower = page.title.toLowerCase();
    const contentLower = page.content.toLowerCase();

    const isMatch =
      kws.length === 0 ||
      kws.every((kw) => titleLower.includes(kw) || contentLower.includes(kw));

    if (isMatch) {
      let firstMatchIndex = -1;
      for (const kw of kws) {
        const idx = contentLower.indexOf(kw);
        if (idx > -1) {
          firstMatchIndex = idx;
          break;
        }
      }

      let snippet = "";
      if (firstMatchIndex > -1) {
        const start = Math.max(0, firstMatchIndex - 30);
        const end = Math.min(page.content.length, firstMatchIndex + 60);
        snippet =
          (start > 0 ? "..." : "") + page.content.substring(start, end) + "...";
      } else {
        snippet = page.content.substring(0, 80) + "...";
      }

      tempResults.push({
        title: page.title,
        link: page.link,
        snippet: snippet,
        breadcrumb: page.breadcrumb,
      });
    }
  }

  results.value = tempResults;
  isSearching.value = false;
};

const highlight = (text) => {
  const input = keyword.value.trim();
  if (!input) return text;
  const kws = input.split(/\s+/);
  const escapedKws = kws.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const reg = new RegExp(`(${escapedKws.join("|")})`, "gi");
  return text.replace(
    reg,
    '<span style="color: #ff4a4a; font-weight: bold;">$1</span>',
  );
};
</script>

<style scoped>
/* 强制显示全局滚动条，彻底解决闪烁问题 */
:global(html) {
  overflow-y: scroll !important;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  position: sticky;
  top: var(--vp-nav-height, 64px);
  z-index: 10;
  background-color: var(--vp-c-bg);
  padding: 15px 0 10px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  align-items: center;
}

.category-select {
  padding: 0 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  height: 36px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0 15px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 15px;
  background: transparent;
  color: inherit;
  height: 36px;
}

.search-btn {
  padding: 0 20px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  height: 36px;
}

/* 给结果区域一个最小高度，防止清空时页面塌陷 */
.results-container {
  min-height: 60vh;
}

.loading {
  margin: 20px 0;
  font-size: 16px;
  color: var(--vp-c-text-2);
}
.result-info {
  margin-bottom: 15px;
  font-size: 15px;
}
.result-item {
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.result-item:hover {
  border-color: var(--vp-c-brand);
}
.result-breadcrumb {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
  font-family: monospace;
}
.result-title {
  font-size: 17px;
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

@media (max-width: 768px) {
  .category-select {
    max-width: calc(50% - 4px);
    flex: 1;
  }
  .search-input {
    width: 100%;
  }
  .search-btn {
    width: 100%;
  }
}
</style>
