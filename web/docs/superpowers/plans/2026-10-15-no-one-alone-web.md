# No One Alone (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng phần **frontend** của "No One Alone" (bài dự thi Google AI Builder) từ prototype thành web app Next.js chạy trên Firebase: 3 view (Individual / Hospital / Community), đăng nhập bằng Firebase Auth, dữ liệu đi qua một lớp repo có thể chạy bằng mock hoặc Firestore của team backend.

**Architecture:** Next.js App Router, route `/[view]/[page]`. Build dạng static export (`output: 'export'`) và deploy lên Firebase Hosting; mọi tương tác Firebase (Auth, Firestore) chạy phía client bằng Firebase JS SDK. Toàn bộ dữ liệu đi qua `src/data/repo.ts`, chọn nguồn bằng env `NEXT_PUBLIC_DATA_SOURCE=mock|firebase`: `mock` đọc fixture, `firebase` đọc Firestore theo hợp đồng kiểu trong `src/data/types.ts`. Logic nghiệp vụ (mô phỏng rủi ro, quyền xem theo consent, kịch bản cấp cứu, tab theo vai trò) nằm trong `src/domain/` dưới dạng hàm thuần. UI = component React + CSS Modules, dùng lại nguyên bộ design token của prototype. Biểu đồ vẽ bằng SVG tay, cảnh 3D vẽ bằng Canvas 2D như prototype — không dùng thư viện chart.

**Tech Stack:** Next.js (bản stable mới nhất, App Router, static export) · React · TypeScript `strict` · CSS Modules · `next/font/google` · `@vis.gl/react-google-maps` (Google Maps JS API) · Firebase JS SDK (modular: `firebase/app`, `firebase/auth`, `firebase/firestore`) · Firebase Hosting (`firebase-tools`) · Vitest + @testing-library/react + jsdom · Playwright + @axe-core/playwright + pixelmatch + Firebase Emulator Suite · pnpm.

**Spec:** [docs/reference/prototype.html](../../reference/prototype.html) — bản HTML gốc của artifact. Đây là nguồn sự thật cho copy, số liệu, màu, layout. Khi plan không ghi giá trị cụ thể, lấy đúng giá trị trong file này (tìm theo tên biến/ID được nêu trong từng task).

**Phạm vi:** chỉ frontend. Gồm: UI đầy đủ, Firebase Auth phía client, đọc/ghi Firestore qua repo, deploy Firebase Hosting. **Không** gồm (thuộc team backend): mọi tính năng AI (agent, chat, voice, tóm tắt, Gemini) — FE chỉ hiển thị kết quả; Cloud Functions, schema/rules Firestore, tích hợp FHIR/thiết bị, voice agent, gửi cảnh báo thật, mô hình dự báo thật.

## Global Constraints

- Mọi dữ liệu là hư cấu; mọi trang hiển thị nhãn prototype: `Example figures for a prototype`.
- Câu miễn trừ trên trang dự báo: bác sĩ quyết định, không phải app (lấy nguyên văn trong khối `ℹ️ How this forecast works`).
- Ngôn ngữ giao diện: tiếng Anh kiểu Úc (Australian English), giữ nguyên văn copy của prototype.
- Thời điểm "bây giờ" cố định: `Wednesday 14 October, 15:10 AEDT` (lấy từ `#pgSub`), không dùng `Date.now()` cho dữ liệu hiển thị.
- Font: `Be Vietnam Pro` 300/400/500/600/700 và `JetBrains Mono` 400/500/600.
- Design token: chép nguyên khối `:root{--sky1…--frost}` và khối `body.night{…}` từ `prototype.html` (dòng 6–60) vào `src/styles/tokens.css`. Không đổi giá trị hex.
- Màu brand theo view: hospital `--brand:#2563a8;--brand-2:#4f8fd6`, community `--brand:#6d4fc0;--brand-2:#9a7fe0` (áp qua `body[data-view]`).
- Màn hình dành cho Margaret (component `PhoneScreen`): chữ tối thiểu **28 pt**, vùng chạm tối thiểu **92 px**, mỗi màn hình một việc.
- Chuẩn truy cập: mục tiêu **WCAG AAA** cho tương phản chữ thân; axe không có vi phạm `serious`/`critical`.
- Responsive: chạy ở bề rộng 360 px, lề 16 px, không cuộn ngang trang.
- `prefers-reduced-motion: reduce` → tắt tự quay canvas, tắt animation nhấp nháy, cuộn không smooth.
- **Giống artifact nhất có thể (ưu tiên cao nhất về UI):** copy nguyên văn (chữ, emoji, số liệu, thứ tự section, span `c4/c6/c8/c12`). CSS của mỗi section chép từ khối `<style>` của prototype vào CSS Module tương ứng; chỉ đổi tên selector, không đổi giá trị (padding, radius, shadow, font-size, màu). Icon dùng đúng SVG path trong `ICONS` (dòng 1125 và phần `EXTRA ICONS` dòng 1593), nét `stroke-width 1.8`, `viewBox 0 0 24 24`. Hiệu ứng (hover, transition, animation của `.em-tag`, `.listen`, `.dev-flash`) giữ nguyên thời lượng và easing. Mọi khác biệt so với prototype phải có lý do ghi trong commit message.
- Không thêm thư viện chart/3D/state management. Chỉ dependency đã liệt kê ở Tech Stack.
- Google Maps key đọc từ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` và Map ID từ `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`; **hiện để trống**. Khi trống, card bản đồ phải hiển thị canvas 3D của prototype (giống hệt artifact), không hiện lỗi, không gọi script Maps.
- Firebase config chỉ đọc từ env: `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`. Giá trị thật để trong `.env.local` (gitignore); commit `.env.example` với giá trị rỗng. `projectId` = `no-one-alone-511616`.
- Không có server code trong repo này: không API route, không middleware, không `redirect()` phía server (static export). Redirect theo vai làm phía client bằng `router.replace`.
- Component không import `firebase/*` trực tiếp. Chỉ `src/lib/firebase.ts` và `src/data/sources/firebase.ts` được import.

## Review Focus

1. **Dữ liệu bị khoá vẫn nằm trong DOM.** Prototype chỉ che bằng CSS (`.locked`). App thật phải **không render** dữ liệu của category mà người xem không được phép — người dùng mở DevTools không được thấy số. Test ở Task 5 và Task 11.
2. **Margaret bấm "Pause sharing".** Mọi category trừ `safety` phải bị khoá với mọi người xem, banner pause hiện, cảnh báo an toàn vẫn chạy (kể cả trong demo cấp cứu). Test ở Task 5 và Task 11.
3. **Deep link sai vai trò.** Mở `/individual/privacy` khi đang ở vai `family`, hoặc `/hospital/xyz` → phải chuyển về tab đầu tiên hợp lệ (vai sai) hoặc trả 404 (page không tồn tại), không crash. Test ở Task 3.
4. **Điện thoại 360 px.** Thanh tab dài (8 tab) phải cuộn ngang bên trong `nav`, drawer chiếm full width, canvas co theo khung; trang không cuộn ngang. Test ở Task 14.
5. **Người dùng bật reduced-motion hoặc chỉ dùng bàn phím.** Canvas vẫn vẽ khung tĩnh và có `aria-label`; drawer đóng bằng `Esc` và trả focus về nút đã mở; demo cấp cứu điều khiển được bằng phím. Test ở Task 4, 6, 10.

---

## File Structure

```
src/
  app/
    layout.tsx                    # fonts, tokens, AppStateProvider, Scene nền
    page.tsx                      # redirect → /individual/home
    [view]/[page]/page.tsx        # chọn page component theo view+page, 404 nếu sai
    not-found.tsx
  styles/tokens.css               # token chép từ prototype
  styles/globals.css              # reset, .glass, grid c4/c6/c8/c12, body.night
  domain/
    views.ts                      # VIEWS, TABS_FAM, TABS_SELF, tabsFor, resolvePage
    consent.ts                    # CATEGORIES, SHARE mặc định, sees, countSees
    riskSim.ts                    # simulateRisk, deltaLabel
    emergency.ts                  # STEPS, emergencyReducer
    district.ts                   # DISTRICT_MODELS, metricFor
  data/
    types.ts                      # kiểu domain
    fixtures/*.ts                 # một file / nhóm dữ liệu (margaret, health, forecast, lineage, record, hospital, community, news…)
    sources/mock.ts               # DataSource đọc fixture
    sources/firebase.ts           # DataSource đọc Firestore (Task 15)
    repo.ts                       # chọn source theo NEXT_PUBLIC_DATA_SOURCE, export các hàm get*
  lib/firebase.ts                 # initializeApp từ env, getAuth, getFirestore (singleton)
  auth/                           # AuthProvider, useAuth, SignInPage (Task 15)
  state/AppState.tsx              # context: who, viewer, paused, audit, emergency
  components/
    shell/   TopNav, ViewSwitcher, Tabs, ContextBar, WhoSwitch, Scene
    ui/      GlassCard, CardHeader, Pill, Chip, Kpi, Toast, Drawer, Switch, Slider, Locked
    charts/  Sparkline, LineChart, Bars, Heatmap, Radar, Ring, Waterfall, Timeline
    canvas/  useCanvas3D, City3D, Orbit, DistrictMap
    phone/   PhoneScreen
  features/
    individual/ home/ health/ around/ forecast/ lineage/ record/ live/ device/ me/ privacy/
    hospital/   ed/ panel/ demand/ discharge/
    community/  overview/ watch/
tests/                            # mirror src/ cho unit test (*.test.ts[x])
e2e/                              # Playwright
```

Quy ước: mỗi section (card) của prototype = một component trong thư mục feature của page đó, nhận dữ liệu qua props, không tự fetch. Page component gọi `repo` rồi truyền xuống.

---

### Task 1: Khởi tạo dự án, token, layout gốc

**Files:**
- Create: toàn bộ scaffold Next.js, `src/styles/tokens.css`, `src/styles/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/shell/Scene.tsx`, `vitest.config.ts`, `playwright.config.ts`, `tests/smoke.test.tsx`

**Interfaces:**
- Produces: class CSS `.glass`, `.card`, `.grid`, `.c4 .c6 .c8 .c12`; `body.night`; `body[data-view]`; script `pnpm test`, `pnpm e2e`, `pnpm lint`, `pnpm typecheck`.

- [ ] **Step 1:** `git init`, `pnpm create next-app@latest . --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*"`. Trong `next.config.ts` đặt `output: 'export'`, `images: { unoptimized: true }`, `trailingSlash: true`. Thêm devDeps: `pixelmatch pngjs vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test @axe-core/playwright`.
- [ ] **Step 2:** Chép token (xem Global Constraints) vào `tokens.css`; chép các rule `.glass`, `.card`, grid, `.ch`, `.pill`, `.chip`, `.btn` từ khối `<style>` prototype (dòng 6–479) vào `globals.css`. `Scene.tsx` = SVG nền (dòng 482–515) đặt `aria-hidden`.
- [ ] **Step 3: Viết test smoke**

```tsx
test('root layout renders brand', () => {
  render(<TopNavPlaceholder />) // tạm thời: layout render chữ "No One Alone" và "by InsideSync"
  expect(screen.getByText('No One Alone')).toBeInTheDocument()
})
```
- [ ] **Step 4:** `pnpm test` → PASS; `pnpm dev`, mở `/` thấy nền trời + chữ brand; `pnpm typecheck && pnpm lint` sạch.
- [ ] **Step 5: Commit** `chore: scaffold Next.js app with prototype design tokens`

---

### Task 2: Kiểu dữ liệu, fixture và repo

**Files:**
- Create: `src/data/types.ts`, `src/data/fixtures/*.ts`, `src/data/sources/mock.ts`, `src/data/repo.ts`
- Test: `tests/data/repo.test.ts`

**Interfaces:**
- Produces: `interface DataSource` gồm đúng các hàm dưới đây; `mockSource: DataSource`; `repo.ts` export từng hàm, gọi tới source đang chọn. Các hàm (async, đều trả `Promise<…>`):
  `getPerson(id: 'margaret'): Person` · `getHealth(id): HealthData` · `getSurroundings(id): Surroundings` · `getForecast(id): Forecast` · `getLineage(id): Lineage` · `getCareRecord(id): CareRecord` · `getDeviceFeed(id): DeviceFeed` · `getCareCircle(id): CircleMember[]` · `getHospital(): HospitalData` · `getCommunity(): CommunityData` · `getWatch(): WatchData`.
  Hàm ghi: `getShare(): ShareMatrix` · `saveShare(viewer: PersonId, cat: CategoryId, on: boolean): void` · `appendAudit(e: AuditEntry): void` · `getAudit(): AuditEntry[]`. Mock source giữ trong bộ nhớ, Task 5 dùng các hàm này.
- Kiểu then chốt: `Person { id; name; age; suburb; postcode; heightCm; weightKg; bmi; bloodType; mobilityAid; hearingAids; advanceCarePlan; allergies: string[]; medicineCount; conditions: Condition[]; status: 'good'|'watch'|'alert'; lastChat: string; devices: {wearableBattery:number; hubSensors:number} }`. Các kiểu khác đặt tên theo section, field lấy theo mảng nguồn.

- [ ] **Step 1:** Chuyển dữ liệu từ các mảng JS trong prototype sang fixture có kiểu. Bảng nguồn:

| Fixture | Biến trong prototype |
|---|---|
| margaret.ts | `#profile`, `CONDS`, `#facts`, `KP` |
| health.ts | `DAY` (heatmap), tim/ngủ/mood/bước/BP trong page `health` |
| forecast.ts | `SH` (SHAP), `#riskRows`, `#sigRows`, quan sát BP `[128,131,133,137,140,146]` |
| lineage.ts | `GENS`, `#mx`, `#cm` |
| record.ts | `#enc`, `#meds`, `#labs`, `#hosps`, `#srcs` |
| circle.ts | `CIRCLE`, `RINGS`, `PEOPLE2` |
| hospital.ts | `PACKET`, `INBOX`, panel/demand/discharge |
| community.ts | `SUBS`, `WALL`, `#visits`, `#funnel`, ngôn ngữ, chương trình |
| around.ts | `NEWS`, thời tiết, không khí, giờ nóng thứ Năm |
- [ ] **Step 2: Viết test**

```ts
test('margaret fixture matches prototype', async () => {
  const p = await getPerson('margaret')
  expect(p).toMatchObject({ name: 'Margaret Collins', age: 78, postcode: '2204', allergies: ['Penicillin'] })
  expect(p.devices).toEqual({ wearableBattery: 64, hubSensors: 6 })
})
test('forecast headline numbers', async () => {
  const f = await getForecast('margaret')
  expect(f.stroke90d).toBe(2.1)
  expect(f.wellbeing).toEqual({ score: 72, delta: -5 })
})
test('care plan has 4 tasks with owners', async () => {
  expect((await getForecast('margaret')).weeklyPlan).toHaveLength(4)
})
```
- [ ] **Step 3:** Chạy → FAIL; hiện thực fixture + repo; chạy → PASS.
- [ ] **Step 4: Commit** `feat(data): typed fixtures and repo layer`

---

### Task 3: View, tab, routing và app shell

**Files:**
- Create: `src/domain/views.ts`, `src/app/[view]/[page]/page.tsx`, `src/app/not-found.tsx`, `src/components/shell/{TopNav,ViewSwitcher,Tabs,ContextBar,WhoSwitch}.tsx`, `src/state/AppState.tsx`
- Test: `tests/domain/views.test.ts`, `tests/shell/TopNav.test.tsx`

**Interfaces:**
- Produces:
  - `type ViewId = 'individual'|'hospital'|'community'`; `type Who = 'family'|'self'`; `type Tab = { id: string; label: string; icon?: string }`
  - `tabsFor(view: ViewId, who: Who): Tab[]`
  - `resolvePage(view: string, page: string, who: Who): { kind: 'ok' } | { kind: 'redirect'; to: string } | { kind: 'notFound' }`
  - `useAppState(): { who; setWho; viewer: PersonId; setViewer; paused; togglePause; audit: AuditEntry[]; log(e) ; emergency; dispatchEmergency }`
- Giá trị pin:
  - `TABS_FAM` = home `🏠 Home`, health `❤️ Health`, around `🌤️ Around her`, forecast `🔮 What's ahead`, lineage `🌳 Health Lineage`, record `📋 Care record`, live `🚨 Emergency`, device `📱 Her phone`
  - `TABS_SELF` = me `🌞 My day`, health `❤️ My health`, privacy `🔐 Who sees what`, around `🌤️ Around me`, lineage `🌳 My family health`, device `📱 My phone`
  - hospital: ed `Pre-arrivals`, panel `Patient panel`, demand `Demand & beds`, discharge `Discharge follow-up`
  - community: community `Community overview`, watch `Neighbourhood watch`
  - Người đăng nhập theo view: individual `JC` James Collins · son · Melbourne `#2f6fb0`; hospital `AT` Dr Amelia Tran · ED consultant `#2563a8`; community `PS` Priya Sharma · community nurse `#6d4fc0`.

- [ ] **Step 1: Viết test**

```ts
test('family tabs', () => expect(tabsFor('individual','family').map(t=>t.id))
  .toEqual(['home','health','around','forecast','lineage','record','live','device']))
test('self tabs', () => expect(tabsFor('individual','self')[0].id).toBe('me'))
test('self-only page as family redirects', () =>
  expect(resolvePage('individual','privacy','family')).toEqual({kind:'redirect',to:'/individual/home'}))
test('family-only page as self redirects', () =>
  expect(resolvePage('individual','forecast','self')).toEqual({kind:'redirect',to:'/individual/me'}))
test('unknown page is 404', () => expect(resolvePage('hospital','xyz','family').kind).toBe('notFound'))
test('unknown view is 404', () => expect(resolvePage('foo','home','family').kind).toBe('notFound'))
```
```tsx
test('switching view shows that view tabs and sets body data-view', async () => {
  // render TopNav ở /individual/home, click "Hospital" → router.push('/hospital/ed'),
  // tab "Pre-arrivals" hiện, document.body.dataset.view === 'hospital'
})
```
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Hiện thực. `[view]/[page]/page.tsx` export `generateStaticParams()` trả mọi cặp view×page hợp lệ (gồm cả `me`, `privacy`) và `dynamicParams = false`, nên page lạ thành 404 lúc build. Kiểm tra theo vai (`resolvePage` → `redirect`) chạy trong client component. `who` + `viewer` sống trong `AppState` (context + `useReducer`), lưu `sessionStorage` bọc try/catch. `WhoSwitch` hai nút `👵 Margaret (her own app)` / `👨‍👩‍👧 Family & carers`; đổi sang self → điều hướng `/individual/me`, sang family → `/individual/home` và `viewer='james'`. `ContextBar` hiện avatar, `#vban`, tiêu đề + phụ đề theo page (bảng tiêu đề lấy từ dòng 1749–1753 prototype). Search box: lọc theo tên người/suburb trong fixture, hiện dropdown kết quả (Enter điều hướng).
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(shell): views, role-based tabs, routing`

---

### Task 4: UI primitives (card, pill, toast, drawer, switch, slider)

**Files:**
- Create: `src/components/ui/*.tsx` + `.module.css`
- Test: `tests/ui/Drawer.test.tsx`, `tests/ui/Toast.test.tsx`

**Interfaces:**
- Produces: `<GlassCard span={4|6|8|12}>`, `<CardHeader icon title meta pill?>`, `<Pill tone="good|warn|bad">`, `<Chip icon>`, `<Kpi label value delta? tone?>`, `useToast(): (msg: string) => void`, `<Drawer open title onClose>`, `<Switch checked onChange label>`, `<Slider min max step value onChange label valueText>`.

- [ ] **Step 1: Viết test**

```tsx
test('drawer is a modal dialog, Esc closes and focus returns', async () => {
  // nút "Open" mở Drawer; expect role=dialog, aria-modal=true, aria-labelledby trỏ tới title
  // userEvent.keyboard('{Escape}') → dialog biến mất; document.activeElement === nút "Open"
})
test('toast announces politely and auto-hides after 3200ms', () => {
  // fake timers; toast('Shared') → role=status có text; advance 3200 → biến mất
})
```
- [ ] **Step 2:** FAIL → hiện thực (drawer: trap focus, scrim click đóng, kiểu từ `.drawer` dòng 369–380) → PASS.
- [ ] **Step 3: Commit** `feat(ui): glass primitives, drawer, toast`

---

### Task 5: Consent — ai được xem gì

**Files:**
- Create: `src/domain/consent.ts`, `src/components/ui/Locked.tsx`
- Test: `tests/domain/consent.test.ts`, `tests/ui/Locked.test.tsx`

**Interfaces:**
- Produces:
  - `type CategoryId = 'safety'|'checkin'|'heart'|'sleep'|'activity'|'mood'|'meds'|'speech'|'home'|'records'|'location'`
  - `CATEGORIES: {id; emoji; name; detail}[]` — nguyên văn mảng `CATS` dòng 1890.
  - `DEFAULT_SHARE: Record<PersonId, Record<CategoryId, boolean>>` — nguyên văn `SHARE` dòng 1891–1896 (james, sarah, david, priya, gp, hosp).
  - `sees(share, paused, viewer, cat): boolean` — `safety` luôn `true`; nếu `paused` → `false`; ngược lại `share[viewer][cat]`.
  - `countSees(share, paused, viewer): number`
  - `<Locked cat={CategoryId}>{children}</Locked>` — nếu người xem hiện tại (vai family) không được xem: **không render children**, render ô khoá với thông điệp `Margaret keeps her <name lowercase> private` hoặc khi paused `Margaret paused sharing until tomorrow`.
  - `AppState`: `toggleShare(viewer, cat)` và `togglePause()` đều ghi `audit` `{at, who:'Margaret', action, viewer?, cat?}`.

- [ ] **Step 1: Viết test**

```ts
test('safety always visible even when paused', () => expect(sees(DEFAULT_SHARE,true,'sarah','safety')).toBe(true))
test('paused hides everything else', () => expect(sees(DEFAULT_SHARE,true,'james','heart')).toBe(false))
test('defaults', () => {
  expect(countSees(DEFAULT_SHARE,false,'james')).toBe(8)
  expect(countSees(DEFAULT_SHARE,false,'hosp')).toBe(2)
})
```
```tsx
test('locked content is not in the DOM', () => {
  // viewer='sarah', cat='meds', children = <span>Apixaban 5 mg</span>
  // expect(screen.queryByText(/Apixaban/)).toBeNull(); thấy "Margaret keeps her tablets private"
})
test('self view never locks', () => { /* who='self' → children render */ })
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3: Commit** `feat(consent): per-person category sharing with audit log`

---

### Task 6: Chart SVG và canvas 3D

**Files:**
- Create: `src/components/charts/*.tsx`, `src/components/canvas/{useCanvas3D.ts,City3D.tsx,Orbit.tsx,DistrictMap.tsx}`
- Test: `tests/charts/*.test.tsx`, `tests/canvas/useCanvas3D.test.ts`

**Interfaces:**
- Produces:
  - `<Sparkline values:number[] />`, `<LineChart series:{name;values;dashed?}[] band?:{lo;hi} projectedFrom?:number yLabel />`, `<Bars values labels goal? />`, `<Heatmap rows:number[][] rowLabels colLabels />` (7×24), `<Radar axes:{label;value;usual}[] />`, `<Ring value max label />`, `<Waterfall items:{label;delta}[] base />` (đỏ = tăng, xanh = giảm), `<Timeline items:{at;title;status}[] />`. Mỗi chart có `role="img"` và `aria-label` tóm tắt số liệu.
  - `useCanvas3D(ref, draw:(ctx, angle, t)=>void, {autoRotate:boolean}) → {rotate(delta), reset()}` — xử lý DPR, resize, kéo chuột/chạm để xoay, reduced-motion.
  - `<City3D scene=… />`, `<Orbit people=… mode='check'|'emergency' state=… />`, `<DistrictMap suburbs metric />`.

- [ ] **Step 0:** Tạo `src/components/ui/Icon.tsx`: `<Icon name={IconName} />` với `IconName` là union mọi key của `ICONS` + `EXTRA ICONS` trong prototype, render đúng thẻ `<svg>` như hàm `paint` (dòng 1157). Test: `Icon name="heart"` render `svg[viewBox="0 0 24 24"]` có `stroke-width="1.8"`.
- [ ] **Step 1:** Port thuật toán vẽ từ `City3D` (dòng 1176), `Orbit` (dòng 1347), `buildDistrict`/`buildSuburb` sang các hàm `draw` thuần; giữ nguyên `LOOPS`, `WALL`, `SUBS`, `CIRCLE`, `RINGS` (đã ở fixture Task 2).
- [ ] **Step 2: Viết test**

```ts
test('reduced motion disables auto-rotate but still draws once', () => {
  // matchMedia mock reduce=true; draw được gọi đúng 1 lần, không có requestAnimationFrame lặp
})
test('drag rotates by pointer delta', () => { /* pointerdown→move 100px → angle thay đổi ≠ 0 */ })
```
```tsx
test('LineChart marks projection dashed after projectedFrom', () => { /* path thứ 2 có stroke-dasharray */ })
test('Heatmap renders 168 cells', () => { /* 7×24 rect */ })
```
- [ ] **Step 3:** FAIL → hiện thực → PASS. Kiểm tra mắt bằng trang tạm `/dev/charts` (xóa trước khi commit).
- [ ] **Step 4: Commit** `feat(viz): svg charts and canvas 3D scenes`

---

### Task 7: Individual · Home

**Files:**
- Create: `src/features/individual/home/*`
- Test: `tests/features/individual/home.test.tsx`

**Interfaces:**
- Consumes: `getPerson`, `getForecast`, `getCareCircle`, `getSurroundings`, `<City3D>`, `<Orbit>`, `<Locked>`, `<Drawer>`.

Sections (thứ tự và span theo `<main data-page="home">` của prototype): Location map (c8) · `🟢 Margaret today` + `Today so far` + nút `Ask how she is` (mở drawer chat) / `Call Mum` / khẩn cấp · `👤 About Margaret` + `🩺 Health conditions` (bấm mở drawer chi tiết) · `🧭 Overall wellbeing` (Radar, 72/100, −5) · `🕰️ Daily rhythm` (Heatmap) · `🔮 Coming up: one thing to act on` (2.1%, nút gửi báo cáo BP cho GP) + `This week's plan` (4 task, trạng thái `Needs approval`/`Booked`; `Needs approval` có nút Approve → toast + đổi trạng thái) · `💞 Her care circle` · `🗣️ Today's chat with her` · `🏠 Her home today` · `🤝 People and places near her` · `🤖 What the helper did today`.

- [ ] **Step 1: Viết test**

```tsx
test('home shows headline facts', async () => {
  // render HomePage; thấy "Margaret Collins, 78", "72", "2.1%", "Penicillin", "64%"
})
test('approving a plan task updates its status', async () => { /* click Approve → "Approved" */ })
test('heart-category card locked for sarah viewer is absent', async () => {
  // viewer='sarah' + cài heart=false → text BP không có trong DOM
})
```
- [ ] **Step 2:** FAIL → hiện thực (mỗi card bọc `<Locked cat=…>` theo `data-scat` trong prototype) → PASS.
- [ ] **Step 3: Commit** `feat(individual): home page`

---

### Task 8: Individual · Health và Around her

**Files:**
- Create: `src/features/individual/{health,around}/*`
- Test: `tests/features/individual/{health,around}.test.tsx`

Sections — **health** (`data-page="health"`, dòng 918–967): `🎯 Today's goals`, `❤️ Heartbeat over the last day`, `😴 Last night's sleep` (22:41–05:58 · 6 h 12 min), `😊 Mood, last 2 weeks`, `👣 Steps, last 2 weeks` (goal 3,500), `🩺 Blood pressure, last 2 weeks`, `📲 Where this comes from` (48 readings · 6 devices, sync status mỗi thiết bị), monitoring modes hearing/vision/memory (Switch). **around** (dòng 968–997): `🌤️ Weather in Marrickville`, `👀 Worth knowing, living alone`, `📰 News that matters to her`, `🔥 Thursday, hour by hour` (ngoài trời vs trong nhà), `🍃 Air, pollen and smoke`.

- [ ] **Step 1: Viết test**

```tsx
test('steps chart draws goal line at 3500', …)
test('hearing mode switch toggles and shows captions note', …) // mặc định ON
test('news list filtered to her profile renders all NEWS items', …)
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3: Commit** `feat(individual): health metrics and surroundings`

---

### Task 9: Individual · What's ahead (dự báo + what-if)

**Files:**
- Create: `src/domain/riskSim.ts`, `src/features/individual/forecast/*`
- Test: `tests/domain/riskSim.test.ts`, `tests/features/individual/forecast.test.tsx`

**Interfaces:**
- Produces:
  - `type SimInput = { adherence: number /*60–100, mặc định 86*/; steps: number /*1500–7000 bước 100, mặc định 3240*/; salt: 0|1|2 /*Low/Medium/High, mặc định 1*/; hearingAids: boolean /*mặc định false*/ }`
  - `simulateRisk(i: SimInput): { stroke: number; fall: number; admission: number; mci: number }` — công thức nguyên văn prototype:

```ts
stroke    = 2.1 * Math.exp(-0.034 * (adherence - 86)) * [0.9, 1, 1.12][salt] * Math.exp(-0.00004 * (steps - 3240))
fall      = 21 * Math.exp(-0.00016 * (steps - 3240)) * (hearingAids ? 0.9 : 1)
admission = 14 * (0.5 * stroke / 2.1 + 0.5 * fall / 21)
mci       = 3.1 * (hearingAids ? 0.82 : 1)
```
  - `deltaLabel(v, base): { text: string; tone: 'good'|'bad'|'muted' }` — `d=(v-base)/base*100`; `|d|<0.5` → `no change`; ngược lại `+N% relative` / `−N% relative` (dấu trừ U+2212, N làm tròn 0 chữ số); `d<=-0.5` good, `d>=0.5` bad.
  - `bpProjection(adherence): {observed:number[]; projected:number[]}` — observed `[128,131,133,137,140,146]`, phần projected port từ `bpChart` dòng 1449.

- [ ] **Step 1: Viết test**

```ts
test('defaults reproduce baseline', () => {
  const r = simulateRisk({adherence:86,steps:3240,salt:1,hearingAids:false})
  expect(r).toEqual({stroke:2.1,fall:21,admission:14,mci:3.1})
})
test('full adherence → 1.3%', () =>
  expect(simulateRisk({adherence:100,steps:3240,salt:1,hearingAids:false}).stroke.toFixed(1)).toBe('1.3'))
test('hearing aids', () => {
  const r = simulateRisk({adherence:86,steps:3240,salt:1,hearingAids:true})
  expect(r.fall.toFixed(1)).toBe('18.9'); expect(r.mci.toFixed(1)).toBe('2.5')
})
test('deltaLabel', () => {
  expect(deltaLabel(2.1,2.1)).toEqual({text:'no change',tone:'muted'})
  expect(deltaLabel(1.3,2.1)).toEqual({text:'−38% relative',tone:'good'})
})
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3:** Page: `ℹ️ How this forecast works` (miễn trừ), `📊 Chances over time`, `🎛️ Try it: what if…` (3 Slider + Switch `Wears hearing aids daily`, 4 ô kết quả), `Morning systolic blood pressure` (LineChart observed 6 tuần + projected 4 tuần), `⚖️ What pushes her stroke chance up or down` (Waterfall từ `SH`), `👀 What we keep an eye on`. Test component: kéo slider adherence lên 100 → ô Stroke hiện `1.3%`.
- [ ] **Step 4: Commit** `feat(forecast): risk what-if simulator`

---

### Task 10: Individual · Emergency (Night alert demo)

**Files:**
- Create: `src/domain/emergency.ts`, `src/features/individual/live/*`, `src/components/phone/PhoneScreen.tsx`
- Test: `tests/domain/emergency.test.ts`, `tests/features/individual/live.test.tsx`

**Interfaces:**
- Produces:
  - `STEPS: EmStep[]` — 10 bước nguyên văn dòng 1559–1568 (`t, m, ph, d, s, lv, own?, what?, sub?, e:{q, yn?, listen?, help?}`). Bước đầu `02:03 Verify`, bước cuối `02:21 Hand off · Ambulance arrives · stroke team ready`.
  - `type EmState = { active: boolean; step: number; playing: boolean }`
  - `emergencyReducer(s, a)` với `a ∈ {start, end, next, prev, play, pause, tick, goto(n)}`: `start` → `{active:true, step:0, playing:true}`; `tick` tăng step, tới bước cuối thì `playing:false`; `play` khi đang ở bước cuối → về step 0 rồi chạy; `end` → `{active:false, step:0, playing:false}`.
  - `TICK_MS = 2800`.
  - `<PhoneScreen>` — khung điện thoại của Margaret, chữ ≥ 28 pt, nút ≥ 92 px.

- [ ] **Step 1: Viết test**

```ts
test('tick stops at last step', () => {
  let s = emergencyReducer(init,{type:'start'})
  for (let i=0;i<20;i++) s = emergencyReducer(s,{type:'tick'})
  expect(s).toMatchObject({step:9,playing:false})
})
test('play at end restarts', () => expect(emergencyReducer({active:true,step:9,playing:false},{type:'play'})).toMatchObject({step:0,playing:true}))
test('own fields carry forward when a step omits them', () => { /* resolveStepView(STEPS,5).own[0] === 'David · on his way'; resolveStepView(STEPS,6).own[0] vẫn là 'David · on his way' (null = giữ cũ) */ })
```
```tsx
test('night demo toggles body.night and is keyboard-operable', async () => {
  // bấm "Night alert demo" (TopNav) → điều hướng /individual/live, body có class night, who='family'
  // Tab tới nút Next, Enter → step 2 hiển thị "Calls Margaret by voice"
  // End demo → body không còn night
})
test('PhoneScreen enforces 28pt text and 92px targets', () => { /* computed style của text ≥ 37.33px; nút min-height 92px */ })
```
- [ ] **Step 2:** FAIL → hiện thực (`resolveStepView` gộp `own/what/sub` theo quy tắc `renderEm` dòng 1570) → PASS.
- [ ] **Step 3:** Page `live`: trạng thái chờ `No active alert` + nút chạy; khi active: tag mức độ, `<Orbit mode="emergency">`, owner (ai đang giữ case + đồng hồ), `Live timeline`, `Margaret's screen` (PhoneScreen mirror câu `e.q`), điều khiển Prev/Play/Next + dots, SLA. Khi tới bước `02:07` → `AppState` đánh dấu packet mới cho hospital (pill `1 new` ở `/hospital/ed`).
- [ ] **Step 4: Commit** `feat(emergency): night alert demo with mirrored phone`

---

### Task 11: Individual · Lineage, Care record, Her phone và view của Margaret (me, privacy)

**Files:**
- Create: `src/features/individual/{lineage,record,device,me,privacy}/*`
- Test: `tests/features/individual/{lineage,record,privacy}.test.tsx`

Sections:
- **lineage** (dòng 748–776): `Four generations` (11 người · 9 đồng ý), `Family pattern strength for you, James`, `Your screening plan`, `Condition matrix`, `Sharing and consent` (consent theo từng người họ hàng).
- **record** (dòng 778–810): `Encounters, 2023–2026` (46 lần · 6 nguồn), `Medicines` (pill `No interactions`), `Pathology trends` (dải tham chiếu), `Hospital readiness`, `Data sources` (tag `FHIR R4`, provenance mỗi bản ghi), `After a hospital stay` (30 ngày).
- **device** = `PhoneScreen` hiển thị app của Margaret (từ `APP` dòng 1569) + `Designed for Margaret` (dòng 1096).
- **me**: phiên bản Home cho chính Margaret, dùng `PhoneScreen`-style lớn.
- **privacy** `🔐 Who sees what`: lưới người (`PEOPLE2`) × category (`CATEGORIES`) với Switch; nút `Pause sharing` (toast `Sharing paused until 9 am tomorrow · safety alerts still on` / `Sharing resumed`); nút `Preview` mỗi người → đặt `viewer`, chuyển `who='family'`, về home, toast `Previewing what <Name> sees`; danh sách audit log; dòng ghi chú clinician chỉ thấy bệnh nhân có tên khi có consent.

- [ ] **Step 1: Viết test**

```tsx
test('toggling a share writes an audit entry', …)          // audit tăng 1, chứa viewer + cat
test('safety row switches are disabled (always on)', …)
test('pause shows banner on family home and locks all but safety', …) // Review Focus #2
test('preview as david hides heart card on home', …)
test('record shows FHIR R4 and 46 encounters', …)
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3: Commit** `feat(individual): lineage, care record, phone, self view and privacy`

---

### Task 12: Hospital view

**Files:**
- Create: `src/features/hospital/{ed,panel,demand,discharge}/*`
- Test: `tests/features/hospital/*.test.tsx`

Sections (dòng 1000–1062): **ed** — `Pre-arrival inbox` (+ pill `1 new` khi demo chạy qua bước 02:07), `Incoming ambulances` (60 phút tới), `Packet` (chọn bệnh nhân → nội dung `PACKET`, drawer xem đầy đủ), `Stroke pathway` + đồng hồ treatment window. **panel** — `Older patients in the catchment` (xếp theo nguy cơ nhập viện 30 ngày), `Risk vs age` (scatter, 120/1,846 điểm). **demand** — `Presentations aged 75+, next 14 days` (tag `FORECAST`), `Beds right now`, `What drives Thursday's spike`, `Suggested actions`. **discharge** — `30-day follow-up board`.

- [ ] **Step 1: Viết test**

```tsx
test('selecting an inbox item shows its packet', …)
test('inbox pill appears only after emergency reaches step index 7', …)
test('panel sorted by 30-day admission risk desc', …)
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3: Commit** `feat(hospital): pre-arrivals, panel, demand, discharge`

---

### Task 13: Community view

**Files:**
- Create: `src/domain/district.ts`, `src/features/community/{overview,watch}/*`
- Test: `tests/domain/district.test.ts`, `tests/features/community/*.test.tsx`

**Interfaces:**
- Produces: `type DistrictModel = 'high'|'alone'|'heat'|'gap'`; `DISTRICT_MODELS` nguyên văn `DM` dòng 1324 (title, subtitle, unit); `metricFor(suburb, model): number`.

Sections: **community** (dòng 850–912) — DistrictMap 15 suburb + 4 nút model (`aria-pressed`), `Heatwave plan` (pill `Thursday 38 °C`, check-ins, sức chứa cool room), `Who needs a visit this week` (xếp theo nguy cơ, ngôn ngữ), `Alert funnel`, `Volunteer capacity vs need`, `Emergency demand forecast`, `Languages`, `Programs and outcomes`, `Neighbourhood watch` mini. **watch** (dòng 1064–1090) — bản đồ 3D cảnh báo, `Scam contacts reported by residents` (8 tuần), `Feed for community staff` (có nguồn), `Volunteer call-outs`.

- [ ] **Step 1: Viết test**

```ts
test('model titles', () => expect(DISTRICT_MODELS.gap.title).toBe('Visit gap'))
```
```tsx
test('choosing a model updates title, subtitle and aria-pressed', …)
test('visit list sorted by risk desc', …)
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3: Commit** `feat(community): district map, heatwave plan, neighbourhood watch`

---

### Task 14: Accessibility, responsive và e2e

**Files:**
- Create: `e2e/navigation.spec.ts`, `e2e/a11y.spec.ts`, `e2e/mobile.spec.ts`, `e2e/emergency.spec.ts`

- [ ] **Step 1: Viết e2e**

```ts
test('every page has no serious axe violations', …)   // lặp mọi view×page, cả who=self
test('360px: no horizontal page scroll on every page', async ({page}) => {
  // viewport 360×780; expect(document.documentElement.scrollWidth <= 360)
})
test('deep link /individual/privacy as family redirects to home', …)
test('/hospital/xyz returns 404 page', …)
test('full night demo plays to "Help arrived" and hospital inbox shows 1 new', …)
test('reduced motion: canvases render, no autoplay rotation', …) // emulateMedia reducedMotion
```
- [ ] **Step 2: Kiểm tra giống artifact (visual parity)** — viết `e2e/parity.spec.ts`: với mỗi view×page (và cả hai vai individual), mở `docs/reference/prototype.html` qua `file://`, bấm view/tab tương ứng, chụp ảnh full page; mở app (mock mode, chưa có Maps key) cùng viewport 1440×900 và 390×844, chụp ảnh. Che vùng canvas (`.c3d`) trước khi so. Lưu cặp ảnh vào `e2e/parity/<view>-<page>-<w>-{proto,app}.png` và so bằng `pixelmatch` với ngưỡng chênh ≤ 3% số pixel. Reviewer xem tất cả cặp ảnh và ghi lại chênh lệch còn lại.
- [ ] **Step 3:** `pnpm e2e` → sửa đến khi PASS. Các lỗi phổ biến cần xử lý: `nav.tabs` dùng `overflow-x:auto`, drawer `max-width:100vw` ở < 480 px, grid `c4–c12` về 1 cột < 720 px.
- [ ] **Step 4:** `pnpm build` thành công, không cảnh báo type.
- [ ] **Step 5: Commit** `test: e2e accessibility, mobile and emergency flows`

---

### Task 15: Firebase: Auth, Firestore source, Hosting

**Files:**
- Create: `src/lib/firebase.ts`, `src/auth/{AuthProvider,useAuth,SignInPage}.tsx`, `src/app/sign-in/page.tsx`, `src/data/sources/firebase.ts`, `firebase.json`, `.firebaserc`, `.env.example`, `docs/firestore-contract.md`
- Modify: `src/app/layout.tsx` (bọc `AuthProvider`), `src/data/repo.ts` (thêm nhánh `firebase`), `.gitignore` (`.env.local`, `.firebase/`)
- Test: `tests/auth/AuthProvider.test.tsx`, `tests/data/firebaseSource.test.ts` (chạy với Firestore + Auth emulator)

**Interfaces:**
- Consumes: `DataSource` (Task 2), `useAppState` (Task 3).
- Produces:
  - `getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore }`. Gọi nhiều lần vẫn trả cùng một instance. Nếu `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true` thì nối emulator (auth `127.0.0.1:9099`, firestore `127.0.0.1:8080`).
  - `useAuth(): { user: User | null; loading: boolean; signInWithGoogle(): Promise<void>; signOut(): Promise<void> }`.
  - `firebaseSource: DataSource`. Đường dẫn collection lấy từ `docs/firestore-contract.md`.
- Quy tắc:
  - Chỉ có chế độ demo khi `NEXT_PUBLIC_DATA_SOURCE=mock`. Khi đó không bắt đăng nhập, avatar lấy từ `VIEWS`.
  - Khi `NEXT_PUBLIC_DATA_SOURCE=firebase`, chưa đăng nhập thì vào trang nào cũng `router.replace('/sign-in')`.
  - Ghi consent/audit (Task 5) qua `DataSource.saveShare(viewer, cat, on)` và `DataSource.appendAudit(entry)`. Mock source giữ trong bộ nhớ.

- [ ] **Step 1:** Viết `docs/firestore-contract.md`: liệt kê collection/document mà FE đọc/ghi, kiểu lấy từ `types.ts`. Gửi team backend xác nhận **trước** khi làm Step 4.
- [ ] **Step 2: Viết test**

```tsx
test('redirects to /sign-in when firebase mode and signed out', …)
test('mock mode never requires sign-in', …)
test('getFirebase is a singleton', () => expect(getFirebase()).toBe(getFirebase()))
```
```ts
// emulator: seed fixture margaret vào Firestore → firebaseSource.getPerson('margaret') deep-equal mockSource.getPerson('margaret')
test('firebase source round-trips the margaret fixture', …)
test('saveShare then reload reflects the change', …)
```
- [ ] **Step 3:** Chạy `firebase emulators:exec --only auth,firestore "pnpm test tests/auth tests/data"` → FAIL.
- [ ] **Step 4:** Hiện thực → chạy lại → PASS.
- [ ] **Step 5:** Viết `firebase.json`: hosting `public: "out"`, `cleanUrls: true`, rewrite `**` → `/404.html` (chỉ cho route không tồn tại), header cache dài cho `/_next/static/**`. Viết `.firebaserc` với default `no-one-alone-511616`. Thêm script `"deploy:preview": "next build && firebase hosting:channel:deploy preview"`.
- [ ] **Step 6:** `pnpm build` → thư mục `out/` có `individual/home/index.html`, `hospital/ed/index.html`. Chạy `firebase emulators:start --only hosting` rồi mở thử. Chỉ chạy `deploy:preview` sau khi chủ dự án đồng ý.
- [ ] **Step 7: Commit** `feat(firebase): auth, firestore data source, hosting config`

### Task 16: Google Maps cho card bản đồ (fallback canvas khi chưa có key)

**Files:**
- Create: `src/components/maps/LocationMap.tsx`, `src/components/maps/mapsConfig.ts`
- Modify: card `📍 Where Margaret lives` (page home, Task 7) và card `👀 Neighbourhood watch` (page around, Task 8) dùng `LocationMap`; `.env.example` thêm 2 biến Maps.
- Test: `tests/maps/LocationMap.test.tsx`

**Interfaces:**
- Consumes: `<City3D>` (Task 6), fixture điểm trên bản đồ (Task 2).
- Produces:
  - `mapsEnabled(): boolean` — `true` khi `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` khác rỗng.
  - `<LocationMap center={{lat:-33.911,lng:151.155}} markers={MapMarker[]} fallback={ReactNode} ariaLabel={string} />` với `MapMarker = { id; lat; lng; kind: 'home'|'family'|'health'|'community'|'alert'; label; tone?: 'act'|'watch'|'info' }`. Màu marker theo legend prototype: home `#14a08c`, family `#2f6fb0`, health `#ffffff` viền `#ccc`, community `#8f6fd0`; alert `act` `#d9443f`, các tone khác lấy từ `.map-bottom` của watch map (dòng 967).
- Quy tắc: lớp phủ glass (`.map-top`, `.map-legend`, `.map-bottom`, nút xoay) giữ nguyên trong cả hai chế độ. Có key → nút xoay đổi `heading` ±45°, nút reset về heading 0 / tilt 45 (cần Map ID vector). Không có key → render `fallback` (canvas City3D) và không tải script Maps.

- [ ] **Step 1: Viết test**

```tsx
test('no key: renders fallback and never loads maps script', () => {
  // env rỗng → thấy fallback; document.querySelector('script[src*="maps.googleapis.com"]') === null
})
test('with key: renders one marker per item with legend colour', () => { /* mock @vis.gl/react-google-maps */ })
test('rotate buttons change heading by 45 degrees', …)
```
- [ ] **Step 2:** FAIL → hiện thực → PASS.
- [ ] **Step 3:** `pnpm dev` khi chưa có key → 2 card giống hệt prototype; `pnpm e2e e2e/parity.spec.ts` vẫn PASS.
- [ ] **Step 4: Commit** `feat(maps): Google Maps location card with canvas fallback`

---

## Phụ thuộc vào team backend

1. **Hợp đồng Firestore** (`docs/firestore-contract.md`): tên collection, kiểu document và security rules. FE cần có trước Task 15 Step 4. Trước đó FE chạy bằng `mock`.
2. **Quyền xem thật:** `sees()` ở FE chỉ dùng để hiển thị. Phải có Firestore rules hoặc backend chặn đọc dữ liệu thật.
3. **AI, thiết bị, voice agent, cảnh báo, model dự báo:** FE chỉ hiển thị kết quả họ ghi vào Firestore.

## Việc chủ dự án cung cấp sau

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (giới hạn HTTP referrer, chỉ cho Maps JavaScript API) và `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (vector, bật tilt/rotation).
- Giá trị `NEXT_PUBLIC_FIREBASE_*` cho `.env.local`.
