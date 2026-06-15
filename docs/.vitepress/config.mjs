import { defineConfig } from 'vitepress'
import toc from '../../toc-output.json'

// 1. 原本的修复链接逻辑
function fixLinks(items) {
  items.forEach(item => {
    if (item.link) {
      item.link = item.link.replace(/\.html?$/i, ''); // 去除后缀
    }
    if (item.items) {
      fixLinks(item.items);
    }
  });
  return items;
}

// ================= 新加：突破 5 层极限的强行扁平化 =================
function flattenDeepSidebar(items, currentDepth = 1) {
  const result = [];

  items.forEach(item => {
    // 当深度达到 4 层且下面还有折叠目录时，就不折叠了，直接抽取付出底层内容
    if (currentDepth >= 4 && item.items && item.items.length > 0) {

      // 递归抽取深层的所有底层页面
      function extractLeaves(node, prefix = '') {
        const flatList = [];
        node.items.forEach(child => {
          // 拼接名字，如：魔神Z系列 - 爱美神A系列
          const newTitle = prefix ? `${prefix} - ${child.text}` : child.text;

          if (child.items && child.items.length > 0) {
            flatList.push(...extractLeaves(child, newTitle));
          } else {
            flatList.push({
              text: newTitle,
              link: child.link
            });
          }
        });
        return flatList;
      }

      // 把抽出来的一堆底层链接，挂在这个 4 级目录下
      item.items = extractLeaves(item);
      result.push(item);

    } else if (item.items && item.items.length > 0) {
      // 深度没到极限，继续向下遍历
      item.items = flattenDeepSidebar(item.items, currentDepth + 1);
      result.push(item);
    } else {
      result.push(item);
    }
  });

  return result;
}
// ===================================================================

export default defineConfig({
  title: "跑团规则书",
  description: "CHM 转换的现代 Web App",
  ignoreDeadLinks: true,
  appearance: true,

  // ================= 新规：全局注入智能预加载 =================
  head: [
    // 告诉浏览器，在网络空闲时，去后台偷偷备好搜索数据库
    ['link', { rel: 'prefetch', href: '/search-db.json', as: 'fetch', crossorigin: 'anonymous' }]
  ],

  themeConfig: {
    // 先修复链接，再拍扁深层目录！
    sidebar: flattenDeepSidebar(fixLinks(toc)),

    // 关掉官方自带的残废搜索
    // search: { provider: 'local' },

    nav: [
      { text: '首页', link: '/' },
      { text: '🔍 全书搜索', link: '/search' }
    ]
  }
})
