const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");
const TurndownService = require("turndown");
const turndownPluginGfm = require("turndown-plugin-gfm");

// 初始化 Turndown
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});
turndownService.use(turndownPluginGfm.gfm);
turndownService.addRule("unwrapGarbage", {
  filter: ["font", "span", "div"],
  replacement: function (content) {
    return content;
  },
});

const sourceDir = "./";
const outputDir = "./docs";
const allPagesData = []; // 用于存放搜索数据库

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// 核心路径净化函数（确保与 build-toc.js 100% 一致）
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
  return res;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (fullPath.includes("node_modules") || fullPath.includes("docs")) return;

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".html") || fullPath.endsWith(".htm")) {
      cleanHtmlFile(fullPath);
    } else if (
      fullPath.endsWith(".jpg") ||
      fullPath.endsWith(".png") ||
      fullPath.endsWith(".gif")
    ) {
      copyFile(fullPath);
    }
  });
}

function cleanHtmlFile(filePath) {
  // 1. 智能判断编码
  const buffer = fs.readFileSync(filePath);
  let htmlContent = "";
  const headStr = buffer.slice(0, 1024).toString("ascii").toLowerCase();
  const hasBOM =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;

  if (hasBOM || headStr.includes("charset=utf-8")) {
    htmlContent = iconv.decode(buffer, "utf8");
  } else {
    htmlContent = iconv.decode(buffer, "gbk");
  }

  const $ = cheerio.load(htmlContent);
  $("script, style, iframe").remove();

  // 2. 修复图片路径
  $("img").each((i, el) => {
    let src = $(el).attr("src");
    if (src && !src.startsWith("http") && !src.startsWith("data:")) {
      src = sanitizePath(src);
      if (
        !src.startsWith("/") &&
        !src.startsWith("./") &&
        !src.startsWith("../")
      ) {
        src = "./" + src;
      }
      $(el).attr("src", src);
    }
  });

  // 3. 修复内部跳转链接 <a>
  $("a").each((i, el) => {
    let href = $(el).attr("href");
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("#")
    ) {
      let [pathPart, hashPart] = href.split("#");
      if (pathPart) {
        pathPart = sanitizePath(pathPart);
        pathPart = pathPart.replace(/\.html?$/i, ".md"); // 替换后缀
      }
      href = hashPart ? `${pathPart}#${hashPart}` : pathPart;
      $(el).attr("href", href);
    }
  });

  // 4. 提取并转换 Markdown
  let bodyContent = $("body").html() || htmlContent;
  let markdownContent = turndownService.turndown(bodyContent);

  // 5. 准备输出路径
  const relativePath = path.relative(sourceDir, filePath);
  let newRelativePath = relativePath.replace(/\.html?$/, ".md");
  newRelativePath = sanitizePath(newRelativePath); // 净化输出路径

  const outPath = path.join(outputDir, newRelativePath);
  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) fs.mkdirSync(outDirName, { recursive: true });

  // 6. 写入 Markdown 文件
  const pageTitle = path.basename(filePath, path.extname(filePath));
  const finalContent = `# ${pageTitle}\n\n${markdownContent}`;
  fs.writeFileSync(outPath, finalContent, "utf-8");

  // 7. 提取纯文本，存入搜索数据库
  const plainText = markdownContent
    .replace(/[#*`>|]/g, "")
    .replace(/\s+/g, " ");
  allPagesData.push({
    title: pageTitle,
    link: "/" + newRelativePath.replace(/\\/g, "/").replace(/\.md$/, ""),
    content: plainText,
  });

  console.log(`✅ 已完美转换: ${newRelativePath}`);
}

function copyFile(filePath) {
  const relativePath = path.relative(sourceDir, filePath);
  const newRelativePath = sanitizePath(relativePath); // 净化图片输出路径
  const outPath = path.join(outputDir, newRelativePath);

  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) fs.mkdirSync(outDirName, { recursive: true });

  fs.copyFileSync(filePath, outPath);
}

console.log("🚀 开始批量清洗数据...");
processDirectory(sourceDir);

// 8. 生成专属搜索数据库
const publicDir = path.join(outputDir, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "search-db.json"),
  JSON.stringify(allPagesData),
  "utf-8",
);

console.log("🎉 全部清洗完成！专属搜索数据库 search-db.json 已生成！");
