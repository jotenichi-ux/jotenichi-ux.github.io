# 世界正在展开 · So Am I.

Beata 的个人网站。纯静态页面（HTML + CSS + 原生 JavaScript），不需要构建，直接用 GitHub Pages 发布。

## 页面

| 文件 | 内容 |
|---|---|
| `index.html` | 首页 |
| `about.html` | 关于 |
| `projects.html` | 足迹 |
| `fragments.html` | 碎片 |
| `writing.html` + `article*.html` | 写作列表和文章 |
| `garden.html` | 花园（访客种花留言） |
| `404.html` | 找不到页面时显示 |

## 目录

```
assets/
  css/      样式（style.css 是全站基础，其余按页面或功能拆开）
  js/       脚本（site.js 全站通用；garden.js 花园；about.js / fragments.js 各自页面）
  fonts/    思源宋体子集
  images/   about/ fragments/ projects/ home/ deco/ 按页面分开
```

## 花园的留言

花园用 Supabase 存花和留言，配置在 `assets/js/garden-config.js`。
里面的 key 是公开用的 publishable key，可以放在网页里；**secret / service_role key 不要提交到这里。**

## 白天 / 夜里

导航栏右边的小猫按钮切换昼夜，没手动切换过时按本地时间自动判断（7:00–19:00 算白天）。
