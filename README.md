<p align="center">
  <img src="client/public/favicon.svg" width="72" height="72" alt="OperPit logo">
</p>

<h1 align="center">OperPit</h1>

<p align="center">
  <strong>A bilingual creative portfolio, editorial archive, and AI-assisted workspace.</strong><br>
  مساحة عربية وإنجليزية تجمع معرض الأعمال والمقالات وأدوات الذكاء الاصطناعي.
</p>

<p align="center">
  <a href="https://github.com/GRYKJ249/OperPit">Repository</a> ·
  <a href="https://github.com/GRYKJ249/OperPit/issues">Report an issue</a> ·
  <a href="#english">English</a> ·
  <a href="#العربية">العربية</a>
</p>

<p align="center">
  <a href="https://github.com/GRYKJ249/OperPit"><img alt="GitHub stars" src="https://img.shields.io/github/stars/GRYKJ249/OperPit?style=flat-square&logo=github"></a>
  <a href="https://github.com/GRYKJ249/OperPit/issues"><img alt="Open issues" src="https://img.shields.io/github/issues/GRYKJ249/OperPit?style=flat-square"></a>
  <a href="https://github.com/GRYKJ249/OperPit/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/GRYKJ249/OperPit?style=flat-square"></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=flat-square&logo=postgresql&logoColor=white">
</p>

> **Project status:** OperPit is an actively developed portfolio/archive application. Some profile details, social links, articles, and project case studies are sample content and should be replaced before presenting the site as a real client portfolio. There is no permanent public demo URL at this time.
>
> **حالة المشروع:** OperPit تطبيق قيد التطوير. بعض بيانات الملف الشخصي والروابط الاجتماعية والمقالات ودراسات المشاريع محتوى تجريبي يجب استبداله قبل تقديم الموقع كمعرض أعمال حقيقي. لا يوجد رابط عرض عام دائم حاليًا.

## Visual preview

The images below are bundled concept artwork used by the current sample portfolio. They are **project visuals**, not browser screenshots or claims of commissioned client work.

<p align="center">
  <img src="client/public/manus-storage/async-images/yJuUsbuNxNV39MXi8K0w0I/image-1.webp" alt="OperPit hero artwork: cobalt, ivory, charcoal, and coral geometry" width="92%">
</p>

<p align="center">
  <img src="client/public/manus-storage/async-images/yJuUsbuNxNV39MXi8K0w0I/image-2.webp" alt="Concept coffee identity and packaging" width="31%">
  <img src="client/public/manus-storage/async-images/yJuUsbuNxNV39MXi8K0w0I/image-3.webp" alt="Concept urban mobility product screens" width="31%">
  <img src="client/public/manus-storage/async-images/yJuUsbuNxNV39MXi8K0w0I/image-4.webp" alt="Concept architecture website artwork" width="31%">
</p>

## Contents

- [English](#english)
- [العربية](#العربية)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Security and limitations](#security-and-limitations)
- [License](#license)

## English

### Overview

OperPit is a responsive, Arabic/English creative portfolio and content archive. It combines editorial-style portfolio pages with a PostgreSQL-backed server and optional AI, Git-provider, and Telegram integrations. The interface supports right-to-left Arabic and left-to-right English, along with a switchable theme.

### Features

- **Portfolio and services:** profile pages, six work categories, concept case studies, service descriptions, and project detail pages.
- **Editorial archive:** searchable and filterable journal articles with topic pages and reading-friendly layouts.
- **Daily learning feed:** a workflow for creating five bilingual notes across programming, general psychology, financial-literacy education, design, and learning, with generated illustrations. Automatic daily runs require a configured hosting scheduler and AI/image providers.
- **AI Studio and archive guide:** AI-assisted drafting and code explanation, plus an archive-aware assistant that answers using the site's available content.
- **AI Council:** a private, owner-controlled workspace for configured AI providers, discussion, meetings, polls, and moderation actions.
- **GitHub and GitLab explorers:** read-only browsing of public repositories, file trees, and supported text files. Repository code is not executed.
- **Managed repository mirrors:** optional, server-side synchronization of owned GitHub/GitLab repositories. The `/projects` viewer is read-only; it does not edit files or push commits back to a provider.
- **Optional Telegram assistant:** a bot that can reply using a configured text provider when `TELEGRAM_BOT_TOKEN` is available.
- **SEO and sharing:** route-aware titles, descriptions, Open Graph metadata, and prerendering as part of the production build.
- **PostgreSQL persistence:** Drizzle ORM schema and versioned PostgreSQL migrations for application data.

### Routes

| Area | Route |
|---|---|
| Home | `/` |
| About and practice | `/about`, `/journey`, `/approach`, `/skills`, `/toolkit`, `/process` |
| Services | `/services`, `/services/:slug` |
| Work | `/work`, `/work/:slug` and category pages |
| Journal | `/journal`, `/journal/:slug`, `/journal/topics/:topic` |
| Daily archive | `/daily`, `/daily/:slug` |
| Public repository explorers | `/github`, `/gitlab` |
| Managed repository viewer | `/projects`, `/projects/:id` |
| AI tools | `/ai-studio`, `/council` |
| Community and contact | `/testimonials`, `/faq`, `/contact` |

### Technology

- **Frontend:** React 19, TypeScript, Vite, Wouter, Tailwind CSS, Radix UI, and Framer Motion.
- **Backend:** Node.js, Express, tRPC, and Zod.
- **Database:** PostgreSQL, Drizzle ORM, and the `pg` driver.
- **Integrations:** configurable AI providers, GitHub/GitLab APIs, and the Telegram Bot API.
- **Packaging:** Dockerfile is included for building the production application.

### Architecture

```mermaid
flowchart LR
    Browser[Browser\nReact + TypeScript + Vite] -->|HTTP / tRPC| Server[Express application]
    Server --> ORM[Drizzle ORM]
    ORM --> DB[(PostgreSQL)]
    Server -. optional .-> AI[Configured AI providers]
    Server -. optional .-> GH[GitHub API]
    Server -. optional .-> GL[GitLab API]
    Server -. optional .-> TG[Telegram Bot API]
```

## Local development

### Requirements

- Node.js 22 or a compatible modern Node.js release.
- pnpm 10.18.0 (the version pinned in `package.json`).
- PostgreSQL for database-backed features.

### Install and run

```bash
git clone https://github.com/GRYKJ249/OperPit.git
cd OperPit
corepack enable
pnpm install --frozen-lockfile
```

Create an ignored `.env` file in the repository root. At minimum, set a PostgreSQL connection string:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/operpit
PORT=3000
```

Create the database and apply the checked-in PostgreSQL migrations, then start the development server:

```bash
createdb operpit
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`. The server also exposes `GET /api/health` for a simple health check.

### Useful commands

```bash
pnpm dev          # Run the full app with Vite hot reload
pnpm check        # TypeScript type-check
pnpm test         # Run the Vitest suite
pnpm build        # Build the client, prerender public pages, and bundle the server
pnpm start        # Run the production build
pnpm db:migrate   # Apply existing PostgreSQL migrations
pnpm db:push      # Generate and apply a schema migration (development workflow)
```

For production, configure `DATABASE_URL` in the hosting environment, run `pnpm build`, apply migrations with `pnpm db:migrate`, and then run `pnpm start`. Review schema changes before applying them to a production database.

### Docker

```bash
docker build -t operpit .
docker run --rm --env-file .env -p 3000:3000 operpit
```

The PostgreSQL server must be reachable from inside the container. In particular, `127.0.0.1` inside a container refers to the container itself, not the host database.

## Configuration

All secrets belong in server-side environment variables. Never put provider keys in browser code, commit them to Git, or paste them into this README.

### Core

- `DATABASE_URL` — PostgreSQL connection string; required for persistent application features.
- `PORT` — HTTP port; defaults to `3000`.

### AI providers

Text providers are optional and can be configured independently. The application currently supports Manus-managed AI, OpenAI-compatible chat, Gemini, DeepSeek, and Groq.

- Manus-managed services: `MANUS_API_URL`, `MANUS_API_KEY`.
- OpenAI: `PORTFOLIO_OPENAI_API_KEY` or `PORTFOLIO_OPENAI_API_KEYS`; optional model/base settings include `PORTFOLIO_OPENAI_MODEL` and `PORTFOLIO_OPENAI_API_BASE`.
- Gemini: `PORTFOLIO_GEMINI_API_KEYS` and optional `PORTFOLIO_GEMINI_MODEL`.
- DeepSeek: `PORTFOLIO_DEEPSEEK_API_KEYS` and optional `PORTFOLIO_DEEPSEEK_MODEL`.
- Groq: `PORTFOLIO_GROQ_API_KEYS` and optional `PORTFOLIO_GROQ_MODEL`.
- Image generation can use `PORTFOLIO_GEMINI_API_KEYS` / `PORTFOLIO_GEMINI_IMAGE_MODEL` or `PORTFOLIO_OPENAI_API_KEY(S)` / `PORTFOLIO_IMAGE_MODEL`. The OpenAI-compatible image endpoint can be customized with `PORTFOLIO_IMAGE_API_BASE`.

When multiple provider keys are supplied, separate them with commas, semicolons, or new lines. Only configure services you intend to use; each provider may have its own pricing and rate limits.

### Optional integrations

- `GITHUB_TOKEN` and `GITLAB_TOKEN` enable authenticated listing and synchronization of owned repositories for the managed, read-only mirror feature. Public repository browsing does not require these tokens.
- `TELEGRAM_BOT_TOKEN` enables the optional Telegram assistant.
- Scheduled daily generation also requires the hosting platform's signed scheduler identity and a registered active job. Running `pnpm dev` alone does **not** create a daily schedule.

## Project structure

```text
client/                 React application, pages, features, and public assets
  src/data/             Portfolio content, translations, and route data
  src/features/         AI, daily feed, analytics, council, and Git integrations
  public/               Static assets served by the client
server/                 Express/tRPC APIs, integrations, and server services
  _core/                Server startup, auth, platform configuration, and Vite
  ai-provider.ts        Text and image provider adapters
  daily-generation.ts   Daily bilingual post and image generation
  managed-git.ts        GitHub/GitLab repository mirror service
drizzle/
  schema.ts             PostgreSQL schema
  postgres/             Active PostgreSQL migrations
  *.sql                 Legacy MySQL migration files; not used by current config
docs/                   Project and integration notes
scripts/                Build and prerender helpers
```

## Security and limitations

- `.env` is ignored by Git. Keep production secrets in the hosting provider's secret manager.
- The GitHub/GitLab project browser is read-only and limits which files it serves. It never runs repository code.
- Managed repositories are mirrored to the server filesystem under `data/managed-git`; PostgreSQL stores their metadata. Use persistent storage in production and establish a separate backup policy.
- AI-assisted daily material is educational sample content. It is not investment advice, a medical or psychological diagnosis, or a substitute for professional guidance.
- Profile name, email, social destinations, and some portfolio content are placeholders in `client/src/data/portfolio.ts`. Replace them before a public launch.
- The contact form opens an email draft in the visitor's email application; it is not a server-side contact-message inbox.
- The temporary Sandbox preview is not a permanent deployment target. Use a persistent host and persistent database/storage for production.

## Contributing

Bug reports and focused feature requests can be opened in [GitHub Issues](https://github.com/GRYKJ249/OperPit/issues). Before submitting a change, run:

```bash
pnpm check
pnpm test
pnpm build
```

## License

`package.json` currently declares the package license as **MIT**. A standalone `LICENSE` file is not currently present in the repository; add or confirm the license text before relying on the declaration for redistribution.

---

## العربية

### نبذة

**OperPit** موقع بورتفوليو وأرشيف إبداعي يدعم العربية والإنجليزية. يجمع معرض الأعمال والخدمات والمقالات مع خادم Node.js وقاعدة PostgreSQL، ويمكنه الاتصال بمزودي الذكاء الاصطناعي وGitHub وGitLab وTelegram عند إعداد مفاتيحهم على الخادم. يدعم اتجاه الكتابة من اليمين إلى اليسار للعربية ومن اليسار إلى اليمين للإنجليزية.

### أبرز المزايا

- **معرض الأعمال والخدمات:** ستة تصنيفات للأعمال وصفحات تفصيلية للمشاريع والخدمات.
- **مجلة وأرشيف:** مقالات قابلة للتصفح حسب الموضوع، مع بحث وتنقل مخصص للقراءة.
- **موجز يومي تعليمي:** بنية لتوليد خمس ملاحظات ثنائية اللغة حول البرمجة وعلم النفس العام والتثقيف المالي والتصميم والتعلم، مع صور توضيحية. تشغيله تلقائيًا يحتاج إلى جدولة على الاستضافة وإعداد مزودي الذكاء والصور.
- **استوديو الذكاء ومساعد الأرشيف:** إنشاء مسودات بمساعدة الذكاء الاصطناعي وشرح الكود، ومساعد يربط السؤال بالمحتوى المتاح في الموقع.
- **غرفة شورى خاصة:** واجهة محمية لعرض نقاشات واجتماعات واستطلاعات مزودي الذكاء المهيئين وإدارتها.
- **استكشاف GitHub وGitLab:** تصفح المستودعات العامة وملفاتها للقراءة فقط؛ لا يتم تشغيل الشيفرة.
- **مزامنة مستودعاتك:** نسخ مستودعات GitHub/GitLab التي تملكها إلى الخادم عند ضبط الرموز. العرض في `/projects` للقراءة فقط ولا يدعم تعديل الملفات أو رفع commits.
- **بوت Telegram اختياري:** يرد من خلال مزود نصي مهيأ عند وضع `TELEGRAM_BOT_TOKEN`.
- **PostgreSQL وDrizzle:** حفظ بيانات التطبيق عبر PostgreSQL وهجرات محفوظة في `drizzle/postgres/`.
- **SEO ومشاركة الروابط:** بيانات وصفية مخصصة للمسارات وإعادة تجهيز صفحات عامة أثناء البناء الإنتاجي.

### التشغيل محليًا

تحتاج إلى Node.js حديث، وpnpm `10.18.0`، وقاعدة PostgreSQL. بعد استنساخ المستودع وتثبيت الحزم، أنشئ ملف `.env` في جذر المشروع:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/operpit
PORT=3000
```

ثم أنشئ القاعدة وطبّق الهجرات وشغّل الموقع:

```bash
git clone https://github.com/GRYKJ249/OperPit.git
cd OperPit
corepack enable
pnpm install --frozen-lockfile
createdb operpit
pnpm db:migrate
pnpm dev
```

افتح `http://localhost:3000`. لا ترفع ملف `.env` إلى GitHub؛ فهو مستبعد من Git.

### أوامر التطوير

```bash
pnpm dev          # تشغيل التطوير مع تحديث الواجهة
pnpm check        # فحص TypeScript
pnpm test         # تشغيل الاختبارات
pnpm build        # بناء الواجهة والخادم وتجهيز الصفحات العامة
pnpm start        # تشغيل البناء الإنتاجي
pnpm db:migrate   # تطبيق هجرات PostgreSQL الموجودة
pnpm db:push      # إنشاء هجرة وتطبيقها ضمن تطوير المخطط
```

### الإعدادات والتكاملات

`DATABASE_URL` مطلوب للميزات التي تحفظ البيانات. مفاتيح AI اختيارية وتشمل Manus وOpenAI وGemini وDeepSeek وGroq. يمكن ضبط تكاملات GitHub وGitLab عبر `GITHUB_TOKEN` و`GITLAB_TOKEN`، وبوت Telegram عبر `TELEGRAM_BOT_TOKEN`. يجب حفظ جميع المفاتيح في بيئة الخادم أو مدير الأسرار، وليس في الشيفرة أو الواجهة.

تشغيل `pnpm dev` لا يفعّل توليدًا يوميًا تلقائيًا؛ ذلك يحتاج إلى مجدول موثّق ومهمة مفعّلة على منصة الاستضافة، إضافةً إلى مزودات الذكاء والصور.

### المحتوى التجريبي وحدود الاستخدام

الصور ودراسات الحالة الحالية أمثلة مفاهيمية. الاسم والبريد والروابط الاجتماعية في `client/src/data/portfolio.ts` بيانات مكانية يجب تعديلها. صفحة التواصل تفتح مسودة بريد في تطبيق الزائر ولا تخزن رسائل داخل قاعدة البيانات. عارض Git قراءة فقط، ويجب أن تُحفظ المرايا في مساحة تخزين دائمة عند النشر الإنتاجي.

### المساهمة والترخيص

للملاحظات والاقتراحات استخدم [GitHub Issues](https://github.com/GRYKJ249/OperPit/issues). شغّل `pnpm check` و`pnpm test` و`pnpm build` قبل إرسال التغييرات.

يذكر `package.json` أن الترخيص **MIT**، لكن المستودع لا يحتوي حاليًا على ملف `LICENSE` مستقل؛ يُرجى تأكيد نص الترخيص وإضافته قبل إعادة التوزيع.
