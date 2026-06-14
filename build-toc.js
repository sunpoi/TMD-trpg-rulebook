const fs = require("fs");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");

// 1. 读取 .hhc 文件（请把 'toc.hhc' 替换成你实际的文件名）
const hhcFilePath = "./TOC-Created-By-Easy-CHM.hhc";
const buffer = fs.readFileSync(hhcFilePath);

// 2. 使用 iconv-lite 将 GBK 编码强制解码为 UTF-8，解决乱码
const htmlContent = iconv.decode(buffer, "gbk");

// 3. 使用 cheerio 加载 HTML
const $ = cheerio.load(htmlContent);

// 4. 递归解析 UL 和 LI 的函数
function parseUL(ulElement) {
  const items = [];

  $(ulElement)
    .children("li")
    .each((index, li) => {
      const $li = $(li);
      const $object = $li.children("object");

      // 提取标题和链接
      const name = $object.find('param[name="Name"]').attr("value");
      const local = $object.find('param[name="Local"]').attr("value");

      const item = { text: name };

      // 如果有 Local 属性，说明是一个具体的页面
      if (local) {
        // 1. 先把可能存在的 %20 解码成空格
        let cleanLocal = decodeURIComponent(local);
        // 2. 把所有的空格替换成下划线 _
        cleanLocal = cleanLocal.replace(/\s+/g, "_");

        item.link = "/" + cleanLocal;
      }

      // 检查是否有嵌套的子目录 (UL)
      const $nestedUl = $li.children("ul");
      if ($nestedUl.length > 0) {
        item.items = parseUL($nestedUl); // 递归调用
      }

      items.push(item);
    });

  return items;
}

// 5. 找到最外层的 UL 开始解析
const rootUl = $("body > ul");
const tocJSON = parseUL(rootUl);

// 6. 将结果输出为 JSON 文件
fs.writeFileSync(
  "./toc-output.json",
  JSON.stringify(tocJSON, null, 2),
  "utf-8",
);

console.log("🎉 目录解析完成！请查看 toc-output.json");
