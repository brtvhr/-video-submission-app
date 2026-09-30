# 视频作品协同报送系统

多人协作的视频作品报送、审核与导出平台。移动端友好，适合微信群分享使用。

## 功能

- **提交页**：手动填写或批量粘贴文本（自动解析）
- **审核页**：7人团队共用访问码，按单位筛选，审核标注通过/不通过
- **导出页**：按平台筛选，一键复制可粘贴的文本或表格格式

## 部署到 Vercel（GitHub 关联）

### 第1步：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) → New Project
2. 设置数据库密码，选择就近区域（Singapore / Tokyo）
3. 进入 **SQL Editor**，粘贴 `schema.sql` 全部内容并执行
4. 在 **Settings → API** 复制 **Project URL** 和 **anon public key**

### 第2步：推送代码到 GitHub

```bash
cd video-submission-app
git init
git add .
git commit -m "初始版本：视频作品协同报送系统"
git branch -M main
git remote add origin https://github.com/你的用户名/video-submission-app.git
git push -u origin main
```

### 第3步：Vercel 导入并配置环境变量

1. 访问 [vercel.com](https://vercel.com) → 用 GitHub 登录
2. **Import Project** → 选择 `video-submission-app` 仓库
3. 在 **Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Project URL |
| `SUPABASE_KEY` | `eyJhbGciOi...` | Supabase anon public key |
| `ACCESS_CODE` | `video2024` | 审核页访问码（可自定义） |

4. 点击 **Deploy**，约10秒后得到线上地址

### 第4步：分享给团队

将 Vercel 分配的链接发到微信群，团队成员打开即可使用。

## 更新部署

推送代码到 GitHub 后，Vercel 会自动重新部署：

```bash
git add .
git commit -m "描述这次改动"
git push
```

## 自定义

编辑 `config.template.js` 中的 `units`（报送单位）和 `platforms`（发布平台）数组，push 后自动生效。

## 批量粘贴格式

每行一条，字段用 Tab、逗号或 `|` 分隔：
```
抖音	视频标题	https://v.douyin.com/xxx	作者名	12000
```

或用键值对格式：
```
报送单位：抖音
标题：视频标题
链接：https://v.douyin.com/xxx
作者：作者名
播放量：12000
```
