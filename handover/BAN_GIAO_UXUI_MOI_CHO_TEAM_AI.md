# Bàn giao đợt 2 cho team AI: web sau khi làm lại UX/UI ("Noa · family health")

> Ngày 20/11/2026. Người nhận: team AI. Tài liệu này mô tả web **sau đợt làm lại UX/UI** theo prototype mới nhất, và cách team AI ráp mô hình AI vào.
> Đọc kèm:
> - **Đợt 1:** [BAN_GIAO_TEST_CASE_CHO_TEAM_AI.md](BAN_GIAO_TEST_CASE_CHO_TEAM_AI.md), tả lớp phủ Test case cũ (10 case, benchmark 249 tình huống). Team AI vẫn phụ trách phần đó.
> - **Thiết kế gốc:** prototype https://claude.ai/artifact/U62CJAJZuVGoQ87F3uGB9P và AI plan https://claude.ai/artifact/5eMExA61bdX41NaEM7jCtu. Web làm theo đúng phiên bản của hai link này tại ngày 20/11.
>
> Mọi người, cơ sở y tế và con số là hư cấu. Mọi ngưỡng là ngưỡng demo, chưa có bác sĩ ký duyệt.

## Mục lục
1. [Tóm tắt: cái gì đổi, ai làm gì](#1)
2. [Web hiện tại trông thế nào](#2)
3. [Code nằm ở đâu](#3)
4. [Engine: cách hành trình chạy](#4)
5. [Cổng AI `NoaAi`: hợp đồng chi tiết](#5)
6. [Danh sách chỗ agent nói (14 lượt) và chỗ đọc câu trả lời](#6)
7. [Ráp mô hình AI vào web: từng bước](#7)
8. [Nhãn, bộ đếm và nút trạng thái AI](#8)
9. [Những gì không bao giờ đi qua AI](#9)
   - [9b. Ranh giới AI và engine luật, chỗ còn lấn cấn](#9b)
10. [Test: chạy gì, thêm gì](#10)
11. [Chỗ web khác prototype (có chủ ý)](#11)
12. [Việc còn mở cho team AI](#12)
13. [Đánh giá bản demo AI và cách nối vào bảng mới](#13)
   - [13b. Đối chiếu với kiến trúc](#13b)
   - [13c. PR #78 và #79](#13c)
14. [Ô "Ask Noa" và tin nhắn gia đình: ngữ cảnh cho AI](#14)

---

<a id="1"></a>
## 1. Tóm tắt: cái gì đổi, ai làm gì

| Phần | Trước (đợt 1) | Bây giờ |
|---|---|---|
| Màn chính để thử sản phẩm | Lớp phủ "Test case" che toàn màn hình, 10 case, Judge path, For judges, Benchmark | Bảng **"Noa · family health"** nằm ngay trong tab đầu tiên của Individual (**Family health**) |
| Gia đình | 8 người, 4 thế hệ, Khalid 47 | **6 người, 3 thế hệ**: Moza 78, Saeed 64, Khalid **38**, Amna 35, Hamdan 5, Hind 18 tháng |
| Hành trình | 10 case riêng | Một hành trình **Detect → Protect → Home screening → Right pathway → Referral** cho từng người, cộng **10 quick test case** |
| Agent | 9 agent ngang hàng | **Orchestrator + 4 agent** (Personal care, Screening, Specialist, Government), 9 kỹ năng |
| Luật | R1–R12, P1–P9, F1–F2 | **34 mã Orchestrator** (IN, G0–G3, L1–L2, B1–B2, V1–V4, Q1, N1–N3, F1, R1, H1–H2, C1, X1, D1, P1, S1, T1–T2, U1, O1, W1, A1, K1–K2) |
| Cấp cứu | Gọi 998, kịch bản cố định | **Khuyên đi khám cấp cứu ngay** bằng kịch bản cố định. Noa **không gọi ai**; chỉ nói gọi 998 khi người đó không tự đi được |
| AI | Không có (chữ soạn sẵn) | Vẫn chữ soạn sẵn, nhưng **đã có cổng cắm `NoaAi`**: team AI ráp mô hình AI ở một chỗ |

**Chia việc:**
- **Team web (đã xong):**
  - giao diện;
  - hành trình chạy xác định (chữ soạn sẵn cộng bộ đọc từ khóa);
  - test;
  - các view khác: thanh menu, tab, nền, Government "Prevention and screening".
- **Team AI:**
  - viết lớp `RemoteAi` theo `NoaAi`, gọi API của mình qua backend;
  - prompt, validator phía server, thời gian chờ, hosting;
  - test chạy với AI thật;
  - lớp phủ Test case cũ và benchmark (đợt 1).

<a id="2"></a>
## 2. Web hiện tại trông thế nào

- **Mở web** (https://noonealone.insidesync.ai): trang vào thẳng **Individual > Family health**. Sau 300 ms, bảng chạy test case Saeed (s0) **chỉ tới hết bước Detect và cảnh báo**, rồi **dừng ở thẻ chờ** ("Start the check now" / "Not now"). Không có gì chạy tiếp cho tới khi người xem bấm.
- **Thanh menu gọn một hàng:**
  - EN/ع nằm bên phải;
  - ô tìm kiếm ẩn khi màn hình từ 1.180 px trở lên;
  - các nút "Test case", "Moza's case", "Night alert demo" và banner Test case **đã ẩn**.
- **Tab Individual:**
  - vai Moza: Family health · My day · My health · My care record;
  - vai gia đình: Health · Care record.
- **Bảng, từ trên xuống:**
  - đầu bảng: nút "Noa speaks" EN/AR, nút trạng thái AI, Reset;
  - cây gia đình;
  - thanh 5 bước;
  - bảng **"Try it · <tên>'s readings"**: thanh trượt nhịp tim, huyết áp, oxy, đường huyết, nhịp bất thường, cân nặng, tuổi; các kịch bản dựng sẵn (Racing heart, BP crisis…); các nút bật/tắt; thu gọn hoặc mở ra được, tự thu gọn khi bắt đầu kiểm tra;
  - luồng tin nhắn của bước hiện tại (bên trái, tự cuộn bên trong khung), với phần "What happens here" gập trong đầu bước, và **Agent orchestra** (bên phải);
  - ô soạn tin với **Next** (phím →);
  - **Quick test cases**.

  Khi bắt đầu kiểm tra, cây gia đình thu thành một dải nhỏ ("Show family tree"), để cả hành trình nằm gọn trong một màn hình.
- **Bấm một người trên cây:** mở **ngăn kéo hồ sơ** (có phần "Try different data" để sửa số rồi chạy lại) và bắt đầu hành trình của người đó.
- **Nút tin nhắn** ở góc dưới, chỉ có ở Individual, mở khung "Noa · family messages". Nút "Ask Noa" cũ đã ẩn.
- **Cấp cứu:** cả web chuyển sang màu đêm, bảng có vòng đỏ nhấp nháy, screening dừng.
- **Government > Population health:** phần mới "Prevention and screening" ở đầu, ẩn nhóm dưới 10 người (S1).

<a id="3"></a>
## 3. Code nằm ở đâu

Tất cả trong `web/src/features/familyHealth/`:

| Thư mục / file | Nội dung |
|---|---|
| `data/people.ts` | 6 người: hồ sơ, thiết bị, bệnh án, lịch sử tầm soát, tiền sử gia đình, kết quả gen của Khalid |
| `data/agents.ts` | Orchestrator, 4 agent (domain), 9 kỹ năng, "can / cannot" |
| `data/programmes.ts`, `data/tests.ts` | Chương trình của Sở Y tế và ưu tiên; bài kiểm tra tại nhà (Noa Speech Check, nghe số trong tiếng ồn, té ngã STEADI, ADA, STOP-BANG, PHQ-2, câu hỏi cho trẻ) |
| `data/testCases.ts` | 10 quick test case (s0, s2, s3, k1, k3, k4, a1, m1, h1, d1) và câu trả lời mặc định |
| `data/thresholds.ts` | Ngưỡng tín hiệu, mức khẩn, giờ đặt lịch, thời gian chờ (`WAIT`, `WRITING`) |
| `engine/journey.ts` | **Engine chính**: hành trình, chuyền việc, luật, thẻ "Your turn", cấp cứu, bộ đếm |
| `engine/ai.ts` | **Cổng AI**: `NoaAi`, `PreparedAi`, `guard()`, bộ đọc từ khóa |
| `engine/flags.ts`, `pathway.ts`, `home.ts`, `speech.ts`, `framingham.ts`, `pattern.ts` | Cờ D1, xây pathway, chọn bài kiểm tra, chấm giọng nói, Framingham (dùng chung với Test case cũ), biểu đồ mẫu |
| `engine/scheduler.ts` | Thời gian chờ: thật trên web; bằng 0 khi test hoặc khi bật giảm chuyển động |
| `ui/store.ts` | **Chỗ tạo engine** (`getEngine()`), một engine cho cả web |
| `ui/*.tsx`, `ui/fh.module.css` | Giao diện |
| `web/src/locales/{en,ar}/familyHealth.json` | Mọi chữ của engine (lời agent, dòng hệ thống, luật, cờ…), en + ar |
| `web/src/locales/{en,ar}/familyHealthUi.json` | Chữ của khung giao diện |
| `web/src/config/legacy.ts` | Cờ bật lại phần cũ đã ẩn (Test case, nút demo, trang Around me / My phone) |

<a id="4"></a>
## 4. Engine: cách hành trình chạy

- `FamilyHealthEngine` là TypeScript thuần, không dùng React, có `subscribe` / `getSnapshot`. Mỗi thay đổi tạo một snapshot mới.
- **Snapshot gồm:**
  - `journey`: người, bước, nhánh cấp cứu, xong chưa, test case;
  - `feed`: các tin, mỗi tin là một mô tả chữ `{k, p}` để giao diện dịch;
  - `pending`: thẻ đang chờ người xem trả lời;
  - `hand`: nhật ký chuyền việc;
  - `rulesHit`: các luật đã dùng;
  - `calls`: bộ đếm `{live, prepared, guardrail, overruled}`;
  - `gov`: số liệu cho Sở Y tế;
  - `status` và `heart` của từng người;
  - `notes`: tin nhắn gia đình.
- **Lệnh:**
  - chạy: `runTestCase(id)`, `startJourney(person)`, `next()`, `answer(cardId, value)`;
  - giọng nói: `useSample(key)`, `submitSpeech(said, secs, how)`;
  - trả lời tự do: `reply(text)` (ô soạn tin), `askNoa(text)` (khung tin nhắn gia đình);
  - hồ sơ: `editProfile`, `toggleProfile`;
  - điều khiển: `reset()`, `setLang('en'|'ar')`, `setAiEnabled(on)`;
  - "Try it": `applyScenario(person, id)`, `resetProfile(person)`, `whatIf(person)` (`engine/whatif.ts`: vùng màu, kịch bản, thẻ kết quả).
- **Thẻ chờ sau Detect (`go`):** engine dừng sau Detect và hỏi người dùng.
  - Khẩn: "Start the check now" / "Not now". Chọn "Not now" thì áp luật U1, trạng thái "Prompt pending".
  - Không khẩn: "Start home screening" / "Later". Chọn "Later" thì áp luật N3.
  - Lệnh `answer(id, 'go' | 'later')`; nút Next tương đương 'go'.
- **Thứ tự chuyền việc khi không khẩn** (mỗi bước ghi mã luật, "consent ✓ · logged ✓"):

| # | Từ → tới | Luật |
|---|---|---|
| 1 | Orchestrator → Guardian | IN |
| 2 | Guardian → Forecast | D1 |
| 3 | Forecast → Guardian | P1 |
| 4 | Guardian → Voice | Q1 (trẻ em: K2) |
| 5 | Voice → Insight | Q1 (trẻ em: không có) |
| 6 | Insight → Navigator | T1 |
| 7 | Navigator → Analyst | N1 |
| 8 | Analyst → Navigator | N1 |
| 9 | Navigator → Courier | C1 |

- **Nhánh cấp cứu** (Q1 giọng đỏ hoặc không trả lời, V1 yếu mặt hoặc tay, V2 đau ngực hoặc choáng khi tim nhanh, L1 lú lẫn khi đường thấp):
  - lời khuyên **kịch bản cố định**;
  - dừng screening;
  - snapshot có `emergency: true` để giao diện bật màu đêm.
- **Mỗi lần chạy có token hủy:** Reset hoặc chọn người khác giữa chừng sẽ hủy lần đang chạy. Lỗi B2 của prototype (hai hành trình ghi chung một luồng) đã sửa.
- **Đồng hồ giả lập** bắt đầu 20 Nov 2026 08:40 và tiến theo từng bước. Prototype đứng yên ở 08:40.

<a id="5"></a>
## 5. Cổng AI `NoaAi`: hợp đồng chi tiết

File `engine/ai.ts`:
```ts
interface NoaAi {
  say(req: SayRequest): Promise<SayResult>
  understand(req: UnderstandRequest): Promise<UnderstandResult>
}
```

**`SayRequest`**, một lượt agent nói:

| Trường | Ý nghĩa |
|---|---|
| `skill` | Kỹ năng đang nói (`guardian`, `voice`, `coach`, `forecast`, `navigator`, `courier`, `insight`, `analyst`) hoặc `familyChat` (khung tin nhắn gia đình) |
| `domain` | `care`, `screen`, `spec` hoặc `gov` |
| `audience` | Lời dành cho ai, ví dụ "Saeed", "Amna (parent of Hind)", "the clinic team (Dr Omar Haddad)" |
| `lang` | `en` hoặc `ar`, theo nút "Noa speaks". Tiếng Ả Rập: Modern Standard Arabic dễ hiểu với người vùng Vịnh |
| `facts` | Dữ kiện được phép dùng, dạng JSON, đã dịch theo `lang`. **Không được nói gì ngoài `facts`** |
| `task` | Lệnh cho mô hình, bằng tiếng Anh, không hiện ra màn hình |
| `fallback` | Chữ soạn sẵn theo `lang`, dùng khi AI tắt, lỗi hoặc bị guardrail chặn |
| `maxWords` | 55 mặc định; 80 cho thư chuyển tuyến; 45 cho tin nhắn gia đình |
| `route` | Tùy chọn: `{ rule, to, options }`, tức bước chuyền việc mà luật sẽ chọn sau lượt này |
| `callId` | Mã chỗ nói, một trong 15 mã của `SAY_CALLS` (`engine/ai.ts`), ổn định qua các bản phát hành. Server dùng để chọn prompt, schema và validator; dùng cho log và đánh giá |
| `tier` | `fast` hoặc `strong`: mức mô hình theo kiến trúc. Nhanh: Guardian, Voice, ô soạn tin, tin nhắn gia đình, `understand`. Mạnh: Forecast, Insight, Navigator, Courier, Analyst |

**`SayResult`:**
- `text`;
- `source`: `live`, `prepared` hoặc `guardrail`;
- `note`: lý do khi hiện chữ soạn sẵn;
- `handoffTo`: tùy chọn, agent tiếp theo mà mô hình gợi ý;
- `ruleId`: tùy chọn, mã luật mà lời giải thích dựa vào (kiến trúc: Guardian trả "chữ + mã luật"). Hợp lệ (một trong 34 mã) thì hiện ở dòng "why"; không bao giờ đổi đường đi hay quyết định.

**`UnderstandRequest`**, đọc câu trả lời tự do:
- `qid`: `rf` (dấu hiệu nguy hiểm), `sym` (triệu chứng), `pref` (cách khám), `time` (giờ), `book` (đặt lịch, đổi giờ, hỏi vì sao, để sau), `words` (số từ của trẻ);
- `question`: câu hỏi bằng tiếng Anh;
- `tier`: luôn `fast`;
- `options`: `{id, label}`;
- `reply`: câu người dùng gõ;
- `lang`.

**`UnderstandResult`:** `{ choice, summary, source: 'live' | 'keyword' }`. `choice` **phải** là một trong các `id` của `options`.

**Engine làm gì với kết quả:**
1. Trước khi gọi `say`, bong bóng "writing…" hiện 250 ms. Trong lúc `say` của **AI thật** chạy (mọi lớp không phải `PreparedAi`), `snapshot.thinking = true` và bong bóng đổi thành "the agent is thinking…". Với `PreparedAi`, dòng này không bao giờ hiện.
2. Nếu `source === 'live'`, engine tự kiểm chữ bằng `guard()`: liều thuốc (số + mg/mcg/units/ml), câu chẩn đoán ("you have a stroke…"), câu khuyên đừng đi cấp cứu. Dính thì engine thay bằng `fallback`, gắn nhãn **Guardrail** và tăng `calls.guardrail`.
3. Nếu `handoffTo` khác `route.to`: **luật thắng**. Engine thêm dòng "AI overruled… rule wins" và tăng `calls.overruled`.
4. Nếu `say` ném lỗi: engine dùng `fallback` với nguồn `prepared`.
5. Lượt **không live** (chữ soạn sẵn, kịch bản cố định) giữ bong bóng "writing…" thêm `650 ms + 25 ms × số từ`, tối đa 2 giây, cho giống chatbot. Lượt **live** không cộng thêm, vì đã có thời gian thật của mô hình.

**Bản mặc định `PreparedAi`:** `say` trả `fallback`; `understand` dùng bộ đọc từ khóa `KEYWORDS` của prototype.

<a id="6"></a>
## 6. Danh sách chỗ agent nói và chỗ đọc câu trả lời

Mỗi chỗ trong `engine/journey.ts` đều có chú thích `facts` và `task` ngay trên lời gọi, và mang một `callId` trong `SAY_CALLS` (thứ tự bảng dưới: `detect.guardian`, `detect.forecast`, `protect.guardian`, `home.voice.intro`, `home.voice.retry`, `home.voice.child`, `home.insight`, `pathway.navigator.offer`, `pathway.forecast.why`, `pathway.navigator.u1`, `pathway.navigator.n3`, `referral.courier`, `referral.analyst`, `composer.reply`, `family.chat`). Lời khuyên cấp cứu có mã `stop.voice.emergency` nhưng **không bao giờ** đi qua AI.

| # | Bước | Kỹ năng | Việc phải nói (`task`, tóm tắt) | Ghi chú |
|---|---|---|---|---|
| 1 | Detect (khẩn) | Guardian | Nói bình tĩnh điều thấy được so với mức bình thường của chính người đó; đã bắt đầu kiểm tra một phút; bác sĩ xem trong hôm nay | Có `why` theo luật G1, B1, L1… |
| 2 | Detect | Forecast | Giải thích Noa đọc được gì từ thiết bị, hồ sơ, tiền sử gia đình; 3 cờ quan trọng nhất; "lý do để kiểm tra, không phải chẩn đoán" | Trẻ em: nói với phụ huynh |
| 3 | Protect | Guardian | Xác nhận dữ liệu được dùng (có hoặc không có kết quả gen) và ai được xem pathway; tiếp theo là kiểm tra tại nhà | |
| 4 | Home screening | Voice | Hôm nay kiểm tra những gì, mất vài phút | Khẩn: kiểm tra giọng nói trước (chỉ với luật G) |
| 5 | Home screening | Voice | Nhờ nói lại câu mẫu, chậm thôi | Khi giọng ở mức vàng (lần đầu) |
| 6 | Home screening (trẻ) | Voice | Với phụ huynh: kiểm tra 2 phút theo tuổi; bác sĩ quyết định | |
| 7 | Home screening | Insight | Hai câu: kết quả kiểm tra bằng giọng nói và chúng đổi gì trong kế hoạch. Không chẩn đoán | |
| 8 | Right pathway | Navigator | Đề nghị pathway: các mục theo hướng dẫn, theo thứ tự, mức khẩn, giờ hẹn, những gì bác sĩ quyết | `route` có thể dùng ở đây |
| 9 | Right pathway, "why?" | Forecast | Vì sao những mục này, cho người này, lúc này; không ép | |
| 10 | Right pathway, "not now" + mục khẩn | Navigator | Tôn trọng lựa chọn với mục thường; mục khẩn không chờ được, đã báo bác sĩ (U1) | |
| 11 | Right pathway, "not now" | Navigator | Tôn trọng; không nhắc trong 3 tháng (N3) | |
| 12 | Referral | Courier | Thư chuyển tuyến ngắn: ai, đặt gì, gì cần bác sĩ quyết, kết quả kiểm tra tại nhà (tối đa 80 từ) | Thẻ "Referral" |
| 13 | Referral | Analyst | Một câu: ca ẩn danh đã được tính; nhóm nhỏ bị ẩn; không tên | Thẻ "To the Department" |
| 14 | Ô soạn tin (bất kỳ lúc nào) | Kỹ năng đang giữ ca; chưa có ai giữ thì là Coach | Trả lời ngắn trong vai trò; cần bác sĩ thì nói và đề nghị đặt lịch | Có từ khẩn (weak, speech, chest, faint, pain) thì `fallback` là câu an toàn cố định |
| 15 | Khung tin nhắn gia đình | `familyChat` | Trả lời gia đình tối đa 45 từ; không chẩn đoán, không nói liều; dấu hiệu đột quỵ, đau ngực, lú lẫn thì khuyên đi khám ngay | |

**Chỗ gọi `understand`:** khi người xem **gõ chữ** thay vì bấm nút trên các thẻ `choice` có `free`, tức các câu hỏi `rf`, `sym`, `pref`, `time`, `book`, `words`. Dòng hệ thống hiện "The AI read the reply as: …" nếu nguồn `live`, hoặc "Keyword reader (AI off) read it as: …" nếu nguồn `keyword`.

<a id="7"></a>
## 7. Ráp mô hình AI vào web: từng bước

1. **Backend:** tạo route gọi mô hình AI, ví dụ mở rộng `respond-agent` hoặc dùng service mới. **Khóa API không được nằm trên trình duyệt.** Route nhận `SayRequest` hoặc `UnderstandRequest`, trả `SayResult` hoặc `UnderstandResult`. Nên kiểm định dạng JSON (JSON schema) và validator phía server.
2. **Web:** viết `RemoteAi implements NoaAi` (ví dụ `web/src/features/familyHealth/engine/remoteAi.ts`). Lớp này cần:
   - gọi route;
   - **quá 8 giây** (theo AI plan) thì trả `{ text: req.fallback, source: 'prepared', note }`;
   - sai định dạng thì cũng trả `fallback` kèm `note`;
   - `understand` trả `choice` không nằm trong `options` thì dùng bộ đọc từ khóa.
3. **Cắm vào engine** ở `web/src/features/familyHealth/ui/store.ts`, hàm `getEngine()`:
   ```ts
   engine = new FamilyHealthEngine({ ai: new RemoteAi(/* … */), scheduler: realScheduler({ reducedMotion: reducedMotion() }) })
   ```
   Nên có công tắc, ví dụ biến môi trường, để chạy demo bằng chữ soạn sẵn khi mạng yếu.
4. **Nút trạng thái AI** ở đầu bảng **tự đổi**, không cần sửa:
   - chưa cắm AI: "Prepared text (no live AI here)", nút bị khóa;
   - đã cắm: "Live AI · Noa agents", hoặc "Noa agent is thinking…" trong lúc AI đang trả lời;
   - bấm để tắt: "Prepared text (AI off)", engine dùng lại `PreparedAi`; bấm lần nữa để bật lại.

   Engine báo trạng thái qua `snapshot.ai` (`none` / `live` / `off`) và hàm `setAiEnabled(on)`.
5. **Không cần sửa engine.** Engine đã lo:
   - nhãn, bộ đếm, guardrail, "AI overruled", "thinking…";
   - hai bộ đọc cho câu hỏi nguy hiểm;
   - RTL cho lời AI tiếng Ả Rập.

   Ranh giới giữa AI và engine luật nằm ở mục 9 và 9b.

<a id="8"></a>
## 8. Nhãn, bộ đếm và nút trạng thái AI

| Nguồn | Nhãn trên tin nhắn | Đếm vào |
|---|---|---|
| `live` | **Live AI** (xanh lá) | `calls.live` |
| `prepared` | **Prepared** (xám), có `note` nếu do lỗi | `calls.prepared` |
| `fixed` | **Fixed script** (xanh dương), kèm dòng "never free AI text" | `calls.prepared`, như prototype |
| `guardrail` | **Guardrail** (vàng), có `note` lý do | `calls.guardrail` |

**4 trạng thái nút AI** (theo prototype; giao diện không ghi tên mô hình AI, chỉ ghi "Noa agent"):
- "● Live AI · Noa agents";
- "● Noa agent is thinking…";
- "● Prepared text (AI off)";
- "● Prepared text (no live AI here)".

**Bộ đếm ở Agent orchestra:** "live AI turns · prepared · guardrail · AI overruled". Prototype không bao giờ tăng "AI overruled" (lỗi B5). Web đã có sẵn đường để tăng khi `handoffTo` khác `route.to`.

<a id="9"></a>
## 9. Những gì không bao giờ đi qua AI

- **Lời khuyên cấp cứu:** nguồn `fixed`, kịch bản bác sĩ duyệt (lý do theo Q1, V1, V2, L1).
- **Mọi quyết định:** chọn agent tiếp theo, luật nào áp dụng, bài kiểm tra nào, mục nào vào pathway, mức khẩn, hạn chót, có phải cấp cứu không. Tất cả do engine quyết.
- **Mọi con số:** điểm giọng nói (`speech.ts`: 0,75 × khớp từ + 0,25 × tốc độ so với 3,0 giây; xanh ≥ 0,8, vàng ≥ 0,6), nguy cơ Framingham, kết quả bảng câu hỏi.
- **Dòng hệ thống, cờ, bảng, câu hỏi và lựa chọn:** chữ cố định.

<a id="9b"></a>
## 9b. Ranh giới AI và engine luật: ai quyết cái gì

Nguyên tắc (AI plan): **luật quyết, AI chỉ viết và đọc chữ.** AI không bao giờ giữ quyết định cấp cứu. Dưới đây là toàn bộ các điểm chạm, đã kiểm trong code ngày 20/11.

### Bảng phân định

| Việc | Ai quyết | AI được làm gì | Engine chặn bằng cách nào |
|---|---|---|---|
| Chọn agent tiếp theo, mã luật | Engine | Có thể gợi ý `handoffTo` | Luật thắng; ghi "AI overruled" và đếm (4 chỗ có `route`: D1, P1, Q1 hoặc K2, T1) |
| Phát hiện tín hiệu bất thường (G1, G3, B1, B2, O1, W1, A1, K1, L1, L2) | Engine | Không | Tính từ số đo |
| Cờ D1: yếu tố, nguồn, độ chắc chắn | Engine | Không | Chữ cố định |
| Chọn bài kiểm tra tại nhà | Engine | Không | `home.ts` |
| Điểm giọng nói, mức xanh, vàng, đỏ | Engine | Không. Team AI chỉ thay bộ **chuyển giọng nói thành chữ** (hiện là Web Speech của trình duyệt) | `speech.ts` chấm điểm cố định |
| Nguy cơ Framingham, kết quả bảng câu hỏi | Engine | Không. Forecast chỉ **giải thích** con số | Công thức |
| Có phải cấp cứu không (Q1, V1, V2, L1) | Engine | Không | Nhánh cấp cứu nằm trong engine |
| Lời khuyên cấp cứu | Kịch bản cố định | Không | Nguồn `fixed`, không gọi `say` |
| Ô soạn tin hoặc tin nhắn gia đình có từ khẩn | Kịch bản cố định | Không | Có từ khẩn thì không gọi AI (mới thêm, có test) |
| Mục nào vào pathway, mức khẩn, hạn chót, giờ, nơi khám | Engine | Không. Navigator chỉ **đọc to** pathway đã xây | `pathway.ts` |
| U1 (mục khẩn vẫn báo bác sĩ khi "not now"), N3 | Engine | Chỉ nói lời tôn trọng lựa chọn | Engine leo thang trước khi gọi `say` |
| Đọc câu trả lời gõ tay **thường** (`pref`, `time`, `book`) | AI (nếu có) | Chọn một trong các lựa chọn | Chọn ngoài danh sách thì engine dùng bộ đọc từ khóa |
| Đọc câu trả lời gõ tay **nguy hiểm** (`rf` dấu hiệu nguy hiểm, `sym` triệu chứng, `words` số từ của trẻ) | Kết quả **khẩn hơn** của hai bộ đọc | Đọc song song với bộ từ khóa | `moreUrgent()` trong `ai.ts`, có test: AI đọc "my arm feels weak" thành "none" vẫn ra V1 |
| Lời agent (14 lượt), tin nhắn gia đình | AI viết, trong `facts` | Viết chữ | `guard()` chặn liều thuốc, chẩn đoán, khuyên đừng đi cấp cứu → Guardrail |
| Nút bấm, lựa chọn, thẻ "Your turn", dòng hệ thống, bảng | Engine | Không | Chữ cố định |
| Sự kiện có hệ quả (đặt lịch, báo bác sĩ, thông báo cho gia đình) | Engine | Không. Chữ AI viết **không bao giờ gây ra hành động** | Hành động chỉ xảy ra trong engine |

### Chỗ còn lấn cấn và cách đề xuất xử lý

> **Cập nhật 20/11 sau PR #78 và #79:** đã xử lý dòng 1, 2, 3 (danh sách từ khẩn và validator có tiếng Ả Rập, dùng chung web và server), dòng 7 (chờ 8 giây trong `RemoteAi`) và dòng 8 (server ép ngôn ngữ trả lời). **Còn mở: dòng 4, 5, 6, 9, 10.**

| # | Chỗ lấn cấn | Rủi ro | Đề xuất cho team AI |
|---|---|---|---|
| 1 | **Nhận diện từ khẩn** ở ô soạn tin và tin nhắn gia đình dùng regex **tiếng Anh** (weak, speech, chest, faint, pain, slur, confus) | Câu gõ bằng tiếng Ả Rập không bị bắt nên vẫn đi qua AI; AI có thể trả lời không đúng kịch bản cấp cứu | Thêm danh sách từ khóa tiếng Ả Rập vào engine (team web làm được nếu team AI đưa danh sách), **và** server-side: AI có nhãn "emergency" thì trả `guardrail` để engine dùng câu cố định |
| 2 | **`guard()` chỉ có regex tiếng Anh** (mg, mcg, "you have a stroke"…) | Liều thuốc hay câu chẩn đoán bằng tiếng Ả Rập lọt qua | Validator phía server cho cả hai ngôn ngữ (đơn vị ملغ / مل / وحدة, câu chẩn đoán), trả `source: 'guardrail'` khi dính. Engine đã hiểu nguồn này |
| 3 | **Bộ từ khóa `KEYWORDS`** (bộ đọc thứ hai) cũng chỉ tiếng Anh | Với câu tiếng Ả Rập, "hai bộ đọc" thực chất chỉ còn một (AI) | Bổ sung từ khóa tiếng Ả Rập cho `rf`, `sym`, `words` trong `ai.ts`; hoặc cho AI trả thêm cờ `urgent: true` để engine nâng lên mức khẩn |
| 4 | **Giọng vàng hai lần** đi tiếp như giọng bình thường. Luật V3 ("still different → nurse video call within 1 hour") chưa dùng | Bỏ sót mức theo dõi giữa xanh và đỏ | Chốt với bác sĩ: hoặc thêm nhánh V3 vào engine (team web làm), hoặc coi lần hai vàng là đỏ |
| 5 | **Câu dự phòng ở ô soạn tin** khi có từ khẩn vẫn nói "call 998 now" (theo prototype). Lời khuyên cấp cứu chính thì nói "đi khám cấp cứu ngay; gọi 998 nếu không tự đi được" | Hai thông điệp khác nhau | Chốt một câu thống nhất. Team web sửa chữ trong `familyHealth.json` (`coach.emergency`, `chat.emergency`) |
| 6 | **Tin nhắn gia đình** (`askNoa`) không gắn nhãn Live AI / Prepared / Guardrail và không tính vào bộ đếm | Thiếu minh bạch so với các tin khác | Nếu cần, team web thêm nhãn khi team AI chốt; engine đã chạy `guard()` cho tin này |
| 7 | **Thời gian chờ 8 giây** chưa có trong engine | AI chậm làm bảng đứng | Đặt trong `RemoteAi` (mục 7) |
| 8 | **`facts` đã dịch theo `lang`**, còn `task` luôn bằng tiếng Anh | Mô hình có thể trả lời sai ngôn ngữ | Prompt phía server phải ép ngôn ngữ trả lời theo `lang`. Engine gắn `dir="rtl"` cho lời AI tiếng Ả Rập |
| 9 | **Đọc câu trả lời thường** (`book`): AI đọc "để sau" thành "đặt lịch" là sẽ đặt lịch thật trong demo | Đặt sai ý người dùng (không nguy hiểm) | Chấp nhận được với demo. Nếu muốn chặt: khi AI và từ khóa khác nhau ở `book`, hỏi lại |
| 10 | **Nhận dạng giọng nói** hiện dùng của trình duyệt (Chrome/Edge). AI plan muốn chuyển giọng nói thành chữ cho tiếng Ả Rập vùng Vịnh | Trình duyệt khác không có mic | Team AI thay `ui/speechIo.ts` (`listen`) bằng dịch vụ của mình. **Giữ nguyên** `scoreSpeech` để điểm không đổi |

---

<a id="10"></a>
## 10. Test: chạy gì, thêm gì

Chạy trong PowerShell từ **`D:\WORK\no-one-alone\web`** (chữ **D hoa**; `d:` viết thường làm hỏng setup jest-dom):

| Lệnh | Kết quả hiện tại |
|---|---|
| `npx vitest run tests/familyHealth` | Đạt hết (toàn bộ web 1.958 test ngày 20/11). Gồm việc chạy lại 19 lần chạy thật của prototype và so từng tin; cấp cứu, U1/N3, đổi giờ, "why?", tắt gen, trẻ em, Reset giữa chừng; cổng AI giả lập (live, guardrail, overruled) |
| `npx vitest run` | Toàn bộ web |
| `npx playwright test e2e/family-health.spec.ts` | Trang đầu tự chạy Saeed, hành trình Khalid tới Referral, cấp cứu bật màu đêm rồi Reset trả lại, ngăn kéo sửa số và chạy lại, điện thoại 390 px, tiếng Ả Rập, axe và độ tương phản |

**Khi ráp mô hình AI, nên thêm:**
1. Unit test cho `RemoteAi` với mock route: hết giờ, sai định dạng, guardrail, `choice` lạ.
2. **Chạy lại 10 quick test case với AI thật, mỗi case nhiều lần** (như "chế độ 2" của AI plan), cho cả en và ar:
   - các bước, luật, pathway, trạng thái cuối và bộ đếm Sở Y tế **phải giống hệt** `PreparedAi`;
   - chỉ có chữ agent được khác.
3. Một bộ câu trả lời tự do cho `understand` (kể cả câu lẫn tiếng Anh và tiếng Ả Rập, câu mơ hồ). Engine đã lấy nhãn khẩn hơn giữa AI và bộ từ khóa ở `rf`, `sym`, `words` (mục 9b). Test thêm các trường hợp AI đọc nhẹ đi.

<a id="11"></a>
## 11. Chỗ web khác prototype (có chủ ý)

- **Đã sửa các lỗi của prototype:**
  - Reset làm hỏng các lần chạy sau;
  - hai hành trình ghi chung một luồng;
  - nhật ký chuyền việc bị bóp nhỏ;
  - hộp 📦 luôn hiện;
  - Voice nói "tim đập nhanh" cả khi đường thấp hoặc huyết áp cao;
  - lỗi chữ;
  - giờ đứng yên;
  - huyết áp hiển thị khác hồ sơ;
  - "Doctor appointment this week" có mức khẩn "Within 1 week".
- **Khi web ở tiếng Ả Rập:** cả bảng dịch và đảo phải sang trái. Prototype giữ bảng bằng tiếng Anh. Nút "Noa speaks" vẫn chỉ đổi ngôn ngữ lời agent, câu mẫu, mic và giọng đọc.
- **Màu:** một số màu chữ đậm hơn để đạt AA. Ở chế độ tối, gradient nền phủ 50% thay vì 86%.
- **Không tự cuộn sau khi người xem đã bấm vào bảng,** như prototype. Phần đầu ngăn kéo hồ sơ dính khi cuộn.
- **Ký hiệu ▸ ♥ vẽ bằng CSS;** emoji đi qua `Icon`, vì web có luật cấm emoji trong code.

<a id="12"></a>
## 12. Việc còn mở cho team AI

1. **Giọng vàng hai lần:** prototype (và web) vẫn đi tiếp. Theo luật V3 thì phải "nurse video call within 1 hour", nhưng prototype chưa bao giờ dùng V3. Cần chốt.
2. **Hai bộ đọc cho câu hỏi nguy hiểm:** đã làm trong engine (`moreUrgent`, mục 9b). Còn thiếu từ khóa tiếng Ả Rập (mục 9b, dòng 3).
3. **Thời gian chờ 8 giây và tắt AI cả trang khi bị từ chối quyền:** đặt trong `RemoteAi`.
4. **Ô soạn tin và tin nhắn gia đình:** khi có từ khẩn thì đã không qua AI nữa (kịch bản cố định). Câu chữ cấp cứu cần thống nhất (mục 9b, dòng 5).
5. **Lớp phủ Test case cũ và benchmark 249 tình huống** dựa trên luật R/P/F cũ, không phải 34 mã mới. Nếu benchmark chuyển sang hành trình mới, cần bộ tình huống mới.
6. **Khalid:** web dùng 38 như prototype; AI plan và deck vẫn ghi 47. Nguy cơ Framingham phụ thuộc tuổi; con số trên cây hiện là ♥ 10%.
7. **Hosting trong UAE** và ghi log kiểm tra (audit log) phía server theo AI plan (rule ID, hash dữ liệu vào, phiên bản bảng luật, phiên bản prompt và model).

<a id="13"></a>
## 13. Đánh giá bản demo AI (nhánh `feat/claude-explain-web`, 20/11) và cách nối vào bảng mới

### Bản demo đang làm gì
- **respond-agent:**
  - endpoint `POST /explain` nhận `{ tkey, lang }`, với `tkey` là một trong bốn bộ teach-back `stroke`, `fall`, `hypo`, `hf` của lớp phủ Test case cũ;
  - **dữ kiện và prompt nằm ở server** (`explain.py`: `FACTS`, `RULES`, `LANGS`);
  - mô hình trả JSON `{ explain, simpler }` theo schema;
  - quá 7 giây hoặc lỗi thì trả `503`.
- **Validator phía server:**
  - kiểm định dạng và độ dài;
  - kiểm đúng hệ chữ (Ả Rập ≥ 90% với `ar`, không có chữ Ả Rập với `en`);
  - **mọi con số trong câu trả lời phải nằm trong dữ kiện**.
- **core-api:** `POST /api/explain` làm proxy, có nhóm giới hạn tần suất riêng, chờ đọc tối đa 10 giây.
- **Web:** nút "Explain it another way" trên **thẻ teach-back của lớp phủ Test case cũ**, chờ tối đa 8 giây, lỗi thì dùng chữ soạn sẵn. Nhãn nguồn "AI-written" chỉ hiện khi chữ thật sự do AI viết.
- **Gộp thử với `main`:** không có xung đột.

### Điểm tốt nên giữ
1. **Server giữ dữ kiện và prompt, web chỉ gửi mã.** Cách này an toàn hơn hợp đồng `NoaAi` hiện tại, vốn gửi `facts` và `task` từ trình duyệt: người dùng sửa được request và chèn lệnh vào prompt (prompt injection).
2. **Validator "số phải có trong dữ kiện" và kiểm hệ chữ.** Nên dùng lại cho mọi lượt nói của bảng mới, thay cho `guard()` chỉ có tiếng Anh ở phía web.
3. **Hủy request bằng `AbortSignal`, chờ 8 giây rồi dùng chữ soạn sẵn,** khớp đúng AI plan.

### Vì sao bảng mới chưa nối được
- **`/explain` chỉ phục vụ 4 thẻ teach-back của lớp phủ cũ.** Lớp phủ này đã ẩn khỏi web; giám khảo sẽ không thấy nút đó.
- **Bảng "Noa · family health" không có thẻ teach-back.** Nó cần 15 chỗ agent nói (mục 6) và chỗ đọc câu trả lời tự do (`understand`).

### Đề xuất (cần hai team thống nhất)
| # | Việc | Ai làm |
|---|---|---|
| 1 | **Đổi hợp đồng theo kiểu `/explain`:** web gửi `{ callId, lang, params }`. `callId` là mã chỗ nói, ví dụ `detect.guardian`, `pathway.offer`, `referral.courier`. `params` là dữ liệu có cấu trúc (tên, cờ, mục pathway…), không có câu lệnh. Server giữ prompt, dữ kiện cố định, **schema đầu ra theo từng agent** (mục 13b) và validator cho từng `callId`. Phía web, `SayRequest` thêm trường `callId`; `facts` và `task` vẫn giữ để chạy thử | **Team web đã làm:** `callId`, `tier`, `ruleId` có trong engine (`SAY_CALLS`). Team AI viết route |
| 2 | **Route cho bảng mới:** `POST /api/noa/say` và `POST /api/noa/understand` qua core-api, dùng lại khung của `/api/explain` (proxy, nhóm giới hạn tần suất, timeout) | Team AI |
| 3 | **Validator cho `say`:** dùng lại `numbers ⊆ facts` và kiểm hệ chữ của `explain.py`; thêm chặn liều thuốc, chẩn đoán, khuyên đừng đi cấp cứu cho cả tiếng Anh và tiếng Ả Rập; sai thì trả `503` để web dùng chữ soạn sẵn, hoặc trả `{ source: 'guardrail' }` | Team AI |
| 4 | **`understand`:** server chỉ được trả `choice` nằm trong `options` của câu hỏi đó. Đầu ra sai **không** được tự đổi thành "none" (xem 13b, dòng 2). Web vẫn đọc song song bằng từ khóa và lấy kết quả khẩn hơn ở `rf`, `sym`, `words` (đã làm) | Team AI (route), web đã xong phần chặn |
| 5 | **Lớp `RemoteAi` ở web:** gọi hai route qua `call()` của `web/src/data/api.ts` (đã có `signal` trong nhánh demo), chờ 8 giây rồi trả `fallback`. Cắm ở `getEngine()` (mục 7) và chỉ bật khi chạy chế độ live (`LIVE` trong `data/repo`) | Team AI hoặc team web, sau khi có route |
| 6 | **Thẻ teach-back cũ:** nếu muốn giám khảo thấy AI viết lời giải thích ngay đợt này, hoặc bật lại lớp phủ cũ (cờ trong `config/legacy.ts`), hoặc dùng `/explain` cho lượt **Coach** khi người dùng hỏi ở ô soạn tin. Đề xuất: dồn công vào bảng mới | Hai team chốt |

<a id="13b"></a>
### 13b. Đối chiếu với kiến trúc (AI plan, phần "AI plan and architecture", bản ngày 20/11)

Đã đọc lại toàn bộ kiến trúc ngày 20/11, **không có phiên bản mới** so với bản team web làm theo. Dưới đây là từng điểm của kiến trúc, so với web hiện tại và đề xuất ở trên.

**Khớp, giữ nguyên:**
| Kiến trúc | Web hiện tại |
|---|---|
| Luật quyết, mô hình không giữ quyết định cấp cứu | Mọi quyết định nằm trong engine (mục 9, 9b) |
| Orchestrator chọn agent theo luật; mô hình gợi ý khác thì "AI overruled", luật thắng | Có (`route` / `handoffTo`, bộ đếm) |
| Mỗi lần chuyền việc kiểm consent và ghi log ("consent ✓ · logged ✓") | Có trên giao diện |
| Hai bộ đọc cho nhãn nguy hiểm, lấy nhãn khẩn hơn | Có (`moreUrgent`) |
| Điểm giọng nói do code chấm, mô hình không chấm | Có (`speech.ts`) |
| Đầu ra sai bị chặn, tính là guardrail, dùng chữ soạn sẵn | Có (`guard()` ở web; validator server là việc của team AI) |
| Quá 8 giây thì dùng chữ soạn sẵn | Để trong `RemoteAi` (mục 7) |
| Sở Y tế: ẩn tên, ẩn nhóm dưới 10 (S1) | Có (Analyst, phần Government) |

**Chưa khớp, cần xử lý trước khi team AI viết route:**
| # | Kiến trúc nói | Thực tế ở hành trình mới | Cách xử lý đề xuất |
|---|---|---|---|
| 1 | **Đầu ra theo schema riêng của từng agent:** Guardian = chữ + mã luật; Voice = một nhãn trong danh sách cố định + transcript; Coach = chữ + "understood / not yet"; Forecast = chữ dựa trên nguy cơ đã tính; Navigator = nhãn rào cản P3–P8 + yêu cầu đặt lịch; Courier = **FHIR Bundle** kiểm theo schema; Insight = các lựa chọn "for the doctor"; Analyst = chữ báo cáo trên số tổng hợp | `NoaAi.say` chỉ trả `text`. Hành trình mới không hỏi rào cản P3–P8 (chỉ hỏi cách khám và giờ); Courier đang viết thư chuyển tuyến bằng chữ | Giai đoạn demo: giữ `say` trả chữ, server vẫn kiểm theo schema `{ text, ruleId? }` (**web đã nhận và hiển thị `ruleId` hợp lệ**). Giai đoạn sau: thêm trường có cấu trúc vào `SayResult` (ví dụ `fhir` cho Courier, `options` cho Insight); engine chỉ hiển thị, **không** dùng các trường đó để quyết định |
| 2 | **Đầu ra sai thì đọc thành "none"**, và "none" = không trả lời, tính là 998 (R5–R7) | Ở câu hỏi `rf` của hành trình mới, `none` nghĩa là "No, I feel OK", tức **an toàn**. Làm đúng chữ kiến trúc sẽ biến đầu ra hỏng thành "không có dấu hiệu nguy hiểm" | **Không** đổi đầu ra sai thành `none`. Engine hiện dùng kết quả bộ từ khóa, rồi lấy kết quả khẩn hơn. Danh sách nhãn cố định là `id` các lựa chọn của từng câu hỏi (`rf`: weak, chest, faint, palp, none…), không phải danh sách 6 nhãn của lớp phủ đêm |
| 3 | **Hai mức mô hình:** mô hình nhanh cho nhãn và câu ngắn; mô hình mạnh cho gói hồ sơ, giải thích, báo cáo; ghim phiên bản; đổi mô hình là một lần phát hành | Engine chưa phân mức | **Đã làm ở web:** mỗi request mang `tier` (nhanh: `understand`, Guardian, Voice, ô soạn tin, tin nhắn gia đình; mạnh: Forecast, Insight, Navigator, Courier, Analyst). Server chọn mô hình theo `tier` hoặc `callId` |
| 4 | **Audit log** ghi mã luật, hash dữ liệu vào, phiên bản bảng luật, phiên bản prompt và mô hình | Engine có nhật ký chuyền việc trên trình duyệt, chưa có log phía server | Route của team AI ghi log mỗi lần gọi (callId, hash `params`, phiên bản prompt, phiên bản mô hình, kết quả validator). Web gửi kèm `ruleTableVersion` khi có |
| 5 | **Engine luật dùng chung** cho prototype, server và bộ test (một hàm thuần) | Engine là TypeScript thuần trong `web/src/features/familyHealth/engine/`, không phụ thuộc React | Bộ test cổng và server có thể chạy **chính engine này** bằng Node; không viết lại bằng Python, để tránh hai bản luật lệch nhau |
| 6 | **`decide()` R1–R12, kịch bản 998 cố định, 3 cổng 249 tình huống** | Thuộc **lớp phủ đêm cũ** (đã ẩn). Hành trình mới dùng 34 mã luật, cấp cứu là "khuyên đi khám cấp cứu ngay" theo prototype, chưa có bộ tình huống và cổng riêng | Hai team chốt: hoặc giữ 3 cổng cho lớp phủ cũ và làm thêm bộ tình huống cho hành trình mới (các nhánh Q1, V1, V2, L1, U1, N3, K2…), hoặc chuyển hẳn sang hành trình mới |
| 7 | **Danh sách nhãn trả lời cố định:** clear, confused, none, can't get up, breathless at rest, breathless lying flat | Đây là nhãn của lớp phủ đêm. Hành trình mới có câu hỏi riêng (`rf`, `sym`, `pref`, `time`, `book`, `words`) | Mỗi câu hỏi một danh sách nhãn cố định = `options` (đã có trong `UnderstandRequest`) |
| 8 | **Lớp 1–2:** thiết bị, webhook InsideSync có chữ ký, consent kiểm hai lần, thiết bị mất kết nối 30 phút thì báo, không coi là bình thường | Bảng mới dùng số đo mô phỏng; chưa có trạng thái "thiết bị mất kết nối" | Khi nối dữ liệu thật: engine cần thêm trạng thái mất kết nối, team web làm khi team AI chốt định dạng dữ liệu |
| 9 | **Hosting trong UAE** | Chưa chốt | Team AI chốt với Sở Y tế |

<a id="13c"></a>
### 13c. PR #78 và #79 (AI trực tiếp cho bảng mới), cập nhật 20/11

**Đã merge vào dev:**
- **PR #78** (server): route `/noa/say`, `/noa/understand` trong respond-agent và proxy ở core-api, làm đúng các đề xuất 1–4 ở trên:
  - web gửi `{ callId, lang, params }`, prompt và schema ở server theo 15 mã;
  - hai mức mô hình;
  - validator cả tiếng Anh lẫn tiếng Ả Rập, con số phải có trong `params`;
  - từ khẩn không tới mô hình;
  - `understand` lỗi thì báo lỗi chứ không trả "none";
  - audit log;
  - giới hạn tần suất.
- **PR #79** (web): `RemoteAi` (`engine/remoteAi.ts`), `noaSay` / `noaUnderstand` (`data/api.ts`), danh sách từ khẩn dùng chung với server (có test so với `noa.py`), bộ đọc từ khóa hiểu tiếng Ả Rập, công tắc `VITE_NOA_AI`. Lần tự chạy khi mở trang vẫn dùng chữ soạn sẵn. Test so `params` với model của server (khóa, kiểu, độ dài, giới hạn danh sách).

**Team web đã làm thêm và đã đưa lên dev (commit `f9d6d68`):**
- **Nút "Noa speaks"** (English / العربية) đổi ngay lời soạn sẵn của agent sang ngôn ngữ đã chọn, kể cả các tin đã hiện. Lời AI thật giữ đúng ngôn ngữ nó được viết.
- **Logo No One Alone** thay icon robot ở dòng "The AI read the reply as…" và ở thông báo nổi khi Noa trả lời.
- **Team web cũng làm một bản `RemoteAi` cùng lúc** (commit `b2c0497`, đã lên `main` trước khi thấy PR #79). Bản đó **đã bỏ** trong commit gộp trên dev, chỉ giữ bản của PR #79. Khi gộp `dev` vào `main`, lấy theo `dev`.

**Còn lại cho team AI:**
1. **Quota mô hình** của project đang là 0; xin lại sau 48 giờ. Có quota thì đặt biến repo `VITE_NOA_AI=on`, deploy, chạy `tools/probe-noa-ai.ps1`.
2. **Giới hạn 20 lượt `say`/phút/IP:** một hành trình có khoảng 10 lượt `say`. Giám khảo chạy 2–3 quick test case liền nhau là dính 429; nửa hành trình hiện "Live AI", nửa còn lại "Prepared". Đề nghị nâng lên khoảng 60/phút/IP.
3. **Kiểm hệ chữ tiếng Ả Rập ≥ 90%:** `params` có chữ Latin như IFHAS, HbA1c, M-CHAT-R, tên thiết bị, mã luật. Mô hình chép lại các chữ đó là bị đánh trượt rồi rơi về chữ soạn sẵn. Nên trừ các token Latin có sẵn trong `params` khi đếm.
4. **`route` / `handoffTo` / `ruleId` chưa có trong schema trả về:** "AI overruled" và mã luật trên tin nhắn sẽ không xuất hiện. Được cho demo.
5. **Khi bật thật:** chạy lại 10 quick test case, cả EN và AR. Các bước, luật, pathway và trạng thái cuối phải giống hệt chế độ chữ soạn sẵn; chỉ chữ của agent được khác.

### PR #74 đã merge vào dev
Team AI đã sửa 6 lỗi nhỏ của engine Test case cũ theo danh sách trong file bàn giao đợt 1 (đại từ trong `hypo_em`, đường huyết trong gói 998, nhãn F1, kiểm khoảng giá trị đo hằng ngày, câu tự kiểm R10, số agent trong chú thích). Các sửa này chỉ chạm lớp phủ cũ, không ảnh hưởng bảng mới.


<a id="14"></a>
## 14. Ô "Ask Noa" và tin nhắn gia đình: ngữ cảnh cho AI (cập nhật 20/11)

### 14.1 Lỗi thấy khi chạy với AI thật
Ảnh chụp ngày 20/11, Moza đang ở nhánh **cấp cứu** (thanh đỏ "Moza should see a doctor now"):
| # | Hiện tượng | Nguyên nhân |
|---|---|---|
| 1 | Gõ "10h" thì AI hỏi lại "bạn hỏi gì?". Câu nào AI cũng chào "Hi Moza, I'm Noa Coach" | `composer.reply` chỉ gửi `{ name, question, journey_stage }`, **không có lịch sử hội thoại** |
| 2 | AI hứa "I can arrange", "I'll pass your request along", nhưng không có lịch nào được đặt | Chữ AI viết không gây ra hành động (đúng thiết kế), nhưng AI **không biết** app làm được gì nên vẫn hứa |
| 3 | Đang cấp cứu mà AI bàn chuyện hẹn bác sĩ tới nhà Chủ nhật | AI **không biết** ca đang ở nhánh cấp cứu |
| 4 | Câu dài, lặp lời chào và lặp câu cảnh báo | Prompt chưa tính tới hội thoại nhiều lượt |

### 14.2 Team web đã làm (trên dev)
- **Đang cấp cứu thì ô "Ask Noa" và khung tin nhắn gia đình không gọi AI.** Hỏi gì cũng nhận câu cố định nhắc lại lời khuyên đi cấp cứu, và báo screening cùng đặt lịch tạm dừng tới khi bác sĩ khám (khóa `coach.emergencyActive`, `chat.emergencyActive`, en + ar). Đây là luật an toàn nên thuộc engine. Có test: `web/tests/familyHealth/emergency-chat.test.ts`.

### 14.3 Đề xuất: gửi đủ ngữ cảnh cho AI (cần hai team làm cùng lúc)
Server đang cấm trường lạ, nên **team AI mở rộng params trước**, team web gửi thêm sau. Đề xuất params mới cho `composer.reply`, mọi trường đều đã có sẵn trong engine:
```json
{
  "audience": "Moza", "name": "Moza", "question": "10am pls", "journey_stage": "pathway",
  "history": [ { "by": "person", "text": "please book a visit this sunday" }, { "by": "noa", "text": "…" } ],
  "detect": { "urgent_rule": "G1", "signal": "Resting heart 128 bpm, far above her usual", "flags": ["High blood pressure 146/84", "2 checks overdue"] },
  "pathway": { "booked": [ { "check": "Bone density scan", "where": "Al Bateen FHC", "when": "Wed 25 Nov, 09:00" } ], "for_the_doctor": ["Stroke clinic follow-up"] },
  "can_do": ["Start home screening (button on the card)", "Change the time (on the booking card)", "Open the record (tap the person in the tree)"]
}
```
- `history`: 4–6 lượt gần nhất (người dùng và Noa), mỗi lượt có giới hạn độ dài.
- `detect`: những gì Detect đã thấy (luật khẩn nếu có, tín hiệu, 3 cờ quan trọng nhất).
- `pathway`: các mục đã đặt lịch và mục chờ bác sĩ quyết (nếu đã tới bước đó).
- `can_do`: các việc người dùng **tự bấm** được trên app ở bước hiện tại. AI chỉ được hướng dẫn tới đúng nút, **không được hứa tự đặt lịch hay gửi yêu cầu**.
- Không cần gửi `emergency`: khi cấp cứu, engine đã không gọi AI (14.2).

**Prompt phía server:**
- chỉ chào ở lượt đầu tiên của hội thoại;
- trả lời ngắn (2–3 câu);
- dùng `history` để hiểu câu ngắn kiểu "10h", "yes pls";
- không hứa hành động; muốn đặt hay đổi lịch thì chỉ tới nút trong `can_do`;
- chỉ nhắc "đi cấp cứu" khi câu hỏi có dấu hiệu khẩn (server đã có danh sách `EMERGENCY`).

**Tương tự cho `family.chat`:** thêm tình trạng hiện tại của từng người trong gia đình (bước, đã đặt gì, có đang cấp cứu không) và 4 lượt hội thoại gần nhất, ngoài 6 thông báo đã gửi.

**Câu hỏi cho team AI:** đồng ý schema trên không, và khi nào server nhận được? Team web gửi các trường này ngay khi server sẵn sàng; test hợp đồng ở `web/tests/familyHealth/ai-calls.test.ts` sẽ cập nhật theo.
