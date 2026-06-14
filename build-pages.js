const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");
const TurndownService = require("turndown");
const turndownPluginGfm = require("turndown-plugin-gfm");

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
const allPagesData = [];

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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

  // ====== 终极杀招：全部强制转为小写 ======
  return res.toLowerCase();
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (fullPath.includes("node_modules") || fullPath.includes("docs")) return;

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile()) {
      // ====== 增强版：不区分大小写抓取所有图片和网页 ======
      const ext = path.extname(fullPath).toLowerCase();
      if ([".html", ".htm"].includes(ext)) {
        cleanHtmlFile(fullPath);
      } else if (
        [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)
      ) {
        copyFile(fullPath);
      }
    }
  });
}

function cleanHtmlFile(filePath) {
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
        pathPart = pathPart.replace(/\.html?$/i, ".md");
      }
      href = hashPart ? `${pathPart}#${hashPart}` : pathPart;
      $(el).attr("href", href);
    }
  });

  let bodyContent = $("body").html() || htmlContent;
  let markdownContent = turndownService.turndown(bodyContent);

  const relativePath = path.relative(sourceDir, filePath);
  let newRelativePath = relativePath.replace(/\.html?$/i, ".md");
  newRelativePath = sanitizePath(newRelativePath);

  const outPath = path.join(outputDir, newRelativePath);
  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) fs.mkdirSync(outDirName, { recursive: true });

  const pageTitle = path.basename(filePath, path.extname(filePath));
  const finalContent = `# ${pageTitle}\n\n${markdownContent}`;
  fs.writeFileSync(outPath, finalContent, "utf-8");

  const plainText = markdownContent
    .replace(/[#*`>|]/g, "")
    .replace(/\s+/g, " ");
  allPagesData.push({
    title: pageTitle,
    link: "/" + newRelativePath.replace(/\\/g, "/").replace(/\.md$/, ""),
    content: plainText,
  });

  // ====== 修改：提取最多 4 级目录 ======
  const pathParts = newRelativePath.split("/");
  const cat1 = pathParts.length > 1 ? pathParts[0] : "其他";
  const cat2 = pathParts.length > 2 ? pathParts[1] : "";
  const cat3 = pathParts.length > 3 ? pathParts[2] : "";
  const cat4 = pathParts.length > 4 ? pathParts[3] : "";
  const breadcrumb = pathParts.slice(0, -1).join(" > ");

  allPagesData.push({
    title: pageTitle,
    link: "/" + newRelativePath.replace(/\\/g, "/").replace(/\.md$/, ""),
    content: plainText,
    cat1: cat1,
    cat2: cat2,
    cat3: cat3,
    cat4: cat4,
    breadcrumb: breadcrumb,
  });

  console.log(`✅ 已完美转换: ${newRelativePath}`);
}

function copyFile(filePath) {
  const relativePath = path.relative(sourceDir, filePath);
  const newRelativePath = sanitizePath(relativePath);
  const outPath = path.join(outputDir, newRelativePath);

  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) fs.mkdirSync(outDirName, { recursive: true });

  fs.copyFileSync(filePath, outPath);
}

console.log("🚀 开始批量清洗数据...");
processDirectory(sourceDir);

const publicDir = path.join(outputDir, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "search-db.json"),
  JSON.stringify(allPagesData),
  "utf-8",
);
console.log("🎉 全部清洗完成！专属搜索数据库 search-db.json 已生成！");
