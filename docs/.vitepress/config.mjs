import { defineConfig } from "vitepress";
// 直接引入我们第一步生成的目录 JSON
import toc from "../../toc-output.json";

// 递归处理一下目录数据：把原本的 .html 后缀去掉，适配 VitePress 的路由
function fixLinks(items) {
  items.forEach((item) => {
    if (item.link) {
      // 将 /1.核心规则.html 变成 /1.核心规则
      item.link = item.link.replace(/\.html?$/, "");
    }
    if (item.items) {
      fixLinks(item.items);
    }
  });
  return items;
}

export default defineConfig({
  title: "TMD规则书", // 你的 App 名字
  description: "CHM 转换的现代 Web App",

  cleanUrls: true,

  // 忽略死链接
  ignoreDeadLinks: true,

  // 开启暗黑模式切换
  appearance: true,

  themeConfig: {
    // 挂载侧边栏
    sidebar: fixLinks(toc),

    // 开启自带的极速全文搜索（跑团神级功能）
    // search: {
    //   provider: "local",
    //   options: {
    //     // 开启详细列表视图（能展示更多结果和上下文）
    //     detailedView: true,
    //     miniSearch: {
    //       searchOptions: {
    //         // 【关键】关闭模糊匹配！跑团专有名词不需要模糊搜索，关闭后速度提升百倍！
    //         fuzzy: false,
    //         // 开启前缀匹配（搜 "近战" 能搜出 "近战专长"）
    //         prefix: true,
    //         // 提升精确匹配的权重
    //         boostDocumentScore: 1,
    //       },
    //     },
    //   },
    // },

    nav: [
      { text: "首页", link: "/" },
      { text: "🔍 全书搜索", link: "/search" }, // 加到这里
    ],
  },
});
