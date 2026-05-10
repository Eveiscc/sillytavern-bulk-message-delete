# SillyTavern 批量勾选删除

一个用于 SillyTavern 的轻量第三方扩展。它可以在当前聊天中批量勾选消息，并在确认弹窗中复核后删除，适合间断删除多个楼层。

## 功能

- 在魔杖菜单中进入批量勾选删除模式。
- 支持间断勾选任意已加载楼层。
- 支持一键勾选当前已加载的 user 输入楼层。
- 删除前显示编号、角色和前 20 字预览。
- 可在确认弹窗中取消部分勾选。
- 删除前提醒备份当前聊天。
- 删除时按原始楼层从大到小处理，避免楼层重排导致误删。
- 删除成功或失败后显示结果；失败时会提示未删除成功的楼层。

## 安装

在 SillyTavern 中打开扩展安装界面，输入本仓库地址：

```text
https://github.com/你的用户名/sillytavern-bulk-message-delete.git
```

也可以手动安装：将本仓库文件放入 SillyTavern 的第三方扩展目录。

```text
SillyTavern/public/scripts/extensions/third-party/bulk-message-delete/
```

目录结构应为：

```text
bulk-message-delete/
├─ manifest.json
├─ index.js
├─ style.css
└─ README.md
```

安装后刷新或重启 SillyTavern。

## 使用

1. 打开聊天。
2. 点击左下角魔杖菜单。
3. 选择“批量勾选删除”。
4. 勾选要删除的楼层，或点击“一键勾选 user 输入”。
5. 点击底部“删除 (N)”。
6. 在确认弹窗中复核楼层。
7. 确认已经备份当前聊天后，点击“确认删除”。

点击“返回”不会删除消息，会回到勾选状态。

## 注意事项

- 本扩展只处理当前已加载、已渲染在页面上的楼层。
- 未加载出来的历史楼层不会被一键勾选。
- 删除操作会修改当前聊天文件，重要聊天请先备份。
- 本扩展复用 SillyTavern 原生单条删除逻辑，不直接改写聊天文件。

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0.

Noncommercial use only. Commercial use, including selling, paid distribution, commercial hosting, or integration into paid products or services, requires explicit permission from the author.

Full license text:

```text
https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html
```
