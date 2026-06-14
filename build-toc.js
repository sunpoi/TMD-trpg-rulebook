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
        let cleanLocal = local;

        // 1. 容错解码（防止某些奇葩路径报错）
        try {
          cleanLocal = decodeURIComponent(local);
        } catch (e) {}

        // 2. 统一斜杠方向
        cleanLocal = cleanLocal.replace(/\\/g, "/");

        // 3. 关键修复：按斜杠分割路径，去掉每一段前后的隐藏空格（解决幽灵 Bug）
        cleanLocal = cleanLocal
          .split("/")
          .map((part) => part.trim())
          .join("/");

        // 4. 核弹级替换：只保留汉字、英文字母、数字、斜杠和点，其他所有符号（包括空格、全角标点）全变下划线
        cleanLocal = cleanLocal.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\/\.]/g, "_");

        // 5. 把连续的多个下划线合并成一个，保持路径美观
        cleanLocal = cleanLocal.replace(/_+/g, "_");

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
