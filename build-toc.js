const fs = require("fs");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");

// 核心：绝对安全的路径格式化函数
function sanitizePath(p) {
  let res = p;
  try {
    res = decodeURIComponent(res);
  } catch (e) {}
  res = res.replace(/\\/g, "/");
  res = res.replace(/\s+\./g, "."); // 修复 "冰之讯兮 .html" 这种点前面带空格的幽灵Bug
  res = res.replace(/\s+\//g, "/"); // 修复文件夹前后的空格
  res = res.replace(/\/\s+/g, "/");
  res = res.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\/\.\-]/g, "_"); // 保留连字符-
  res = res.replace(/_+/g, "_");
  return res.toLowerCase(); // 终极杀招：全部转小写，彻底解决 Linux 大小写敏感导致的 404！
}

const hhcFilePath = "./TOC-Created-By-Easy-CHM.hhc";
const buffer = fs.readFileSync(hhcFilePath);
const htmlContent = iconv.decode(buffer, "gbk");
const $ = cheerio.load(htmlContent);

function parseUL(ulElement) {
  const items = [];
  $(ulElement)
    .children("li")
    .each((index, li) => {
      const $li = $(li);
      const $object = $li.children("object");
      const name = $object.find('param[name="Name"]').attr("value");
      const local = $object.find('param[name="Local"]').attr("value");
      const item = { text: name };

      if (local) {
        item.link = "/" + sanitizePath(local);
      }

      const $nestedUl = $li.children("ul");
      if ($nestedUl.length > 0) {
        item.items = parseUL($nestedUl);
      }
      items.push(item);
    });
  return items;
}

const rootUl = $("body > ul");
const tocJSON = parseUL(rootUl);
fs.writeFileSync(
  "./toc-output.json",
  JSON.stringify(tocJSON, null, 2),
  "utf-8",
);
console.log("🎉 目录解析完成！");
