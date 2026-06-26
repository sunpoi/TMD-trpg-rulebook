const fs = require('fs');

// 1. 读取新旧两个 JSON
const oldToc = JSON.parse(fs.readFileSync('./old-toc.json', 'utf-8'));
const newToc = JSON.parse(fs.readFileSync('./new-toc.json', 'utf-8'));

// 2. 核心魔法：把树状 JSON 拍扁成一维字典
// 例如：{ "1.基础规则 > 1.1.核心规则": "/link", ... }
function flattenTree(tree, parentPath = '', result = {}) {
    tree.forEach(node => {
        // 拼接面包屑路径
        const currentPath = parentPath ? `${parentPath} > ${node.text}` : node.text;

        // 如果有链接，说明是个具体页面，存入字典
        if (node.link) {
            result[currentPath] = node.link;
        }

        // 如果有子级，递归进去
        if (node.items && node.items.length > 0) {
            flattenTree(node.items, currentPath, result);
        }
    });
    return result;
}

const oldMap = flattenTree(oldToc);
const newMap = flattenTree(newToc);

// 3. 开始对比
const added = [];   // 新增的规则
const removed = []; // 删掉的规则
const changed = []; // 名字没变，但路径变了（被移动了分类）

// 检查新增和修改
for (const [path, link] of Object.entries(newMap)) {
    if (!oldMap[path]) {
        added.push(path);
    } else if (oldMap[path] !== link) {
        changed.push(`${path} \n  [旧]: ${oldMap[path]} \n  [新]: ${link}`);
    }
}

// 检查被删除
for (const path of Object.keys(oldMap)) {
    if (!newMap[path]) {
        removed.push(path);
    }
}

// 4. 生成报告
let report = '📊 规则书更新对比报告\n';
report += '======================================\n\n';

report += `🟢 新增了 ${added.length} 个条目：\n`;
added.forEach(p => report += `  + ${p}\n`);

report += `\n🔴 删除了 ${removed.length} 个条目：\n`;
removed.forEach(p => report += `  - ${p}\n`);

report += `\n🟡 移动/修改了 ${changed.length} 个条目的路径：\n`;
changed.forEach(p => report += `  ~ ${p}\n`);

// 5. 写入报告文件
fs.writeFileSync('./update-report.txt', report, 'utf-8');
console.log('🎉 对比完成！请打开 update-report.txt 查看更新详情。');
