const fs = require("fs");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");

// 核心路径净化函数
function sanitizePath(p) {
  let res = p;
  try {
    res = decodeURIComponent(res);
  } catch (e) {}
  res = res.replace(/\\/g, "/");
  res = res
    .split("/")
    .map((part) => part.trim())
    .join("/");
  res = res.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\/\.]/g, "_").replace(/_+/g, "_");

  // ====== 避开特殊名称诅咒的魔法：把点后面直接跟小写字母的奇怪文件夹强行改成下划线 ======
  // 防止 6.stg 这种名字在 Linux 部署时出玄学 Bug
  res = res.replace(/6\.stg/gi, "6_stg");
  res = res.replace(/7\.ua/gi, "7_ua");

  return res.toLowerCase();
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

        item.collapsed = true;
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
