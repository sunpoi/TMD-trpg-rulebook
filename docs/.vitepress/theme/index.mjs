import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SearchFAB from './SearchFAB.vue'
import './style.css' // 如果你删了 style.css，这行也可以删掉

export default {
  extends: DefaultTheme,
  // 重写 Layout，利用 VitePress 的 layout-bottom 插槽注入悬浮按钮
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(SearchFAB)
    })
  }
}
