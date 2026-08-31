# Инициализация монорепозитория

Пошаговая инструкция: от пустой папки до состояния, когда `npm run dev` поднимает
базу, API и витрину, а они видят друг друга.

Это **этап M0** из [PRD](PRD.md#12-этапы). В конце ничего не делает ничего полезного —
и так и задумано. Задача этапа: чтобы каркас стоял ровно и дальше можно было
добавлять функциональность, а не воевать со сборкой.

Ориентировочно **2–4 часа** вместе с первым деплоем.

> **Инструкция пройдена целиком 30.08.2026** в чистой папке — все команды
> выполнены, все интерактивные вопросы записаны, витрина собрана и отрисована.
> Версии на тот момент:
> Node 24.18, npm 11.16, TypeScript 7.0.2, NestJS CLI 12, Nuxt 4.5.2,
> Nuxt UI 4.11, Prisma 7.10, zod 4.5.4, PostgreSQL 18.
>
> Экосистема меняется быстро — если команда ведёт себя иначе, чем написано,
> сначала посмотри версию пакета, а потом уже ищи ошибку у себя.

---

## Что понадобится

| Инструмент | Проверка |
| --- | --- |
| Node 24 | `node -v` → `v24.x` |
| npm 10+ | `npm -v` |
| Docker | `docker --version` |
| Git | `git --version` |

Если Node не 24 — переключись через nvm:

```bash
nvm use 24
```

---

## Шаг 1. Каркас и git

```bash
cd ~/projects/electronics-shop

mkdir -p apps packages
git init
```

Зафиксируй версию Node, чтобы она не зависела от того, что сейчас в терминале:

```bash
echo "24" > .nvmrc
```

`.gitignore` в корне:

```gitignore
node_modules/
dist/
.output/
.nuxt/
.nitro/
.cache/

# Prisma 7 генерирует клиент в исходники проекта, а не в node_modules
generated/

.env
.env.*
!.env.example

coverage/
*.log
.DS_Store
```

> Важно: `.env` **не коммитим никогда**, `.env.example` — коммитим всегда.
> В примере лежат имена переменных без значений, чтобы было понятно, что нужно
> заполнить.

---

## Шаг 2. Корневой package.json

Создай `package.json` в корне вручную (не через `npm init`, там лишние поля):

```json
{
  "name": "electronics-shop",
  "version": "0.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "engines": {
    "node": ">=24"
  },
  "scripts": {}
}
```

Три вещи, которые тут важны:

- `"private": true` — защита от случайной публикации в npm;
- `"workspaces"` — то самое, ради чего вся затея: npm будет ставить зависимости
  один раз в корневой `node_modules` и связывать пакеты между собой симлинками;
- **`"type"` не указываем.** Nest работает в CommonJS, Nuxt в ESM — пусть каждое
  приложение решает само в своём `package.json`.

---

## Шаг 3. База данных в Docker

`docker-compose.yml` в корне:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: shop-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: shop
      POSTGRES_PASSWORD: shop
      POSTGRES_DB: shop
    ports:
      - '5432:5432'
    volumes:
      # Именно /var/lib/postgresql, БЕЗ /data — см. пояснение ниже
      - shop-pgdata:/var/lib/postgresql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U shop']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  shop-pgdata:
```

Запусти и проверь:

```bash
docker compose up -d
docker compose ps
```

**Проверка:** в колонке статуса должно быть `healthy`. Если `starting` — подожди
несколько секунд и повтори.

> Пароль `shop/shop` — только для локальной разработки. На проде будет управляемый
> Postgres (Neon или Supabase) со своей строкой подключения.
> Версия 18 — актуальная стабильная на август 2026.

> **Про точку монтирования — это важно.** В образах PostgreSQL до 17-й версии
> данные монтировали в `/var/lib/postgresql/data`. **Начиная с 18-й версии так
> делать нельзя:** образ сам раскладывает данные по подпапкам с номером версии
> (`/var/lib/postgresql/18/docker`), чтобы потом было возможно обновление через
> `pg_upgrade`. Монтировать нужно **на уровень выше** — в `/var/lib/postgresql`.
>
> Со старым путём контейнер уходит в бесконечный `Restarting` с сообщением
> «there appears to be PostgreSQL data in /var/lib/postgresql/data».

---

## Шаг 4. Пакет контрактов

Начинаем с него, потому что от него зависят оба приложения.

```bash
mkdir -p packages/contracts/src
```

`packages/contracts/package.json`:

```json
{
  "name": "@shop/contracts",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch --preserveWatchOutput"
  }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

> **Почему на выходе CommonJS.** NestJS работает в CJS, Nuxt — в ESM. Vite умеет
> потреблять CJS-зависимости и сам их преобразует, а Nest ESM-пакет из коробки
> не примет. Один CJS-выход подходит обоим — это самый скучный работающий вариант.
>
> `module: node16` не значит ESM. Он значит «смотри на поле `type` в
> ближайшем package.json и решай по нему». У нашего пакета `type` не указан,
> значит Node считает файлы CommonJS — и TypeScript собирает именно его.
> Проверить можно после сборки: в `dist/index.js` должно быть `exports.` ,
> а не `export`.
>
> **Не пиши `"moduleResolution": "Node"`** — начиная с TypeScript 6 этот режим
> удалён, сборка падает с `TS5108`. И два значения связаны: `moduleResolution: node16`
> требует `module: node16`, иначе будет `TS5110`.

`packages/contracts/src/index.ts` — пока заглушка, чтобы проверить связку:

```ts
import { z } from 'zod'

export const HealthResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
})

export type HealthResponse = z.infer<typeof HealthResponse>
```

Ставим зависимости **из корня**, указывая рабочее пространство:

```bash
npm i zod -w @shop/contracts
npm i -D typescript -w @shop/contracts
```

**Проверка:**

```bash
npm run build -w @shop/contracts
ls packages/contracts/dist
```

Должны появиться `index.js` и `index.d.ts`.

---

## Шаг 5. API на NestJS

```bash
cd apps
npx @nestjs/cli@latest new api --package-manager npm --skip-git --skip-install --no-observe
cd ..
```

Флаги важны:

- `--skip-git` — иначе Nest заведёт **свой** репозиторий внутри нашего;
- `--skip-install` — зависимости поставим из корня, чтобы они попали в общий
  `node_modules`;
- `--no-observe` — иначе CLI задаст лишний вопрос про observability,
  а он нам сейчас не нужен.

### Команда задаст один вопрос — флага для него нет

```
? Which module system would you like to use?
> ESM (ES Modules)     [ with vitest ]
  CJS (CommonJS)       [ with jest ]
```

**Выбирай ESM.** Причина конкретная: вместе с ESM Nest ставит **Vitest**, а с CJS —
Jest. Vitest ты уже знаешь: `vi.fn`, `vi.mock`, `describe/it/expect`, фейковые
таймеры — всё то же самое, что во фронтенде. Jest пришлось бы учить заново ради
одного приложения, а разница в возможностях для нас нулевая.

Дополнительно: Nuxt и Vite — тоже ESM, так что весь проект будет в одном формате
модулей.

| | ESM | CJS |
| --- | --- | --- |
| Тесты | **Vitest** — уже знаком | Jest — учить с нуля |
| `"type"` в package.json | `"module"` | не указан |
| Совпадает с Nuxt | да | нет |
| Туториалов в интернете | меньше | больше |
| Сборка через webpack | не поддерживается | поддерживается |

Последняя строка неважна: сборка по умолчанию идёт через `tsc`, webpack нужен
только при `nest build --webpack`, а мы им пользоваться не будем.

> **Пакет контрактов менять не надо.** Он собирается в CommonJS, и я проверил,
> что ESM-приложение импортирует из него именованные экспорты штатно.
> CJS остаётся безопасным общим знаменателем для обоих приложений.

Открой `apps/api/package.json` и поменяй имя:

```json
{
  "name": "@shop/api",
  ...
}
```

Туда же добавь зависимость от контрактов:

```json
  "dependencies": {
    "@shop/contracts": "*",
    ...
  }
```

`"*"` означает «бери из рабочего пространства» — npm свяжет пакет симлинком,
а не полезет в реестр.

### Порт

Nuxt по умолчанию занимает 3000, поэтому API переезжает на 3001.
В `apps/api/src/main.ts`:

```ts
await app.listen(process.env.PORT ?? 3001)
```

### Переменные окружения

`apps/api/.env.example`:

```dotenv
DATABASE_URL="postgresql://shop:shop@localhost:5432/shop?schema=public"
PORT=3001

JWT_ACCESS_SECRET="замени-на-длинную-случайную-строку"
JWT_REFRESH_SECRET="замени-на-другую-длинную-случайную-строку"

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

Скопируй его в рабочий файл и заполни:

```bash
cp apps/api/.env.example apps/api/.env
```

Секреты для JWT сгенерируй, а не придумывай:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Ключи Stripe и Cloudinary пока можно оставить пустыми — они понадобятся на M5 и M7.

---

## Шаг 6. Prisma

> **Внимание с версиями.** У пакета `prisma` тег `latest` сейчас указывает на
> **release candidate восьмой версии**, а у `@prisma/client` — на стабильную
> седьмую. Поставишь оба через `@latest` — получишь несовместимую пару и ошибку
> при первой же команде. Поэтому версия задаётся явно.

Все команды — **из корня репозитория** (`~/projects/electronics-shop`):

```bash
npm i -D prisma@7 dotenv tsx -w @shop/api
npm i @prisma/client@7 -w @shop/api
```

**Обязательно проверь, что CLI встал, и какой версии:**

```bash
node -p "require('./node_modules/prisma/package.json').version"
```

Должно быть `7.x.x`. Если команда падает с «Cannot find module» — первая
установка не прошла, повтори её и не иди дальше.

> **Почему эта проверка важнее, чем кажется.** `npx` устроен так: находит
> локальный бинарник — запускает его; **не находит — молча скачивает свежий
> из сети.** А свежий сейчас `8.0.0-rc`, и там флага `--datasource-provider`
> уже нет:
>
> ```
> ✘ [CLI.INVALID_ARGUMENTS] No flag registered for --datasource-provider
> ```
>
> Ошибка выглядит так, будто инструкция неверная, а на самом деле просто
> не установился CLI.

Теперь инициализация — **из корня**, без `cd`:

```bash
npm exec -w @shop/api -- prisma init --datasource-provider postgresql
```

`npm exec -w` запускает команду **в папке рабочего пространства** и гарантированно
берёт его локальный бинарник. Файлы окажутся в `apps/api/`, а в сеть за чужой
версией ничего не полезет.

`dotenv` здесь не для красоты: **Prisma 7 больше не читает `.env` сам**,
переменные подгружаются явно в конфиге.

### Что создаст `prisma init`

```
apps/api/
├── prisma/schema.prisma
├── prisma7.config.ts        ← новый файл вместо ключа в package.json
├── .env                     ← с примером DATABASE_URL, перезапишет твой!
├── .gitignore
└── .claude/skills/ , .agents/skills/ , .windsurf/skills/
```

Две вещи требуют внимания сразу:

1. **`.env` перезапишется.** Открой `apps/api/.env` и верни свои переменные из
   `.env.example` — команда положит туда только строку-пример от Prisma.
2. **Папки со `skills`** — это машиночитаемая документация Prisma для ИИ-ассистентов.
   Полезная штука, коммитить можно.

### prisma7.config.ts

Сгенерированный файл уже почти готов, проверь что в нём это:

```ts
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',      // ← добавь эту строку
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
```

**Строку `seed` надо дописать руками** — генератор её не создаёт.

> **Что изменилось по сравнению с Prisma 6 и старыми туториалами.**
> Раньше сиды настраивались ключом `"prisma": { "seed": "..." }` в `package.json`,
> а строка подключения бралась прямо в схеме через `env("DATABASE_URL")`.
> В седьмой версии и то, и другое переехало в `prisma7.config.ts`.
> Если наткнёшься на статью со старым способом — она про Prisma 6.

### schema.prisma

Сгенерированная схема тоже выглядит непривычно:

```prisma
generator client {
  provider = "prisma-client"          // не "prisma-client-js"
  output   = "../generated/prisma"    // клиент кладётся В ПРОЕКТ
}

datasource db {
  provider = "postgresql"
  // url здесь больше НЕТ — он в prisma7.config.ts
}
```

**Клиент теперь генерируется в исходники проекта**, а не прячется в `node_modules`.

> **Куда именно — зависит от структуры.** Если в папке есть `src/`, Prisma пишет
> `output = "../src/generated/prisma"`. У NestJS папка `src/` есть, поэтому клиент
> окажется в **`apps/api/src/generated/prisma/`**. Загляни в свою схему и сверься —
> дальше путь импорта считается от этого места.

Папка `generated/` уже в `.gitignore` с шага 1, и правило ловит её на любой
глубине — проверить можно так:

```bash
git check-ignore -v apps/api/src/generated/prisma/client.ts
```

**Импорт клиента изменился, и не только из-за пути:**

```ts
// ❌ старый способ, из туториалов по Prisma 5–6
import { PrismaClient } from '@prisma/client'

// ❌ без расширения — не соберётся
import { PrismaClient } from './generated/prisma/client'

// ✅ так
import { PrismaClient } from './generated/prisma/client.js'
```

Расширение `.js` при том, что файл называется `client.ts`, выглядит опечаткой,
но это правильно. У NestJS в ESM-режиме стоит `moduleResolution: nodenext`,
а он требует явное расширение в относительных импортах — и ожидает **`.js`**,
подставляя `.ts` сам при компиляции. Без расширения будет:

```
TS2835: Relative import paths need explicit file extensions ...
        Did you mean './generated/prisma/client.js'?
```

Путь считается от файла, где пишешь импорт: из `src/prisma/prisma.service.ts`
это будет `../generated/prisma/client.js`.

### Скрипты

В `apps/api/package.json`:

```json
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "prisma db seed"
  }
```

Ключа `"prisma"` в `package.json` больше **не нужно** — всё в конфиге.

### Проверка

Добавь в `schema.prisma` временную модель:

```prisma
model Ping {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
}
```

```bash
npm run prisma:migrate -w @shop/api -- --name init
npm run prisma:generate -w @shop/api
```

> **Вторая команда обязательна.** В Prisma 6 и раньше `migrate dev` сам запускал
> генерацию клиента. **В седьмой версии — нет:** миграция применяется, папка
> `generated/` не появляется, ошибки при этом никакой. Проверено отдельным
> прогоном на чистой базе.
>
> Чтобы не забывать, можно склеить их в один скрипт в `apps/api/package.json`:
> ```json
> "prisma:migrate": "prisma migrate dev && prisma generate"
> ```

**Что должно получиться:**

- команда вывела `Loaded Prisma config from prisma7.config.ts`;
- появилась папка `apps/api/prisma/migrations/<дата>_init/`;
- появилась папка **`apps/api/src/generated/prisma/`** с файлами `client.ts`, `models.ts`;
- `npm run prisma:studio -w @shop/api` открывает браузер и показывает таблицу `Ping`.

Модель `Ping` потом удалишь — она нужна только чтобы убедиться, что миграции
доезжают до базы.

---

## Шаг 7. Витрина на Nuxt

Мастер Nuxt задаёт пять вопросов, но их все можно передать флагами:

```bash
cd apps
npx create-nuxt@latest web --template=minimal --packageManager=npm --no-install --no-gitInit --modules=
cd ..
```

Разбор флагов:

- `--template=minimal` — **самый важный.** Есть ещё шаблон `ui` со встроенным
  Nuxt UI, и он выглядит соблазнительно, но **не подходит**: он настроен под pnpm,
  тащит `pnpm-lock.yaml`, `pnpm-workspace.yaml` и поле `packageManager: pnpm`,
  что конфликтует с нашей npm-монорепой. Ставим Nuxt UI руками на шаге 8;
- `--no-install` — зависимости поставим из корня;
- `--no-gitInit` — репозиторий уже есть в корне;
- `--modules=` — **именно так, с пустым значением.** Без этого флага мастер
  спросит «Would you like to browse and install modules?». Модули мы ставим
  руками на шаге 8, поэтому список пустой.

> Если всё же увидишь этот вопрос — отвечай **No**. Проверено по исходникам
> `create-nuxt`: вопрос задаётся, только когда флаг `--modules` не передан
> вообще; с пустым значением ветка с опросом пропускается.

Без флагов мастер задаст пять вопросов: шаблон, git, менеджер пакетов,
установка зависимостей и модули.

### Что получится

```
apps/web/
├── app/
│   └── app.vue          ← корневой компонент
├── public/
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

> **Запомни: в Nuxt 4 исходники лежат в `app/`.** Псевдоним `~` указывает
> именно туда, а не в корень приложения. Компоненты, страницы, стили и
> `app.config.ts` создаются **внутри `app/`** — это частая причина «почему мой
> файл не подхватился».

Поменяй имя в `apps/web/package.json` и добавь контракты:

```json
{
  "name": "@shop/web",
  "dependencies": {
    "@shop/contracts": "*",
    ...
  }
}
```

`"type": "module"` там уже стоит — Nuxt ставит его сам.

### Переменные окружения

`apps/web/.env.example`:

```dotenv
NUXT_PUBLIC_SITE_URL="http://localhost:3000"
NUXT_API_URL="http://localhost:3001"
```

```bash
cp apps/web/.env.example apps/web/.env
```

> `NUXT_API_URL` **без** `PUBLIC_` — адрес API нужен только серверной части Nuxt,
> которая проксирует запросы. В браузер он не попадает, и это правильно:
> см. §9.1 PRD про куки.

---

## Шаг 8. Nuxt UI

```bash
npm i @nuxt/ui @iconify-json/lucide -w @shop/web
```

Tailwind отдельно ставить не нужно — он приходит зависимостью внутри `@nuxt/ui`.
А `@iconify-json/lucide` кладёт коллекцию иконок локально, иначе они будут
загружаться из сети при каждой сборке.

Создай **`apps/web/app/assets/css/main.css`** — обрати внимание на `app/` в пути:

```css
@import 'tailwindcss';
@import '@nuxt/ui';
```

`apps/web/nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    apiUrl: '',
    public: {
      siteUrl: '',
    },
  },

  // Админка за логином — SSR ей не нужен (см. §3 PRD)
  routeRules: {
    '/admin/**': { ssr: false },
  },
})
```

Цвета темы задаются не в `nuxt.config`, а отдельно — **`apps/web/app/app.config.ts`**:

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
  },
})
```

Корневой **`apps/web/app/app.vue`** оборачивается в `<UApp>` — он даёт контекст
для тостов, тултипов и модалок:

```vue
<template>
  <UApp>
    <UButton label="It works" icon="i-lucide-check" />
  </UApp>
</template>
```

**Проверка:** собери витрину целиком — это надёжнее, чем смотреть глазами:

```bash
npm run build -w @shop/web
```

Сборка должна закончиться `✨ Build complete!`. Если хочешь убедиться в отрисовке:

```bash
cd apps/web && node .output/server/index.mjs
```

и открыть `http://localhost:3000` — кнопка со стилями Tailwind и SVG-иконкой.

> **В консоли будет написано `http://[::]:3000` — это нормально.** `[::]` —
> IPv6-запись «все сетевые интерфейсы», аналог `0.0.0.0`. Сервер сообщает,
> где он слушает, а не адрес для браузера. Открывай `http://localhost:3000`.
>
> Побочный эффект приятный: сайт виден и с телефона в той же сети по IP
> твоего компьютера. Если всё же нужен только localhost —
> `HOST=127.0.0.1 node .output/server/index.mjs`.

> **Про Nuxt UI Pro — актуально на v4.** Раньше часть компонентов была платной,
> но в четвёртой версии Pro влили в основную библиотеку: **весь пакет под MIT,
> все 125+ компонентов доступны всем.** Проверяется прямо в проекте:
>
> ```bash
> node -p "require('./node_modules/@nuxt/ui/package.json').license"   # MIT
> ls node_modules/@nuxt/ui/dist/runtime/components | grep Dashboard
> ```
>
> Значит, для админки можно брать `UDashboardPanel`, `UDashboardNavbar`
> и остальное без оглядки на лицензию. Если встретишь статью про платную Pro —
> она написана до v4.

### Что из Nuxt UI закрывает какие задачи проекта

| Задача из PRD | Компонент |
| --- | --- |
| Таблицы заказов и остатков в админке | `UTable` — внутри TanStack Table |
| Формы входа, регистрации, оформления | `UForm` + zod-схема из `@shop/contracts` |
| Фильтр по цене «от и до» | `USlider` с массивом значений |
| Фильтр по брендам | `USelectMenu` с множественным выбором |
| Галерея фото товара | `UCarousel` + полоса миниатюр |
| Пагинация каталога | `UPagination` |
| Модалки, тосты, выпадающие меню | `UModal`, `UToast`, `UDropdownMenu` |
| Звёзды рейтинга | своего нет — пишем сами на `UIcon` |

Связка `UForm` + zod — та причина, по которой Nuxt UI подходит этому проекту
лучше остальных: схема из `packages/contracts` проверяет форму в браузере
и тот же самый запрос на сервере. Одно определение, две проверки, разъехаться
они не могут.

## Шаг 9. Скрипты в корне

```bash
npm i -D concurrently
```

`npm` умеет запускать скрипты по всем рабочим пространствам, но не умеет держать
несколько долгоживущих процессов параллельно — для этого `concurrently`.

Замени `scripts` в корневом `package.json`:

```json
  "scripts": {
    "dev": "concurrently -n contracts,api,web -c gray,green,cyan \"npm:dev:contracts\" \"npm:dev:api\" \"npm:dev:web\"",
    "dev:contracts": "npm run dev -w @shop/contracts",
    "dev:api": "npm run start:dev -w @shop/api",
    "dev:web": "npm run dev -w @shop/web",

    "build": "npm run build -w @shop/contracts && npm run build -w @shop/api && npm run build -w @shop/web",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",

    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:migrate": "npm run prisma:migrate -w @shop/api",
    "db:seed": "npm run prisma:seed -w @shop/api",
    "db:studio": "npm run prisma:studio -w @shop/api"
  }
```

> Порядок в `build` не случайный: контракты собираются первыми, иначе оба
> приложения не найдут типы.

Теперь установка из корня, чтобы связались симлинки:

```bash
npm install
```

**Проверка:** должен появиться симлинк на общий пакет:

```bash
ls -la node_modules/@shop
```

Обе записи (`api`, `contracts`, `web`) должны быть ссылками на папки в репозитории.

---

## Шаг 10. Линтер и форматирование

Nest и Nuxt приносят свои конфиги ESLint. Общим сделаем только Prettier,
чтобы стиль не расходился между приложениями.

```bash
npm i -D prettier
```

`.prettierrc.json` в корне:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

`.prettierignore`:

```gitignore
node_modules
dist
.output
.nuxt
coverage
packages/contracts/dist
```

Добавь в корневые скрипты:

```json
    "format": "prettier --write .",
    "format:check": "prettier --check ."
```

---

## Шаг 11. CI

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      # Контракты первыми — от них зависят оба приложения
      - run: npm run build -w @shop/contracts

      - run: npm run format:check
      - run: npm run lint
      - run: npm run test
```

Пока тестов нет, шаг `test` просто ничего не найдёт — благодаря `--if-present`
это не ошибка.

---

## Шаг 12. Первый коммит и деплой

```bash
git add .
git commit -m "chore: инициализация монорепозитория"
```

Создай репозиторий на GitHub и запушь.

**Задеплой прямо сейчас**, пока приложение пустое. Это самый важный пункт всего
этапа: проект, который «почти готов, осталось выложить», не существует.

| Что | Куда | Настройка |
| --- | --- | --- |
| Витрина | Vercel | Root Directory → `apps/web`, Build Command → `cd ../.. && npm run build -w @shop/contracts && npm run build -w @shop/web` |
| API | Railway или Render | Root Directory → `apps/api` |
| База | Neon | скопировать строку подключения в переменные API |

Обе платформы поддерживают монорепозитории через настройку корневой директории —
её легко пропустить, и тогда сборка падает с «package.json not found».

---

## Проверка: всё ли встало

Пройди по списку. Каждый пункт проверяется одной командой.

- [ ] `node -v` → `v24.x`
- [ ] `docker compose ps` → postgres в статусе `healthy`
- [ ] `npm run build -w @shop/contracts` → появились `dist/index.js` и `dist/index.d.ts`
- [ ] `ls -la node_modules/@shop` → три симлинка
- [ ] `npm run db:migrate` → миграция применилась
- [ ] `npm run dev` → поднялись три процесса
- [ ] `http://localhost:3000` → страница Nuxt с кнопкой Nuxt UI и иконкой
- [ ] `http://localhost:3001` → ответ NestJS
- [ ] импорт `import { HealthResponse } from '@shop/contracts'` работает **и в API,
      и в web** — редактор подсказывает тип, сборка проходит
- [ ] `git status` → `.env` в списке не появляется
- [ ] CI на GitHub зелёный
- [ ] обе платформы деплоя показывают успешную сборку

Последний пункт про импорт — главный. Если контракты видны с обеих сторон,
монорепозиторий собран правильно, и дальше можно двигаться.

---

## Частые проблемы

**`Cannot find module '@shop/contracts'`**
Пакет не собран или не связан. По очереди:
```bash
npm run build -w @shop/contracts
npm install          # обязательно из КОРНЯ
```

**Nest создал свой репозиторий внутри нашего**
Забыт флаг `--skip-git`. Лечится: `rm -rf apps/api/.git`.

**Откуда запускать `npm i` в монорепозитории**
Короткий ответ: **из корня, с флагом `-w`**. Так однозначно понятно, куда
попадёт зависимость:
```bash
npm i пакет -w @shop/web
```

Справедливости ради: npm 11 сам находит корень рабочего пространства, поэтому
запуск из `apps/web` тоже отработает правильно — проверено, отдельный
`node_modules` и второй lock-файл не создаются. Но привычка запускать из корня
надёжнее: она не зависит от версии npm и не даёт ошибиться, когда пакетов
станет больше.

**Prisma не видит `DATABASE_URL`**
Файл `.env` должен лежать в `apps/api/`, а не в корне. Проверь:
```bash
cat apps/api/.env | grep DATABASE_URL
```

**Контейнер postgres в статусе `Restarting`, в логах «there appears to be
PostgreSQL data in /var/lib/postgresql/data»**
Точка монтирования от старых версий образа. В `docker-compose.yml` должно быть
`- shop-pgdata:/var/lib/postgresql` **без** `/data` на конце. После правки нужен
полный сброс тома, потому что старые данные несовместимы:
```bash
docker compose down -v
docker compose up -d
```

**`npm warn allow-scripts ... packages have install scripts not yet covered`**
Это предупреждение npm 11, а не ошибка. Установочные скрипты пакетов
(`esbuild`, `fsevents`) по умолчанию не выполняются. Сборка при этом проходит —
проверено. Если однажды что-то реально сломается, разрешить их можно так:
```bash
npm approve-scripts --allow-scripts-pending
```

**Nuxt не видит файл, который я создал**
В Nuxt 4 исходники лежат в `apps/web/app/`, и псевдоним `~` указывает туда.
Файл должен быть в `app/assets/...`, `app/components/...`, `app/pages/...`,
а не в корне `apps/web/`.

**Порт 3000 занят**
Скорее всего, остался процесс от прошлого запуска:
```bash
lsof -ti:3000 | xargs kill
```

**`TS5108: Option 'moduleResolution=node10' has been removed`**
Устаревшее значение в `tsconfig.json`. Меняются **две строки сразу**:
`"module": "node16"` и `"moduleResolution": "node16"`. Поменяешь одну — получишь
`TS5110`, они связаны.

**`✘ [CLI.INVALID_ARGUMENTS] No flag registered for --datasource-provider`**
CLI `prisma` не установлен в проекте, поэтому `npx` скачал свежий из сети —
а это `8.0.0-rc`, где флаг убрали. Проверь и доустанови:
```bash
node -p "require('./node_modules/prisma/package.json').version"   # ждём 7.x.x
npm i -D prisma@7 dotenv tsx -w @shop/api
npm exec -w @shop/api -- prisma init --datasource-provider postgresql
```

**Prisma ругается на несовпадение версий CLI и клиента**
`prisma@latest` сейчас указывает на кандидат в релиз восьмой версии.
Ставь явно:
```bash
npm i -D prisma@7 -w @shop/api
npm i @prisma/client@7 -w @shop/api
```

**После `migrate dev` не появилась папка `generated/`**
Так и должно быть: Prisma 7, в отличие от шестой, **не генерирует клиент при
миграции**. Запусти отдельно:
```bash
npm run prisma:generate -w @shop/api
```
Ищи результат в `apps/api/src/generated/prisma/` — если в проекте есть папка
`src/`, Prisma кладёт клиент внутрь неё.

**`Cannot find module '@prisma/client'` или `TS2835` при импорте клиента**
В Prisma 7 клиент лежит в исходниках, а не в `node_modules`, и импорт требует
явного расширения:
```ts
import { PrismaClient } from './generated/prisma/client.js'
```

**Prisma не видит `DATABASE_URL`, хотя `.env` заполнен**
Prisma 7 не читает `.env` сам. Проверь, что в `prisma7.config.ts` первой строкой
стоит `import 'dotenv/config'` и что `dotenv` установлен.

**Vercel: «package.json not found»**
Не задан Root Directory. Он должен указывать на `apps/web`, а команда сборки —
подниматься в корень, чтобы собрать контракты.

---

## Что дальше

Каркас готов — начинается **M1** из [PRD](PRD.md#12-этапы):

1. Схема Prisma по §7 PRD: модели, связи, индексы, enum'ы.
2. Первая настоящая миграция вместо `Ping`.
3. Сиды: категории, бренды, товары, отзывы, заказы, три демо-аккаунта.
4. Каталог с поиском, фильтрами и пагинацией.
5. Карточка товара.
