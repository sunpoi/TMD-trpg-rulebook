const fs = require("fs");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");

// 核心路径净化函数（确保与 build-pages.js 100% 一致）
function sanitizePath(p) {
  let res = p;
  try {
    res = decodeURIComponent(res);
  } catch (e) {}
  // 1. 统一斜杠
  res = res.replace(/\\/g, "/");
  // 2. 去除每一段前后的隐藏空格（解决幽灵 Bug）
  res = res
    .split("/")
    .map((part) => part.trim())
    .join("/");
  // 3. 核弹级替换：只保留汉字、字母、数字、斜杠和点
  res = res.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\/\.]/g, "_");
  // 4. 合并连续下划线
  res = res.replace(/_+/g, "_");
  return res;
}

// 1. 读取 .hhc 文件（请确认文件名是否正确）
const hhcFilePath = "./TOC-Created-By-Easy-CHM.hhc";
const buffer = fs.readFileSync(hhcFilePath);

// 2. 解决 GBK 乱码
const htmlContent = iconv.decode(buffer, "gbk");
const $ = cheerio.load(htmlContent);

// 3. 递归解析
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
console.log("🎉 目录解析完成！请查看 toc-output.json");
