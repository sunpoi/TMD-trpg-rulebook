const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const cheerio = require("cheerio");

const TurndownService = require("turndown");
const turndownPluginGfm = require("turndown-plugin-gfm");

// 配置路径
const sourceDir = "./"; // 你的解压目录（当前目录）
const outputDir = "./docs"; // 清洗后的输出目录（VitePress 默认使用 docs）

// 配置自定义数组（用于生成搜索数据库）
const allPagesData = [];

// 如果输出目录不存在，则创建
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 初始化 Turndown
const turndownService = new TurndownService({
  headingStyle: "atx", // 强制使用 # 作为标题
  codeBlockStyle: "fenced",
});
// 启用表格支持
turndownService.use(turndownPluginGfm.gfm);

// 告诉 Turndown 遇到这些无用标签时，保留里面的文字，只剥离标签外壳
turndownService.addRule("unwrapGarbage", {
  filter: ["font", "span", "div"],
  replacement: function (content) {
    return content;
  },
});

// 递归遍历文件夹的函数
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // 忽略 node_modules 和 输出目录 本身
    if (fullPath.includes("node_modules") || fullPath.includes("docs")) return;

    if (stat.isDirectory()) {
      // 如果是文件夹，递归处理
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".html") || fullPath.endsWith(".htm")) {
      // 如果是 HTML 文件，开始清洗
      cleanHtmlFile(fullPath);
    } else if (
      fullPath.endsWith(".jpg") ||
      fullPath.endsWith(".png") ||
      fullPath.endsWith(".gif")
    ) {
      // 如果是图片，直接复制过去
      copyFile(fullPath);
    }
  });
}

// 清洗 HTML 文件的核心逻辑（Turndown 优雅版）
function cleanHtmlFile(filePath) {
  // 1. 读取并智能判断编码
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

  // 2. 用 cheerio 加载，做初步清理
  const $ = cheerio.load(htmlContent);
  $("script, style, iframe").remove(); // 删掉捣乱的脚本

  // 修复图片路径
  $("img").each((i, el) => {
    let src = $(el).attr("src");
    if (src && !src.startsWith("http") && !src.startsWith("data:")) {
      src = src.replace(/\\/g, "/");
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

  // 3. 提取 body 里的核心内容
  let bodyContent = $("body").html();
  if (!bodyContent) {
    bodyContent = htmlContent;
  }

  // 4. 见证奇迹：将 HTML 彻底转换为纯正的 Markdown！
  let markdownContent = turndownService.turndown(bodyContent);

  // 5. 准备输出路径
  const relativePath = path.relative(sourceDir, filePath);
  const newRelativePath = relativePath.replace(/\.html?$/, ".md");
  const outPath = path.join(outputDir, newRelativePath);

  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) {
    fs.mkdirSync(outDirName, { recursive: true });
  }

  // 6. 加上页面大标题，写入文件
  const pageTitle = path.basename(filePath, path.extname(filePath));
  const finalContent = `# ${pageTitle}\n\n${markdownContent}`;

  fs.writeFileSync(outPath, finalContent, "utf-8");
  console.log(`✅ 已完美转换: ${newRelativePath}`);

  // ================= 修复的地方：提取纯文本存入数据库 =================
  // 注意：这段代码必须放在 cleanHtmlFile 里面！
  const plainText = markdownContent
    .replace(/[#*`>|]/g, "")
    .replace(/\s+/g, " ");

  allPagesData.push({
    title: pageTitle,
    link: "/" + newRelativePath.replace(/\\/g, "/").replace(/\.md$/, ""),
    content: plainText,
  });
  // ==================================================================
}

// 复制图片的逻辑
function copyFile(filePath) {
  const relativePath = path.relative(sourceDir, filePath);
  const outPath = path.join(outputDir, relativePath);
  const outDirName = path.dirname(outPath);
  if (!fs.existsSync(outDirName)) {
    fs.mkdirSync(outDirName, { recursive: true });
  }
  fs.copyFileSync(filePath, outPath);
}

// 开始执行
console.log("🚀 开始批量清洗数据...");
processDirectory(sourceDir);

// 遍历完成后，生成专属搜索数据库
const publicDir = path.join(outputDir, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "search-db.json"),
  JSON.stringify(allPagesData),
  "utf-8",
);
console.log("✅ 专属搜索数据库 search-db.json 已生成！");
console.log("🎉 全部清洗完成！请查看 docs 文件夹。");
