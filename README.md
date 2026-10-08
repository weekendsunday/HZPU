# HZPU 校园论坛

参照浙江大学 CC98 的校内论坛：版块 + 标题楼层帖，学号注册，先审后发（自动审核），无匿名发帖。
采用**昵称公开 + 实名留档**：昵称全站唯一并对外显示，真实姓名允许重名，仅本人与管理员可见。

技术栈：Next.js 14 (App Router) + TypeScript + Prisma + MySQL。

## 功能

- **账号**：学号 + 昵称 + 真实姓名 + 自设密码注册/登录（学号格式由 `STUDENT_ID_PATTERN` 环境变量控制，请按学校实际格式修改）
- **实名与隐私**：昵称全站唯一（`@昵称` 提及因此不会串人）；真实姓名允许同名同姓，仅在本人与管理员视角下展示
- **版块**：预置综合讨论/校园生活/学习交流/二手交易/失物招领，后台可增删改、锁定
- **发帖/回帖**：Markdown 正文，图片上传存服务器磁盘；@姓名 提及自动产生通知
- **审核管线**：本地敏感词库（后台 `/admin/words` 维护）→ 可选 LLM 审核 agent（配置 `MODERATION_LLM_URL` 启用，如本地 Ollama）；自动通过即发布，未通过进入人工审核队列（`/admin`）
- **互动**：楼层回复、提及通知、站内私信（会话式）、全站搜索（帖子/用户）、热榜（回复/浏览加权 + 时间衰减）
- **管理后台**：审核队列、版块管理、用户封禁/设管、敏感词、审核日志

## 昵称与真实姓名

## 品牌与视觉

站点按学校官方标识做了基础品牌化，主色取自校徽：

| 资产 | 位置 | 用途 |
| --- | --- | --- |
| 校徽（方形） | `public/emblem.png` | 页头 logo |
| 校徽 + 中英文校名 | `public/logo.png` | 登录 / 注册页 |
| 站点图标 | `src/app/icon.png` | favicon（App Router 自动注入） |

- 主色 `--brand: #284878`（杭职蓝，取自校徽），已作为 `--primary` 应用于链接、按钮、选中态；`--brand-dark` 为 hover 色，定义在 `src/app/globals.css`。
- 校徽等素材取自学校官网 <https://www.hzpu.edu.cn/>，仅用于校内站点；如学校发布官方 VI 规范，请以其为准替换 `public/` 下同名文件即可。

## 昵称与真实姓名

用户表把「对外身份」和「实名信息」拆成两个字段，都有明确的唯一性约定：

| 字段 | 含义 | 唯一性 | 可见范围 |
| --- | --- | --- | --- |
| `name` | 昵称，前台展示、`@提及` 的匹配依据 | **全站唯一**（数据库唯一索引 + 注册时校验） | 所有人 |
| `realName` | 真实姓名，用于实名留档 | 允许重名 | 仅**本人**与**管理员** |

可见性规则集中在 `src/lib/users.ts` 的 `authorView()`：所有返回作者信息的接口（帖子列表/详情、楼层、热榜、搜索、用户主页、审核队列、用户管理）都经过它裁剪，
非本人且非管理员时 `realName` 字段直接从响应里省略，不是靠前端隐藏。前端对可见的真实姓名渲染为 `.real-name` 标签（`globals.css`）。

> 说明：`realName` 为可选实名信息，历史数据默认空串；注册接口强制填写，未设置时该字段不下发（前端也不渲染）。

## 快速开始（Docker，推荐）

```bash
cp .env.example .env   # 已有 .env 可跳过；记得改 SESSION_SECRET
docker compose up -d --build
# 初始化数据库表 + 种子数据（管理员、默认版块、基础敏感词）
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
```

访问 http://localhost:3000 ，管理员账号见 `.env` 的 `ADMIN_STUDENT_ID` / `ADMIN_PASSWORD`（默认 `000000000001` / `admin123456`，**生产必须修改**）。

## 本地开发

需要 Node 18+ 和一个 MySQL 8（可用 `docker compose up -d mysql` 只起数据库，映射端口 3307）：

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接串 |
| `SESSION_SECRET` | JWT 会话密钥，生产必须随机生成 |
| `CRON_SECRET` | 热榜重算接口密钥 |
| `STUDENT_ID_PATTERN` | 学号校验正则（默认 12 位数字） |
| `ADMIN_STUDENT_ID` / `ADMIN_NAME` / `ADMIN_PASSWORD` | 种子管理员（仅首次 seed 生效） |
| `MODERATION_LLM_URL` / `MODERATION_LLM_MODEL` | 可选 LLM 审核 agent（Ollama 等 OpenAI 兼容 `/api/generate` 格式），留空则仅敏感词审核 |
| `UPLOAD_DIR` | 图片上传目录（默认 `uploads`，docker 下挂 `/data/uploads`） |
| `NEXT_PUBLIC_SITE_NAME` | 站点显示名 |

## 部署到物理服务器

1. 安装 Docker + docker compose，克隆本仓库
2. `docker compose up -d --build` 后执行上面的 db push / seed
3. 用 nginx/caddy 反向代理 3000 端口，配置 HTTPS（国内服务器还需 ICP 备案 + 公安备案后方可绑定域名）
4. 定时重算热榜：crontab 加 `*/10 * * * * curl -X POST -H "x-cron-secret: <CRON_SECRET>" http://localhost:3000/api/cron/recompute-hot`（不配置也不影响基本运行，仅热榜随互动即时刷新、衰减略滞后）

数据备份：备份 `hzpu_mysql`（数据库）与 `hzpu_uploads`（图片）两个 docker volume。

### 从旧版本升级

本版本给 `users.name` 加了唯一索引、并新增 `users.real_name` 列，用 `prisma db push` 升级前请先自查：

```sql
-- 若返回结果非空，说明已有重名昵称，需要先人工改名，否则唯一索引创建会失败
SELECT name, COUNT(*) c FROM users GROUP BY name HAVING c > 1;
```

`real_name` 带默认空串，历史数据可平滑升级；这些用户首次访问时前端不展示实名信息，可由管理员在后台补录或让其重新注册。

## 预留接口说明

以下内容已有 API 契约/占位，未做完整实现或需要外部资源，接入时按需扩展：

- **LLM 审核 agent**：审核管线已预留第二层（`src/lib/moderation.ts`），配置 `MODERATION_LLM_URL` 即启用；未配置时仅本地敏感词审核。LLM 不可达时保守放行（不误杀），需强审核场景建议改为拒绝并告警。
- **校园统一认证**：当前为学号+密码自建账号。若学校提供统一身份认证（CAS/OAuth），替换 `src/app/api/auth/*` 即可，用户表结构兼容。
- **学号真实性**：当前仅校验学号格式，不核验学号是否真实属于本校学生。防校外注册需接入教务/统一认证数据源或注册审核流程。
- **站内搜索**：当前为 SQL `LIKE` 子串匹配，校园规模够用；数据量大后可换 MySQL FULLTEXT 或 Elasticsearch（搜索接口形状不变）。
- **图片处理**：仅校验类型/大小后原样存储，无缩略图/水印/鉴黄；违规图片依赖审核层与人工巡查。

## API 一览

统一响应信封：成功 `{ ok: true, data }`，失败 `{ ok: false, error }`。分页参数 `?page=&pageSize=`（page 从 1，pageSize 上限 50）。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 学号注册 `{studentId,name,realName,password}`，昵称重复返回 409 |
| POST | `/api/auth/login` / `logout` | 登录 / 登出 |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/boards` | 版块列表 |
| GET | `/api/boards/[slug]` | 版块帖子 `?sort=new\|hot` |
| GET/POST | `/api/posts` | 帖子列表 / 发帖（走审核） |
| GET | `/api/posts/[id]` | 帖子详情 + 楼层 |
| POST | `/api/posts/[id]/floors` | 回帖（走审核） |
| GET/POST | `/api/notifications` , `/read` | 通知 / 标记已读 |
| GET/POST | `/api/messages` , `/messages/[id]` | 私信会话 / 对话 |
| POST | `/api/upload` | 图片上传（multipart，≤5MB） |
| GET | `/api/search?q=&type=post\|user` | 搜索 |
| GET | `/api/hot` | 热榜 |
| POST | `/api/cron/recompute-hot` | 全量重算热榜（需 `x-cron-secret`） |
| GET/POST | `/api/admin/moderation` , `/resolve` | 审核队列 / 处理 |
| GET/POST/PUT/DELETE | `/api/admin/boards*` | 版块管理 |
| GET/POST | `/api/admin/users*` | 用户管理（封禁/角色） |
| GET/POST/DELETE | `/api/admin/words` | 敏感词 |
| GET | `/api/admin/logs` | 审核日志 |

## 目录结构

```
prisma/schema.prisma   # 数据模型
src/lib/               # db / auth / api 信封 / 审核管线 / 提及 / 热榜 / users（作者信息可见性）
src/app/api/           # 后端路由
src/app/               # 页面（board, post, hot, search, messages, admin...）
src/components/        # UI 组件
```

## 内容安全提醒

校内论坛面向学生，请先审后发管线 + 管理员巡查制度。国内服务器上线需完成 ICP 备案，并遵守《网络信息内容生态治理规定》；建议制定并公示社区公约与违规处理规则。
