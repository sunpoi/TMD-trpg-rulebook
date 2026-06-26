const fs = require('fs');

// 1. 读取新旧两个 JSON
const oldToc = JSON.parse(fs.readFileSync('./old-toc.json', 'utf-8'));
const newToc = JSON.parse(fs.readFileSync('./new-toc.json', 'utf-8'));

// 2. 核心提取：只抓取“文件夹（分区）”的路径
function getCategories(tree, parentPath = '', resultSet = new Set()) {
    tree.forEach(node => {
        // 拼接当前层级的面包屑路径
        const currentPath = parentPath ? `${parentPath} > ${node.text}` : node.text;

        // 如果这个节点下面有 items，说明它是一个“分区 / 文件夹”
        if (node.items && node.items.length > 0) {
            resultSet.add(currentPath); // 记录这个分区
            getCategories(node.items, currentPath, resultSet); // 继续往下找子分区
        }
    });
    return resultSet;
}

const oldCats = getCategories(oldToc);
const newCats = getCategories(newToc);

// 3. 开始对比
const added = [];
const removed = [];

// 找新增的分区
newCats.forEach(cat => {
    if (!oldCats.has(cat)) {
        added.push(cat);
    }
});

// 找删减的分区
oldCats.forEach(cat => {
    if (!newCats.has(cat)) {
        removed.push(cat);
    }
});

// 4. 生成报告
let report = '📂 规则书【分区/目录层级】更新对比报告\n';
report += '======================================\n\n';

report += `🔴 整个删除了 ${removed.length} 个分区：\n`;
if (removed.length === 0) report += `  (无)\n`;
removed.forEach(p => report += `  - [删除] ${p}\n`);

report += `\n🟢 新增了 ${added.length} 个分区：\n`;
if (added.length === 0) report += `  (无)\n`;
added.forEach(p => report += `  + [新增] ${p}\n`);

// 5. 写入报告文件
fs.writeFileSync('./category-report.txt', report, 'utf-8');
console.log('🎉 分区对比完成！请打开 category-report.txt 查看大版本变动。');
