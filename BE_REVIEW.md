# BE review: chuyển backend sang câu chuyện Abu Dhabi, hai ngôn ngữ en/ar

Tài liệu cho team backend review commit BE trên nhánh `feat/abu-dhabi-redesign`. Phần BE này do phía FE viết để tiết kiệm thời gian; nhờ team review, sửa nếu cần, rồi xóa file này trước khi merge vào `main`. Commit này cũng chứa phần web đọc các field mới (mục 2). Id, đường dẫn Firestore, tên field, giá trị enum giữ nguyên; chỉ đổi tên hiển thị, văn bản, số, locale, timezone.

## 0. Đọc cái này trước (rủi ro lớn nhất)

- **Toàn bộ test đã chạy thật**, kể cả các test `core-api` cần Docker (Testcontainers, Firestore emulator): 149/149 qua. Lần chạy đầu có 2 test đỏ do kỳ vọng cũ trong test (`IncidentStoreTest.seedLoadsPeopleAndHospitals` đếm 4 bệnh viện, nay seed còn 2; `IncidentFlowCheckInTest.personWithoutDialectSendsNoDialectKey` đếm đúng 1 lần gọi, nay `start()` cũng mở check-in cho cùng người) và đã sửa trong test. Chỗ đáng xem kỹ nhất khi review: mục 3.2 (bệnh viện được chọn, ETA, giờ UTC) và mục 4 (những thứ không kiểm được ngoài GCP).
- Code production đã biên dịch (JDK 25, `release 17`, không đổi `pom.xml`). Các phần kiểm được bằng unit test không cần Firestore đều xanh.
- Chưa có gì được triển khai. Firestore/FHIR store/Cloud Run đang chạy dữ liệu cũ; xem mục 4.

## 1. Đã đổi gì

### Bước 1: ngôn ngữ UI qua chat và agent

| File | Thay đổi |
|---|---|
| `core-api/.../flow/ChatService.java` | `Request` thêm `lang` (mặc định `en`; khác `en`/`ar` thì 400 `lang must be en or ar`). Body gửi sang respond có `lang`. Constructor 4 tham số cũ vẫn dùng được. |
| `agents/respond/main.py`, `chat.py` | `/chat` nhận `lang: "en"\|"ar"` (mặc định `en`, khác thì 422). System prompt có dòng chỉ thị ngôn ngữ rõ ràng (`LANGS`); facts viết lại cho Moza/Abu Dhabi/998/02:04/01:22/142. `max_output_tokens` 200 → 400 (tiếng Ả Rập tốn token hơn; vẫn giới hạn 80 từ trong prompt). |
| `agents/respond/lang.py` | `lang_of(person)` trả `ar` nếu `locale` bắt đầu bằng `ar`, còn lại `en`. `is_en` giữ lại. Múi giờ mặc định `Asia/Dubai`. |
| `agents/respond/gcp.py` | `TTS_LOCALE = {"en": "en-AU", "ar": "ar-XA"}`; tên giọng vẫn `{locale}-Chirp3-HD-Aoede`. Prompt Gemini nghe/ack thêm câu yêu cầu tiếng Ả Rập chuẩn, giọng nữ lịch sự. Bỏ nhánh tiếng Việt. |
| `agents/respond/scripts.json` | Bỏ khối `vi`, thêm khối `ar` đủ key như `en` (Modern Standard Arabic, nói với bà ở ngôi thứ hai giống cách script `en` gọi `{name}`). Câu kiểm tra giọng: **"The sky is blue in Abu Dhabi."** / `السماء زرقاء في أبوظبي`; `repeat_phrase` cập nhật. |
| `plan.py`, `checkin.py`, `recovery.py`, `main.py` | `"en" if is_en(x) else "vi"` → `lang_of(x)`. Prompt tóm tắt hồi phục thêm yêu cầu tiếng Ả Rập khi người nhận là `ar`. |
| `rules.py` | Từ khóa triệu chứng và từ phủ định tiếng Việt → tiếng Ả Rập; dấu câu `،؛؟` cũng tách mệnh đề; câu trả lời "لا" = "answered no". |
| `core-api/.../flow/IncidentFlow.java` | Yes/No của người bệnh: `Yes`/`No` hoặc `نعم`/`لا` theo `Person.language()` (trước đây `Có`/`Không`). |
| `core-api/.../model/Person.java` | Thêm `language()` (không serialize). |

Java không dịch văn bản tự do. Các dòng timeline vẫn tiếng Anh; web dựng câu theo ngôn ngữ UI từ mã ở Bước 2.

### Bước 2: mã ổn định cạnh văn bản (chỉ thêm, không đổi/xóa field cũ)

- `TimelineEntry` thêm `memberId`, `params`. **`kind` đã có sẵn từ trước** (22 giá trị, đúng bằng `TimelineKind` trong `web/src/data/contract.ts`), nên không tạo bộ enum mới (`CALLING`, `NO_ANSWER`... không tồn tại). Tương ứng: `NOTIFIED` = "Calling X", `EXPIRED` = không trả lời, `CALLED_115` (actor `SYSTEM`) = gọi 998 tự động.
- `model/Params.java` (mới): map `params`, bỏ giá trị null. `Incident.log(...)` có overload mới 6 tham số.
- `Turn.kind`, `Pending.step`, `respond /checkin/turn` → `next.step`, `TurnResult.Next.step`.
- `RecoveryInfo.Med.key`, `Activity.key`, `Reminder.key`; `flow/RecoveryKeys.java` (mới) là danh mục; `respond/recovery.py` chuyển `key` từ mục kế hoạch sang nhắc nhở.
- `data/predict/predict/family.py`, `contract.py`: `families/{id}.members[].conditions[].code`.

### Bước 3: seed và script sang Abu Dhabi

- `core-api/.../data/seed.json`: Moza Al Hammadi (id `margaret`), `Asia/Dubai`, `locale: "en-AE"`, địa chỉ `Villa 12, Street 18, Al Bateen, Abu Dhabi`, `emergencyNumber: "998"`, baseline `nightHr` 57 → 61 (web nói "Night baseline 61"). Hamad (`david`, 450 m), Khalid (`james`, Al Ain), Alia (`sarah`, London, `Europe/London`, `en-GB`), Shamma (`aisha`, hàng xóm). Bệnh viện: `sydney-stroke-center` → "Corniche Stroke Centre", `marrickville-clinic` → "Al Bateen Family Health Centre" (id giữ nguyên). **Tọa độ là bịa** (Al Bateen ~24.454, 54.3385; Corniche ~24.48, 54.35), team nên thay bằng tọa độ muốn dùng.
- `scenarios/stroke.json`: HR 137 → 142 (cửa sổ 15 phút điều chỉnh các phút cuối 134/137/140/142).
- `flow/Handoff.java`: số của script ghi âm: last well **01:22**, slurred **02:04**, HR **142**, ETA 12 (giữ). `scriptLastWell` đặt 01:22 cùng ngày theo múi giờ của người bệnh. Hằng số tên rõ ràng (`SCRIPT_LAST_WELL`...).
- `flow/EscalationRules.java`: số khẩn cấp mặc định khi người bệnh không có: `115` → `998` (`DEFAULT_EMERGENCY_NUMBER`).
- `model/StoryClock.DEFAULT_ZONE`: `Asia/Dubai`. `ApiController`: `personId` mặc định `margaret` (trước là `ba-mai`).
- Nhánh tiếng Việt trong `Escalation` (tên bắt đầu bằng "Bà"), `Handoff.firstName`, `Recovery.fallbackReminders` (mạ ơi...) đã bỏ; fallback nhắc nhở có tiếng Ả Rập (`حان وقت دوائكِ ...`).
- `agents/hospital`: `data/fhir/margaret.json` (tên, địa chỉ, `city`/`country`), `handoff/packet.py` (múi giờ `Asia/Dubai`, nhãn `GST`; bỏ profile `ba-mai` và bản `VI`), fixture `request.stroke.json`/`packet.stroke.json` giờ là của Moza (Hamad/brother, Corniche, ETA 11, last well 21:22Z = 01:22 địa phương; **golden packet được sinh lại bằng chính pipeline**, đã xem diff bằng mắt). Bundle FHIR không có Practitioner/Organization/telecom nên không có GP, tổ chức, số điện thoại để đổi.
- `data/predict`: bỏ `ba-mai` (xem 1.5).

### 1.5 Đã xóa (persona tiếng Việt `ba-mai`)

Seed: người `ba-mai`, `ong-hung`, `lan`, `tuan`; bệnh viện `stroke-center-a`, `district-clinic-b`. Hospital: `data/fhir/ba-mai.json`, profile VI, các test tham số hóa theo `ba-mai`. Predict: profile vitals `ba-mai`, tên liên hệ "Ông Tư", test hai người. Respond: khối `vi` và test tiếng Việt được **chuyển sang tiếng Ả Rập** (không chỉ xóa). Test core-api cần một người thứ hai nên dùng người **giả trong test**: `core-api/src/test/.../support/TestPeopleConfig.java` (id `test-elder`, `test-near`, `test-far`, `test-extra`, 2 bệnh viện `test-*`, múi giờ UTC+7 cho dễ đọc giờ) gắn thêm vào `Seed` chỉ trong test.

## 2. Hợp đồng web phải áp dụng

### 2.1 `POST /api/chat`

```json
{ "question": "Who is with her?", "mode": "fam", "viewer": "james", "history": [], "lang": "ar" }
```
`lang` tùy chọn, `"en"` hoặc `"ar"`, thiếu = `"en"`. Giá trị khác (kể cả `"EN"`, `""`) → 400 `INVALID_REQUEST` ("lang must be en or ar"). Response vẫn `{ "answer": "..." }`, 502 `CHAT_UNAVAILABLE` như cũ.

### 2.2 Timeline (`incidents/{id}.timeline[]`)

```json
{ "at": "2026-10-15T22:03:30Z", "actor": "SYSTEM", "kind": "NOTIFIED", "text": "Calling Hamad: ...",
  "memberId": "david", "params": { "etaMin": 6, "attempt": 1 } }
```
`memberId` và `params` có thể vắng (không bao giờ null). Giá trị `params` theo `kind`:

| kind | memberId | params |
|---|---|---|
| `ALERT` | | `hr`, `movementMin` |
| `VERIFIED`, `FALSE_ALARM` | | `hr`, `movementMin` |
| `AGENT_FALLBACK` | | `step`: `VERIFY` \| `CHECKIN` \| `TRIAGE` \| `PLAN` \| `HANDOFF` |
| `ASKED` | | `step`: `OPENING` \| `SPEECH_CHECK` \| `SYMPTOMS` \| `YES_NO` (vắng nếu respond cũ) |
| `ANSWERED` | | `answer`: `YES`\|`NO` (nút), hoặc `noSpeech: true`; trả lời bằng giọng có chữ thì không có params |
| `NO_REPLY` | | `count` |
| `TRIAGED` | | `level`, `reasons` (mảng) |
| `ALERTED` | | `memberIds` (mảng, người DISTANT trước), `suspectedStroke` |
| `NOTIFIED` | có | `etaMin`?, `attempt`? |
| `EXPIRED` | có | `seconds`, `voicemail` |
| `ACCEPTED`, `DECLINED`, `ARRIVED` | có | |
| `NO_NEARBY` | | |
| `CALLED_115` | có nếu do thành viên bấm (actor = memberId); không nếu gọi tự động (actor `SYSTEM`) | `number` (ví dụ `"998"`) |
| `HANDOFF_SENT` | | `hospitalId`, `etaMin` |
| `HANDOFF_RECEIVED`, `HANDOFF_FAILED` | | `hospitalId` |
| `FAMILY_UPDATE` | `ownerId` nếu có người đang đến | `hospitalId`, `ownerId`? |
| `CLOSED` | | `by`: `CHECKIN` \| `CONSOLE` |
| `DISCHARGED` | | `staffName` |

`actor` cho hành động của thành viên đã là `memberId`. Câu hỏi kiểm tra giọng nhận ra bằng `ASKED` + `params.step == "SPEECH_CHECK"`, không cần so cụm từ.

### 2.3 Lượt check-in

```json
"checkIn": {
  "turns": [{ "by": "AGENT", "at": "...", "text": "Please repeat after me: ...", "kind": "SPEECH_CHECK" },
            { "by": "PERSON", "at": "...", "text": "Yes" }],
  "pending": { "text": "...", "kind": "VOICE", "step": "SPEECH_CHECK" }
}
```
`turns[].kind` chỉ có ở lượt `AGENT`: `OPENING` \| `SPEECH_CHECK` \| `SYMPTOMS` \| `YES_NO`. `pending.step` cùng bộ giá trị; `pending.kind` vẫn là cách trả lời (`VOICE`/`YES_NO`). Tài liệu cũ không có field mới.

### 2.4 Kế hoạch hồi phục

`POST /api/incidents/{id}/recovery` chấp nhận thêm `key` tùy chọn trên `meds[]` và `activities[]` (mẫu `^[a-z0-9_]{1,40}$`, sai → 400). Không gửi thì core-api tự suy ra từ danh mục (tìm từ khóa trong tên, không phân biệt hoa thường):

- Thuốc: `apixaban`, `perindopril`, `atorvastatin`, `amlodipine`, `vitamin_d` ("vitamin d"), `aspirin`.
- Hoạt động: `walk`, `blood_pressure` ("blood pressure"), `speech`, `water`.
- Mục bác sĩ tự gõ không khớp thì **không có key**.

```json
"recovery": {
  "meds": [{ "name": "Apixaban", "dose": "5 mg", "times": ["08:00"], "change": "New", "key": "apixaban" }],
  "activities": [{ "text": "Walk for 15 minutes", "times": ["10:00"], "key": "walk" }],
  "reminders": [{ "time": "08:00", "kind": "MED", "text": "Time for your Apixaban, 5 mg.", "key": "apixaban" }]
}
```
`reminders[].key` = key của thuốc/hoạt động tương ứng nếu có. Hồ sơ cũ không có key.

### 2.5 `families/{personId}` (job `data/predict`)

```json
{ "label": "stroke", "ageAtOnset": 74, "code": "STROKE" }
```
`code` ∈ `STROKE`, `HYPERTENSION`, `TYPE_2_DIABETES`, `PREDIABETES`, `DEMENTIA`, `HEARING_LOSS`, `CHRONIC_KIDNEY_DISEASE`, `OSTEOARTHRITIS`, `ATRIAL_FIBRILLATION`, `GLAUCOMA`; vắng nếu không nhận ra. Web ánh xạ sang `ConditionKey` của nó (HTN, STR, AF, T2D, GLA, DEM, HEAR). Packet `handoff.packet.conditions` vẫn là mảng nhãn tiếng Anh, **chưa có mã** (không làm).

### 2.6 Khác

- Ngôn ngữ nói của người bệnh = `people/{id}.locale`: `en-*` → tiếng Anh, `ar-*` → tiếng Ả Rập, còn lại tiếng Anh. Seed hiện `en-AE`.
- Số khẩn cấp: `998`. `CALLED_115` (kind và action) **giữ nguyên tên** vì là giá trị hợp đồng; nó là di tích của Việt Nam.

### 2.7 Web đã áp dụng gì (cùng commit này)

- Chat gửi `lang` theo ngôn ngữ giao diện (`web/src/features/chat/ChatPanel.tsx`).
- Timeline: nhận diện cuộc gọi và người liên quan bằng `kind` + `memberId` + `params`, và tự dựng câu theo ngôn ngữ giao diện cho các kind có đủ tham số (`web/src/domain/timeline.ts`, chuỗi ở `live:line.*`). Các kind là lời của agent (`ASKED`, `VERIFIED`, `FALSE_ALARM`, `FAMILY_UPDATE`, `HANDOFF_SENT`, câu trả lời bằng giọng nói) vẫn hiển thị `text` của backend.
- Check-in: nhận diện speech check bằng `turns[].kind`.
- Kế hoạch hồi phục: dùng `key` để gắn dòng giải thích và icon; trình soạn kế hoạch phía bệnh viện gửi `key` kèm thuốc và hoạt động mặc định, bỏ `key` khi bác sĩ gõ lại tên.
- Bệnh nền: dùng `conditions[].code` (`web/src/data/sources/overlay.ts`); `PREDIABETES` gộp vào cột tiểu đường, `CHRONIC_KIDNEY_DISEASE` và `OSTEOARTHRITIS` chưa có cột.
- Mọi chỗ đều giữ cách cũ (dò chữ tiếng Anh) làm dự phòng khi tài liệu chưa có field mới.
- Chưa có field nên web vẫn đọc từ `text`: lời nhắn gửi người nhà sau dấu hai chấm trong `ALERTED`/`NOTIFIED`, và lý do triage (`params.reasons` là chữ tiếng Anh). Nếu muốn hiển thị được bằng tiếng Ả Rập, cần mã lý do và field riêng cho lời nhắn.

## 3. Đã kiểm chứng thế nào

### 3.1 Số test

| Bộ | Trước | Sau | Ghi chú |
|---|---|---|---|
| `web` (`npm test`) | 556 passed | **623 passed** | +test cho từng chỗ chuyển sang field mới, có và không có field |
| `agents/respond` (`pytest -q`) | 89 passed | **95 passed** | +test lang chat, step, key, TTS locale, Ả Rập; test tiếng Việt chuyển sang Ả Rập |
| `agents/hospital` (`pytest -q`) | 223 passed | **214 passed** | giảm do bỏ tham số hóa `ba-mai` |
| `data/predict` (`pytest -q`) | 187 passed | **173 passed** | giảm do bỏ người thứ hai; +1 test `code` |
| `core-api` (`mvn -q test`, có Docker) | 131 test (trên máy không có Docker: 40 pass, 91 lỗi Docker) | **149 passed** | chạy với Docker Desktop bật; 0 failure, 0 error |

Venv ở ngoài repo (`scratchpad\be\venv-respond`, `venv-hospital`, `venv-predict`). `core-api` chạy với JDK 25, không cần cờ phụ.

### 3.2 Test mới và test đã sửa

Chạy được (không cần Firestore), mới: `ChatServiceTest` (lang qua mock store/agent), `RecoveryKeysTest` (danh mục, `scriptLastWell` = 01:22 Asia/Dubai, `Person.language()`), `DocsTest` (+3: vòng khứ hồi `memberId`/`params`, `Turn.kind`/`Pending.step`, key và tài liệu cũ không key), `RespondAgentClientTest` (+3: parse `step`, thiếu `step`, `key` của reminder), `StoryClockTest` (offset Dubai `-140220000`, giờ 22:03Z), `ScenariosTest`, `ApiControllerTest`, `ApiErrorsTest`.

Sửa/viết, cần Docker để chạy (đã chạy, xanh): `IncidentFlowCheckInTest` (+2: yes/no tiếng Ả Rập, `step` trên turn/pending/timeline), `RecoveryTest` (+3: fallback Ả Rập, key suy ra + reminder mang key, key sai → 400; follow-up date `2026-10-24` vì Abu Dhabi UTC+4 cùng ngày 17), `ChatTest` (+1 `lang`), `HandoffTest` (câu thông báo `01:22`/`02:04`/`142`; Routes mock: Corniche lat 24 gọi Routes là đúng, bệnh viện giả ở Huế không được gọi), `EscalationTest`, `ActionsTest`, `DemoServiceTest`, `StrokeFlowTest` (giờ phải gọi `/api/demo/stroke` với `{"personId":"test-elder"}` vì mặc định đã thành `margaret`), `IncidentStoreTest`.

## 4. Chưa kiểm chứng được, team phải kiểm

1. **Chirp 3 HD tiếng Ả Rập**: locale `ar-XA` và tên giọng `ar-XA-Chirp3-HD-Aoede` là **chưa kiểm chứng** (không có GCP). Code có đường lùi `list_voices` nếu `InvalidArgument`, nhưng chưa ai nghe thử. Tiếng Anh vẫn `en-AU` (Chirp không có `en-AE`): giọng Úc cho câu chuyện Abu Dhabi, có thể muốn `en-GB`/`en-IN`.
2. **Gemini trả lời tiếng Ả Rập** (chat, ack nghe, tóm tắt hồi phục): chưa chạy thật. Kiểm: độ dài (đã nâng token), có bám 80 từ, có giữ tên bằng chữ Ả Rập, validator `ack`/tóm tắt (`recovery.py` kiểm từ thuốc tiếng Anh nên bỏ sót thuốc viết bằng chữ Ả Rập).
3. **Văn bản `ar` trong `scripts.json`**: do tôi dịch, cần người bản ngữ duyệt giọng điệu (cách xưng hô, `يا {name}`, nữ tính). Tên trong script là `displayName` viết Latin ("Moza") chen vào câu Ả Rập, TTS đọc có thể kỳ.
4. **Luật triệu chứng tiếng Ả Rập** (`rules.py`): cửa sổ phủ định 2 từ nên "لا أشعر بألم في الصدر" sẽ bị coi là đau ngực (leo thang thừa, không bao giờ thiếu). Thiên về an toàn, nhưng đáng biết.
5. **Audio ghi sẵn**: không thể thu âm lại. Code không tham chiếu file mp3 nào (web phát trực tiếp từ `web/public/noa|sim`); nguồn văn bản là `tools/gen_clips.py` (ngoài phạm vi tôi được sửa nên **không sửa**). Bảng dưới.
6. **Dữ liệu đã triển khai**:
   - Firestore: `store.seed` chỉ `set`, không xóa. Sau reset, `people/margaret`, `david`, `aisha`, `james`, `sarah` và 2 bệnh viện được ghi đè, nhưng `people/{ba-mai,ong-hung,lan,tuan}` và `hospitals/{stroke-center-a,district-clinic-b}` vẫn còn (vô hại: `Handoff` chọn Corniche vì các bệnh viện kia ở >5° và bị xếp sau), cần xóa tay cùng `families/ba-mai`, `forecasts/ba-mai`. Doc `people/margaret` trên môi trường chạy vẫn là Sydney đến khi có reset/seed.
   - `families/margaret`, `forecasts/margaret`: phải chạy lại `python -m predict.run family --person margaret --write` (chạy được duyệt) để có tên mới và `code`; tài liệu cũ vẫn hợp lệ (field mới tùy chọn).
   - FHIR store `noa/records`: `scripts/load_fhir.py` **từ chối ghi đè** resource khác nội dung ("differ from ours, nothing was written"), nên `Patient/margaret` đã nạp (tên, địa chỉ Sydney) cần cập nhật tay. Production đang ở `FHIR_SOURCE=fixture`, không ảnh hưởng.
   - Incident cũ trong Firestore không có `memberId`/`params`/`kind`/`step`/`key`: web phải chịu được vắng.
   - Cloud Run: không có env var nào về múi giờ/locale trong `infra/` hay `application.properties` (đã grep); `noa.region=asia-southeast1` không đổi. Múi giờ chỉ lấy từ `people/{id}.timezone` và `StoryClock.DEFAULT_ZONE`.
   - Firestore rules/indexes: không đổi, không cần.
7. **Quyết định giữ ngôn ngữ nói là tiếng Anh**: `locale: "en-AE"` trong seed để audio ghi sẵn và demo tiếp tục chạy. Chuyển sang tiếng Ả Rập = đổi **một field**, `people/margaret.locale` → `"ar-AE"`, rồi `POST /api/demo/reset`. Khi đó check-in/plan/recovery/TTS/Gemini dùng khối `ar` và `ar-XA`; các thành viên khác (`david`...) cũng cần `locale: "ar-AE"` nếu muốn tin nhắn cho họ bằng tiếng Ả Rập. Chưa thử.

### Audio ghi sẵn (`web/public/noa`, `web/public/sim`; bản trong `web/dist` là bản build)

Giọng: Noa `en-AU-Chirp3-HD-Aoede`, operator `en-AU-Chirp3-HD-Charon`, bà `en-AU-Chirp3-HD-Gacrux`. Tên file chứa `james`/`david` là id, giữ nguyên.

| File | Hiện nói | Phải nói sau khi re-set (đề xuất) |
|---|---|---|
| `noa/calling-james.mp3` | I'm calling James now. Please stay sitting. | I'm calling Khalid now. Please stay sitting. |
| `noa/no-answer-james-calling-david.mp3` | James didn't answer, so I've left him a message. I'm calling David now. | Khalid didn't answer, so I've left him a message. I'm calling Hamad now. |
| `noa/on-the-way-david.mp3` | David is on his way. He has a key. I'm calling 000 now. | Hamad is on his way. He has a key. I'm calling 998 now. |
| `noa/ambulance-coming.mp3` | Help is on the way, Margaret. The ambulance is 12 minutes away. ... | ... Umm Khalid (như web `live.json`) hoặc Moza, 12 phút giữ nguyên |
| `noa/000-1.mp3` (operator) | Emergency. Police, Fire or Ambulance? | **Cần quyết định sản phẩm**: 998 là cứu thương UAE (công an là 999). Đề xuất: "Ambulance. What is your emergency?" |
| `noa/000-2.mp3` | Ambulance. This is Noa from No One Alone, calling for Margaret Collins, 78, female, who lives alone. Possible stroke. | ... calling for Moza Al Hammadi, 78, ... |
| `noa/000-3.mp3` | What's the address? | không đổi |
| `noa/000-4-david.mp3` | 186 Marrickville Road, Marrickville 2204. Her brother David is on his way with a key. | Villa 12, Street 18, Al Bateen, Abu Dhabi. Her brother Hamad is on his way with a key. |
| `noa/000-4-alone.mp3` | 186 Marrickville Road, Marrickville 2204. Nobody is with her. Key lockbox by the front door. | Villa 12, Street 18, Al Bateen, Abu Dhabi. Nobody is with her. Her neighbour Shamma holds a spare key. |
| `noa/000-5.mp3` | Tell me exactly what happened. | không đổi |
| `noa/000-6.mp3` | Slurred speech at 01:40, last seen well at 01:30. ... Heart rate 137. ... | Slurred speech at 02:04, last seen well at 01:22. ... Heart rate 142. ... |
| `noa/000-7.mp3` | An ambulance is on its way, about 12 minutes. ... | không đổi |
| `noa/000-8.mp3` | ... Her details are going to Camperdown Stroke Centre ... | ... Corniche Stroke Centre ... |
| `sim/red-1.mp3` | giọng líu: "Thuh... sgyyh... izh... bwuuh... in... Zhid... neh..." (The sky is blue in Sydney) | líu của "... in Abu Dhabi" (ví dụ "... in... Ahh... buu... dah...") |
| `sim/red-0.mp3` | Mmm... yeahh... yes... | không đổi |
| `noa/000-6-chest-pain.mp3`, `000-6-fall.mp3`, `000-6-weakness.mp3`, `sim/slurred-1.mp3` | **Không có trong `tools/gen_clips.py`**, tôi không biết nội dung; phải nghe lại, rất có thể nhắc 01:30/01:40/137/Sydney | |

Các dòng tiếng Anh do respond sinh khi chạy (`scripts.json`) không phải audio ghi sẵn; chúng đã đổi sang Abu Dhabi và Chirp đọc trực tiếp.

## 5. Quyết định không đổi, và câu hỏi mở

Không đổi (có chủ đích):
- Mọi id (`margaret`, `james`, `david`, `sarah`, `aisha`, `sydney-stroke-center`, `marrickville-clinic`), `CALLED_115`, hàm `called115`, tên file audio.
- Không viết endpoint/dữ liệu cho Government, Hospital overview, danh sách hồ sơ, vòng sàng lọc, chuyển tuyến (ngoài phạm vi).
- Fallback khi respond sập (`Escalation.fallbackPlan`) vẫn tiếng Anh cho mọi người nhận.
- `tools/gen_clips.py`, `README.md` gốc (nhắc "Margaret (Gacrux)"/"000 operator"), `firestore.rules`: ngoài phạm vi.
- Không dịch tên hiển thị sang chữ Ả Rập (không có field).

Nơi id có thể hiện ra cho người dùng: `EscalationRules.name` rơi về `memberId` khi không có doc người; thông báo lỗi `ApiException` như "`david` cannot accept now", "`memberId` is already on the way" lộ id nếu web hiện `error.message`; `incident.actor` là id thành viên.

Câu hỏi mở cho team/sản phẩm:
1. Thứ tự gọi: seed vẫn gọi **Khalid (DISTANT, priority 1) trước Hamad**; web mock ghi "Hamad · first to call". Giữ hay đổi priority?
2. Noa gọi bà bằng tên đầu `Moza` (từ `displayName`); web mock đôi chỗ nói "Umm Khalid". Cần field `callName`/`nickname` trong `Person`?
3. Bản `ar` cần tên Ả Rập (`موزة`, `حمد`...): thêm field tên hiển thị tiếng Ả Rập cho người trong `people/*`?
4. `movementMin` của fixture vẫn 10 (luật `hr > 120 && still >= 10` và câu "about 10 minutes" trong script) trong khi web mock ghi "no movement for 4 min". Web đang là mock; thống nhất con số nào?
5. Giọng `en-AU` cho Abu Dhabi (xem mục 4.1); operator 998 nói gì (xem bảng audio).
6. Có muốn mã điều kiện cho `handoff.packet.conditions` (hiện chỉ nhãn tiếng Anh)? Cần đổi hợp đồng packet của hospital-agent.
7. Có muốn `Seed` xóa các doc người/bệnh viện không còn trong seed khi reset?
8. Tọa độ Moza/Hamad/Khalid/Corniche trong seed là bịa; ETA 6 phút của Hamad lấy từ Routes thật nếu bật `MAPS_API_KEY`.


## 6. Việc còn lại cho team BE (chưa làm trong commit này)

Web có các màn mới đang đọc **dữ liệu mock** trong `web/src/locales/{en,ar}/data/*.json`, kể cả khi `VITE_DATA_SOURCE=firebase`. Các nút hành động trên những màn này chỉ đổi trạng thái trong trình duyệt. Cần BE quyết nguồn dữ liệu và cấp API; web chỉ phải đổi một chỗ (`web/src/data/sources/`). Hình dạng dữ liệu web mong đợi nằm trong các file kiểu bên dưới; file mock là ví dụ đầy đủ.

| Màn | Hàm ở web | Kiểu dữ liệu | Hành động cần endpoint ghi |
|---|---|---|---|
| Government, Population health | `getGovernment()` | `web/src/data/government.types.ts` | giao việc cho kết quả bị treo; duyệt ngày phòng khám lưu động |
| Government, Programme signals | `getSignals()` | `government.types.ts` (`SignalsData`) | duyệt quyết định |
| Hospital, Overview | `getOverview()`, `getScreening()` | `overview.types.ts`, `screening.types.ts` | hành động trên ca screening; duyệt gợi ý mở thêm lịch |
| Hospital, Results to review | `getScreening()` | `screening.types.ts` | "Confirm and send plan"; lưu nháp |
| Hospital, Referrals | `getScreening()` | `screening.types.ts` | nhận và đặt lịch; từ chối kèm mã lý do; tự trả lại sau 2 ngày làm việc |
| Hospital, Patient records | `getPatients()` | `patients.types.ts` | đánh dấu đã xem; yêu cầu ghi chú từ bệnh viện khác; xin chia sẻ tiền sử gia đình; việc cần làm; ghi chú |
| Individual, Care record | `getCareRecord()` | khối CareRecord trong `web/src/data/types.ts` | không |
| Individual, Treatment | `getTreatment()` | `treatment.types.ts` | tick việc cần làm; thêm lịch hẹn (khi có sự cố live, web đã đọc `RecoveryDoc` hiện có) |

Ghi chú:
- Hồ sơ 6 bước (Summary, History, Screening, Results, Treatment, Follow-up) dùng chung một danh sách "chart entry" (thời điểm, nơi, người thực hiện, kết quả, mục liên quan, nguồn); Moza có 23 mục. Phía bệnh viện viết kiểu lâm sàng, phía bệnh nhân viết lời dễ hiểu (ngôi "you" cho Moza, ngôi thứ ba cho người nhà). Cần BE quyết: sinh các phiên bản lời văn ở backend, hay cấp dữ liệu có cấu trúc để web tự diễn đạt.
- Mỗi thẻ dữ liệu hiển thị nguồn và thời điểm: mỗi bản ghi cần `source` và `updatedAt`.
- Government: danh sách 17 khu vực cần ranh giới thật (GeoJSON) hoặc tọa độ tâm; vị trí trên bản đồ hiện là ước lượng. Điểm hiệu quả của cơ sở y tế đang là trung bình ba chỉ số (đúng hạn, hồi phục 90 ngày, không tái nhập viện): cần xác nhận công thức.
- Chuyển tuyến: đề xuất đi qua `agents/hospital` dưới dạng FHIR `ServiceRequest` trên A2A, giống pre-arrival packet. Malaffi hiện chỉ là nhãn "liên kết dự kiến" trên giao diện.
- Màn Risk forecast và Who sees what đã bỏ khỏi giao diện; web không còn đọc `forecasts/{id}`. Xác nhận trước khi gỡ job.
- Audio thu sẵn trong `web/public/noa` và `web/public/sim` vẫn là bản Sydney (Margaret, 000); bản chữ của cuộc gọi cấp cứu ở web (`web/src/features/individual/live/useCallDialogue.ts`) giữ nguyên để khớp audio cho tới khi thu lại (bảng ở mục 4).
