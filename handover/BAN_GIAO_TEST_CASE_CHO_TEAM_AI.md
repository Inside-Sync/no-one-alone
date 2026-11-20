# Bàn giao Test case cho team AI

> Ngày 20/11/2026. Người nhận: team AI, nhóm sẽ làm lại logic Test case bằng một Orchestrator và 4 agent AI, tự test rồi đưa cho nhóm test độc lập.
> Tài liệu này là **bản duy nhất**: nó gộp toàn bộ bản kiểm kê tiếng Anh trước đây (`test-case-inventory.en.md`, đã xóa) và bản nháp bàn giao ngắn. Phụ lục A–D giữ nguyên văn tiếng Anh từng bước và log mong đợi của 10 case.
> **Mọi người, cơ sở y tế, bác sĩ và con số trong tài liệu đều là hư cấu. Mọi ngưỡng (R, P, F, mục tiêu theo dõi hằng ngày, ngưỡng kết quả) là ngưỡng demo, chưa có bác sĩ hay Sở Y tế ký duyệt.**

## Mục lục

- [0. Cách đọc tài liệu này và thuật ngữ](#muc-0)
- [1. Bức tranh chung](#muc-1)
- [2. Phạm vi bàn giao](#muc-2)
- [3. Mười case, mỗi case một chương](#muc-3)
  - [3.0 Khung chung (đọc trước khi đọc từng case)](#muc-3-0)
  - [3.1 `family`: Cả gia đình (The whole family)](#c-family)
  - [3.2 `wellchild`: Hind, khám trẻ khỏe bị trễ](#c-wellchild)
  - [3.3 `ifhas`: Khalid, chưa từng tầm soát IFHAS](#c-ifhas)
  - [3.4 `expat`: Arjun, gia đình mới đến Abu Dhabi](#c-expat)
  - [3.5 `bone`: Hamad, kiểm tra xương và trí nhớ](#c-bone)
  - [3.6 `stroke`: Moza, đột quỵ ban đêm](#c-stroke)
  - [3.7 `fall`: Hessa, té ngã ban đêm](#c-fall)
  - [3.8 `hypo`: Saeed, hạ đường huyết ban đêm](#c-hypo)
  - [3.9 `hf`: Mariam, ứ dịch do suy tim](#c-hf)
  - [3.10 `own`: Tự nhập (Enter your own)](#c-own)
- [4. Luật đầy đủ](#muc-4)
- [5. Chín agent hiện tại và ánh xạ sang 4 agent mới](#muc-5)
- [6. Công thức: điểm giọng nói, Framingham, teach-back](#muc-6)
- [7. Engine API, snapshot, autopilot, Judge path, database, log](#muc-7)
- [8. Benchmark](#muc-8)
- [9. Test hiện có](#muc-9)
- [10. Đề xuất tự test và test độc lập](#muc-10)
- [11. Khác biệt với AI plan cần quyết](#muc-11)
- [12. Lỗi và giới hạn đã biết](#muc-12)
- [13. Câu hỏi mở](#muc-13)
- [14. Hành trình mới "Noa · family health" và cổng cắm AI](#muc-14)
- [Phụ lục A. Hành trình an toàn, từng bước nguyên văn](#pl-a)
- [Phụ lục B. Các bước của case gia đình](#pl-b)
- [Phụ lục C. Các bước phòng ngừa và dữ liệu theo case](#pl-c)
- [Phụ lục D. Lần chạy tự động mặc định của 10 case (kết quả mong đợi)](#pl-d)

---

<a id="muc-0"></a>
## 0. Cách đọc tài liệu này và thuật ngữ

**Ai đọc phần nào**
- Người mới, muốn hiểu một case: đọc mục 1, mục 3.0, rồi chương của case đó trong mục 3. Mỗi chương có: câu chuyện, mục tiêu, đầu vào, bước 0, bảng nhánh, từng bước sau đó, kết quả mong đợi khi chạy mặc định, cách test.
- Người viết engine mới: mục 3, 4, 6, 7.
- Người test: mục 3 (phần "Cách test case này"), 8, 9, 10 và Phụ lục D (log mong đợi).
- Người quyết định kiến trúc: mục 2, 11, 12, 13.

**Quy ước trình bày**
- Mọi nhãn trên màn hình, câu luật, dòng log, câu hỏi, câu trả lời được giữ **nguyên tiếng Anh như trong app**, đặt trong dấu `code` hoặc ngoặc kép, có giải nghĩa tiếng Việt ngắn khi cần.
- `{{n}}`, `{{her}}`, `{{f1s}}`… là chỗ trống được điền theo người trong case (xem bảng token ở mục 7.6). Ví dụ với Moza: `{{n}}` = Moza, `{{f1s}}` = Khalid, `{{f2s}}` = Hamad.
- Đường dẫn file tính từ `web/src/features/testcase/` trừ khi ghi khác. Tài liệu dẫn theo **tên hàm**, không theo số dòng (một số số dòng trong bản kiểm kê cũ đã sai, ví dụ `engine/checks.ts` chỉ có 50 dòng).
- "Đã chạy thật" nghĩa là kết quả lấy từ việc chạy engine thật (đóng gói bằng rolldown, không sửa repo) ngày 19–20/11/2026. Các kết quả của nhánh rẽ trong mục 3 cũng được chạy thật như vậy khi viết tài liệu này.

**Thuật ngữ**

| Thuật ngữ | Nghĩa trong Test case |
|---|---|
| case | Một kịch bản demo trong 10 kịch bản (`family`, `wellchild`, `ifhas`, `expat`, `bone`, `stroke`, `fall`, `hypo`, `hf`, `own`). Chọn bằng `?test=<id>`. |
| step (bước) | Một thẻ trong hành trình. Bước 0 luôn là bước "đầu vào và quyết định"; các bước sau là hành trình đã chọn. |
| kind (loại bước) | Kiểu tương tác của bước: `home` (an toàn, bước 0), `passport` (phòng ngừa, bước 0), `famhub` (gia đình, bước 0), `tl` (timeline, bấm để hiện từng dòng), `btn` (một nút "đóng vai đội chăm sóc"), `teach` (giải thích + teach-back + gửi kế hoạch), `recheck` (đo lại đường huyết), `daily` (theo dõi hằng ngày), `accept` (bác sĩ/điều dưỡng chấp nhận cảnh báo), `report` (báo cáo Sở Y tế), `result` (nhập kết quả phòng ngừa), `refer` (chấp nhận chuyển tuyến), `famresult` (nhập kết quả cả nhà). |
| mode | Góc nhìn của bước: `ind` = Individual (người dân, gia đình, màu xanh lá), `hosp` = Hospital (bệnh viện/phòng khám, xanh dương), `gov` = Government (Sở Y tế, tím). |
| rule (luật) | Một dòng trong bảng luật công bố: R1–R12 (an toàn), P1–P9 (phòng ngừa), F1–F2 (nguy cơ tim gia đình). Mỗi quyết định ghi tên luật. |
| trigger (kích hoạt) | R1–R4: điều kiện khiến Guardian đánh thức Voice. Không có trigger thì ra R12. |
| ladder (thang quyết định) | Thứ tự kiểm tra R5–R11 sau bài kiểm tra giọng nói và câu trả lời; dòng đầu tiên khớp thắng. |
| path / journey (hành trình) | Chuỗi bước sau quyết định: `stroke_em`, `fall_em`, `fall_minor`, `hypo_home`, `hypo_em`, `hf_clinic`, `hf_em` (an toàn), `prev` (phòng ngừa), `fam` (gia đình). Hậu tố `_em` = cấp cứu, có gọi 998. |
| branch (nhánh kết quả) | Với phòng ngừa: `refer` (chuyển tuyến) hoặc `ok` (khỏe, vào passport). |
| stand down (đứng xuống) | Đã kích hoạt nhưng người trả lời rõ và giọng bình thường: không gọi ai, báo gia đình là ổn. |
| tTrig / tCheck / tAct | Phút kích hoạt / phút Voice gọi (tTrig + 1) / phút hành động (tCheck + 2). Với phòng ngừa tAct = giờ bắt đầu + 3 phút. |
| `m+X`, `dN HH:MM` | Thời điểm của bước: X phút sau tAct, hoặc ngày thứ N sau ngày của tAct lúc HH:MM. |
| hold / hand-off | Dòng "ai đang giữ ca" (ví dụ `Responder → 998`) và chuỗi chuyển giao `flow` giữa các agent và con người. |
| decides | Câu "ai quyết định" trên mỗi thẻ (ví dụ `The 998 operator sends the ambulance.`). |
| autopilot | Nút `Run it for me`: engine tự làm việc một người sẽ làm ở mỗi bước, theo một kịch bản cố định (mục 7.3). |
| Judge path | Tour 3 phút cho giám khảo: `ifhas` → `family` → `stroke` (mục 7.4). |
| snapshot | Bản chụp bất biến trạng thái engine sau mỗi thay đổi; giao diện chỉ vẽ từ snapshot (mục 7.2). |
| pipeline | 7 nút trên thẻ: Sensors and voice, Phone app, Cloud, Consent "Their rules", Noa "Agent team", Hospital "Care team", Department of Health. Mỗi bước làm sáng vài nút kèm một dòng chữ (`pipe`). |
| gates (5 cổng an toàn trên thẻ) | Consent, Data complete, Urgent bypass, Rule decision, Human approval (mục 4.4). Khác với 3 cổng phát hành A/B/C của AI plan. |
| provenance (nguồn gốc) | Nhãn cho mỗi dòng log, dòng dữ liệu, thẻ: Observed, Calculated, AI-written, Clinician confirmed (mục 4.5). |
| guardrail đầu vào | Kiểm tra giá trị nhập (thiếu, ngoài khoảng): từ chối hoặc kẹp về biên (mục 3.0.2). |
| passport | Family Health Passport: danh sách mọi việc khám/tầm soát đến hạn của từng người. |
| barrier / enabler | Rào cản người dân nêu ra (6 loại) và cách hỗ trợ tương ứng (P3–P8). |
| teach-back | Giải thích xong thì hỏi lại một câu trắc nghiệm 3 lựa chọn để kiểm tra người nghe đã hiểu. |
| IFHAS | Chương trình tầm soát sức khỏe người lớn (trong demo: người Emirati 18–75 tuổi). |
| 998 | Số cấp cứu ở UAE. |

---

<a id="muc-1"></a>
## 1. Bức tranh chung

### 1.1 Test case là gì, dành cho ai

Test case là một lớp phủ (overlay) mở trên web prototype "No One Alone" (nút `Test case` và banner trên mọi view, hoặc deep link `?test`, `?test=<case>`, `?test=bench`, `?test=judges`). Nó dành cho **giám khảo** và người xem demo: họ **tự nhập** tuổi, chỉ số, rào cản, kết quả xét nghiệm và xem đội agent "Noa" quyết định gì theo một bảng luật công khai, rồi đi tiếp hành trình đến bệnh viện, về nhà, theo dõi và báo cáo Sở Y tế. Mục tiêu là chứng minh: quyết định theo luật đọc được, con người quyết định mọi bước lâm sàng, dữ liệu chỉ đi theo consent, và vòng chăm sóc được đóng.

### 1.2 Ba loại case và "Enter your own"

| Nhóm trên bộ chọn case | Case | Bản chất |
|---|---|---|
| `Who should Noa look after?` (bắt đầu) | `family`, `stroke`, `ifhas` | Ba case chính của Judge path |
| `Prevention and screening · one person at a time` | `wellchild`, `expat`, `bone` (cùng `ifhas`) | Phòng ngừa: tìm rào cản thay vì nhắc lại, đặt lịch một chạm, nhập kết quả, chuyển đúng chỗ |
| `Safety net · when something goes wrong at home` | `fall`, `hypo`, `hf`, `own` (cùng `stroke`) | An toàn: cảm biến ở nhà phát lại từng phút, luật R1–R4 kích hoạt, Voice gọi và hỏi, thang R5–R11 quyết định |

Thẻ `stroke` mang nhãn `Live speech test` (bài kiểm tra giọng nói bằng micro thật). `own` (`Enter your own`) cho chọn bất kỳ người nào trong 9 người, giờ ban đêm 01:12 hoặc sáng 08:10, và mọi chỉ số; mặc định không có gì bất thường nên ra R12.

### 1.3 Bố cục màn hình

- **Header của case**: tên case, câu chuyện ngắn (`brief.*`: "The moment that matters" và "How might we"), nút `Run it for me` / `Stop`, `Start here: 3-minute Judge path`, `Replay with the same readings`, `Restart`, công tắc ngôn ngữ `Noa speaks` EN / العربية (ảnh hưởng câu kiểm tra giọng nói và teach-back).
- **Stepper**: các bước của hành trình, chỉ bấm được bước đã tới. Thanh `Next` dưới cùng (`nextbar`) gợi ý việc cần làm tiếp (ví dụ `Answer Noa’s question`).
- **Step card** (thẻ bước): tiêu đề, mode, thời điểm, chữ mô tả, dòng `What this means`, 5 cổng an toàn, dòng nguồn gốc (provenance), các agent của bước với câu thoại của từng agent, baton `Who has {{n}}’s care` (hold), chuỗi hand-off, câu "decides", phần tương tác theo `kind`, và khung `Right action, right time?` (các dòng tự kiểm, mục 4.3).
- **3 màn hình** cạnh thẻ:
  1. **Phone**: app của người dân. Ca an toàn: các ô theo dõi đêm/sáng (nhịp tim, đường huyết hoặc té ngã hoặc cân nặng, oxy, giọng nói), rồi câu hỏi của Noa Voice, rồi banner quyết định (đỏ `Help is coming` có nút `Call 998 (demo)` cho `_em`; vàng uống nước đường / đứng dậy / điều dưỡng; xanh `All is well`), lời Coach ở bước teach, ghi chú Navigator ở bước daily, và banner `phone` riêng của từng bước.
  2. **Web**: web app "Family circle" (mode Individual): bảng tin gia đình (`feed`) và ai được xem dữ liệu.
  3. **Noa panel**: tab Hospital (dòng worklist đỏ/vàng kèm luật, timeline ghi chú bệnh viện, worklist phòng khám với nút `Accept`, hồ sơ chung: thuốc, tiền sử, ca này) và tab Government (KPI hằng tháng của Sở Y tế, không có tên, "Fictional figures"). Case gia đình: hồ sơ hợp nhất 8 người. Case phòng ngừa: view phòng khám (đặt lịch, kết quả, worklist chuyển tuyến).
- **Pipeline** 7 nút, **Demo database** (10 bảng, mở bảng phù hợp với bước, 40 dòng mới nhất, cột provenance, nút `Copy table as JSON`) và **API and event log** (mới nhất ở trên, tối đa 150 dòng).
- **Tab `For judges`**: tiêu chí chấm, Judge path, 6 câu hỏi, mỗi case một câu, KPI tính trực tiếp từ engine (mục 7.4), "What happens when Noa is wrong", lộ trình pilot (đề xuất).
- **Tab `Benchmark`**: chạy 249 tình huống, xem chỉ số và mở một tình huống thành case (mục 8).

### 1.4 Hiện trạng: hoàn toàn xác định, không gọi AI

- Không có lời gọi mạng nào trong `web/src/features/testcase` (không `fetch`, không gọi backend).
- **Quyết định = luật. Điểm giọng nói và nguy cơ tim = công thức. Mọi câu chữ = chuỗi soạn sẵn** trong file ngôn ngữ (en và ar). Arabic do máy dịch, chưa ai duyệt.
- Nhận dạng giọng nói và đọc to dùng Web Speech API của trình duyệt (Chrome/Edge cho micro).
- Engine (`engine/`) là TypeScript thuần: không React, không đồng hồ thật, không `Date.now`; nguồn ngẫu nhiên mặc định `mulberry32(2026)` được seed lại mỗi lần `restart`. Cùng đầu vào cho cùng kết quả, mọi lần.
- **Vấn đề trung thực cần sửa ngay**: dòng provenance của bước teach ghi lời giải thích và câu hỏi là **"AI-written"**, trong khi chúng là chữ soạn sẵn (chính thẻ teach lại hiện nhãn `Prepared text`). Tiêu đề đội agent cũng ghi `Noa is a team of 9 AI agents` dù không agent nào gọi AI. Hàm `applyLiveExplain(json)` (nhận lời giải thích do AI viết, có kiểm tra hình dạng) và các khóa `teach.*.facts` (dữ liệu cho prompt) đã có nhưng **không nơi nào gọi**.
- Backend có 2 agent thật trên Cloud Run (`agents/respond` dùng Gemini 2.5 Flash, `agents/hospital` theo luật), nhưng **Test case không gọi chúng**; chỉ core-api gọi (chi tiết mục 12). `docs/submission/architecture.md` mục 2 cũng ghi như vậy ("No LLM makes a decision... does not call the backend"), với lý do: chat đã triển khai chỉ biết case của Moza, và chữ cố định thì lặp lại được.

---

<a id="muc-2"></a>
## 2. Phạm vi bàn giao

| Phần | Từ nay ai làm |
|---|---|
| Logic các case: luật R1–R12, P1–P9, F1–F2, thứ tự quyết định, kịch bản từng bước, chấm điểm giọng nói, Framingham, teach-back | **Team AI** (chuyển sang Orchestrator + bảng luật có phiên bản + 34 mã luật Orchestrator) |
| Phần AI: mô hình AI đọc câu trả lời, viết lời giải thích, gói hồ sơ, báo cáo; validator; dự phòng chữ soạn sẵn | **Team AI** |
| Bộ benchmark 249 tình huống, 3 cổng phát hành A/B/C, báo cáo test | **Team AI** (tự test + đưa test độc lập) |
| Giao diện (bảng "Noa · family journey" mới, các view Individual / Hospital / Government) | **Team web** (theo prototype mới) |
| Hợp đồng dữ liệu giữa engine và giao diện (mục 7.2, 7.7) | **Hai bên thống nhất** trước khi code |

Code hiện tại vẫn chạy trên web (lớp phủ Test case). Khi giao diện mới lên, lớp phủ này sẽ **tạm ẩn, chưa xóa**, để còn đối chiếu. Mọi kết quả mong đợi trong tài liệu (mục 3 và Phụ lục D) lấy từ code hiện tại; khi team AI cố ý đổi hành vi (ví dụ theo mục 11), phải cập nhật bảng mong đợi và ghi lý do.

---

<a id="muc-3"></a>
## 3. Mười case, mỗi case một chương

<a id="muc-3-0"></a>
### 3.0 Khung chung (đọc trước khi đọc từng case)

Phần này mô tả những cơ chế dùng chung để các chương sau không phải lặp lại. Khi một chương ghi "xem 3.0.x", cơ chế ở đây áp dụng nguyên vẹn.

#### 3.0.1 Bảng tóm tắt 10 case

| Mã (`?test=`) | Người (tuổi, giới) | Loại | Bắt đầu (phút / giờ) | Đêm? | Kết quả khi chạy mặc định (autopilot) |
|---|---|---|---|---|---|
| `family` | Gia đình Al Mansoori, 8 người, 4 thế hệ; Khalid (47, nam) là người gốc | gia đình | 8310 / 20 Oct 18:30 | không | Passport 25% → 91%, 8 người "up to date or in care", bước cuối 5 |
| `wellchild` | Hind Al Mansoori (18 tháng, nữ) | phòng ngừa (trẻ) | 8310 / 20 Oct 18:30 | không | P4 → kết quả 2 từ → chuyển Child speech and hearing clinic, bước cuối 7 |
| `ifhas` | Khalid Al Mansoori (47, nam) | phòng ngừa (người lớn) | 8310 | không | P6 → HbA1c 7,4% → Family doctor, bước cuối 7 |
| `expat` | Arjun Nair (4 tháng, nam) | phòng ngừa (trẻ) | 8310 | không | P3 → bách phân vị 40 → khỏe, bước cuối 7 |
| `bone` | Hamad Al Hammadi (74, nam) | phòng ngừa (người lớn) | 8310 | không | P4 → T-score −2,7 → loãng xương → bác sĩ, bước cuối 7 |
| `stroke` | Moza Al Hammadi (78, nữ, tăng huyết áp) | an toàn | 72 / 15 Oct 01:12 | có | R1 → giọng 0,33 đỏ → **R5, 998**, bước cuối 8 |
| `fall` | Hessa Al Ketbi (82, nữ, uống apixaban) | an toàn | 185 / 03:05 | có | R2 → "can’t get up" → **R7, 998**, cờ CT đầu, bước cuối 8 |
| `hypo` | Saeed Al Nuaimi (69, nam, tiểu đường, CGM) | an toàn | 160 / 02:40 | có | R3 → trả lời rõ → **R9**, đường nhanh tại nhà, bước cuối 6 |
| `hf` | Mariam Al Shamsi (81, nữ, suy tim) | an toàn | 490 / 08:10 | không | R4 → "3 pillows" → **R10**, điều dưỡng trong ngày, bước cuối 6 |
| `own` | Mặc định Moza; chọn được 9 người | an toàn | 72 (đêm) hoặc 490 (sáng) | có nếu bắt đầu trước 06:00 | **R12**, không làm gì, dừng ở bước 0 |

Đồng hồ: phút tính từ 15 Oct 2026 00:00, không múi giờ. `hm(72)` = "01:12".

**Chín người** (`data/people.ts`; mã bệnh nhân = `P-` + (1000 + thứ tự): moza P-1000, hessa P-1001, saeed P-1002, mariam P-1003, hind P-1004, khalid P-1005, arjun P-1006, hamad P-1007, amna P-1008):

| Người | Tên gọi (`call`) | Người liên hệ 1 (`f1`) | Người liên hệ 2 (`f2`), khoảng cách | Thuốc | Tiền sử | "Bình thường" (`usual`) | Nơi điều trị |
|---|---|---|---|---|---|---|---|
| Moza Al Hammadi, 78F | Umm Khalid | Khalid (son, Al Ain) | Hamad (brother), 450 m | Amlodipine 5 mg · aspirin 100 mg · atorvastatin 20 mg | High blood pressure (2023) · dehydration admission (2024) · wrist fracture (2025) | Heart 58–64 asleep · speech score 0.94 | Corniche Stroke Centre |
| Hessa Al Ketbi, 82F, **chống đông** | Umm Saif | Saif (son, night shifts) | Noura (neighbour, has a key), 60 m | Apixaban 5 mg twice a day · amlodipine 5 mg · alendronate weekly | Atrial fibrillation (2022) · cataract surgery (2023) · osteoporosis (2024) | 1 bathroom trip a night · speech score 0.92 | Capital General Hospital |
| Saeed Al Nuaimi, 69M, tiểu đường, CGM | Abu Rashid | Shamsa (wife, asleep next door) | Rashid (son), 2 km | Insulin glargine 24 units at night · metformin 1 g twice a day | Type 2 diabetes (2011) · insulin since 2021 · kidney function mildly reduced (eGFR 52) | Night glucose 5–8 mmol/L · speech score 0.95 | Capital General Hospital |
| Mariam Al Shamsi, 81F, suy tim | Umm Ahmed | Ahmed (son) | Latifa (daughter), 1 km | Furosemide 40 mg morning · bisoprolol 2.5 mg · ramipril 5 mg | Heart failure (2024, pumping 35%) · admission for fluid build-up (Mar 2026) | Dry weight 61.0 kg · oxygen 95–97% · speech score 0.93 | Capital General Hospital |
| Hind Al Mansoori, 18 tháng F | Hind | Maitha (mother, nurse on shifts) | Amna (grandmother) | None | Born at term · 15-month visit done · 18-month visit overdue | Growing on the 50th centile | Al Khalidiya Family Health Centre |
| Khalid Al Mansoori, 47M | Abu Maitha | Amna (wife) | Moza (mother) | None | No check-up in 4 years, IFHAS never done · mother: stroke and atrial fibrillation · father: heart attack at 62 · smokes medwakh | Logistics supervisor, long shifts; feels fine | Al Khalidiya Family Health Centre |
| Arjun Nair, 4 tháng M | Arjun | Priya (mother, moved to Abu Dhabi 2 months ago) | Vikram (father) | None | Born in Kochi · 2-month vaccines given in India | Feeding well | Mussafah Family Health Centre |
| Hamad Al Hammadi, 74M | Abu Saeed | Khalid (nephew) | Moza (sister, 450 m), 450 m | Amlodipine 5 mg | High blood pressure · stopped driving in 2025 · IFHAS screening last done 2019 | Walks to the mosque every day | Al Bateen Family Health Centre |
| Amna Al Mansoori, 45F | Umm Maitha | Khalid (husband) | Maitha (daughter) | None | Diabetes in pregnancy (2001, 2005) · HbA1c 5.9% in March 2026 | Teacher | Al Khalidiya Family Health Centre |

#### 3.0.2 Guardrail đầu vào (áp cho mọi case)

| Tình huống | Hành vi |
|---|---|
| Giá trị thiếu (null, rỗng, không phải số hữu hạn) | `missing`: lỗi `required`. Thông báo: `{{label}} is needed. Enter a number.` |
| Case an toàn, case phòng ngừa, ô kết quả phòng ngừa: ngoài khoảng | **Từ chối** (policy `reject`): giữ giá trị hợp lệ trước đó, lỗi `required` cho tới khi nhập giá trị hợp lệ. Thông báo: `{{label}}: {{value}} is outside the plausible range {{min}} to {{max}} and was not accepted. Enter a value in that range.` |
| Hồ sơ gia đình và kết quả gia đình: ngoài khoảng | **Kẹp về biên** (policy `clamp`), cảnh báo `recommended`: `{{label}}: {{value}} is outside {{min}} to {{max}}, so {{applied}} is used.` |
| Trong khoảng | Làm tròn về bước (step) tính từ min. |
| Giá trị ngoài khoảng tìm thấy trong state | `required`: `... Correct it before Noa decides.` |
| Đường huyết null với người có tiểu đường hoặc CGM | Cảnh báo `recommended`: `No glucose reading: Noa cannot check for low sugar (rule R3) until the sensor is on.` |
| Người lớn được chấm Framingham (30–74, không cvd) chưa có cholesterol | `Cholesterol is not measured yet, so Noa uses BMI for the heart score.`; chỉ có một trong tc/hdl: `Only one of total and HDL cholesterol is entered, so Noa uses BMI for the heart score.` |

Khi còn lỗi `required`: `play()`, `checkPassport()`, `sendResult()`, `famSendResults()` **không làm gì**. Giao diện hiện nhãn `Required` / `Warning` và câu `Noa cannot run until the value above is fixed.`. Lỗi `required` luôn thắng cảnh báo trên cùng ô (đã sửa sau benchmark T-glu-02/T-glu-40). Mọi đầu vào an toàn bị khóa sau khi bấm Play (`setInput` trả `{ok:false}` khi phase khác `setup`).

#### 3.0.3 Khung case phòng ngừa (dùng cho `wellchild`, `ifhas`, `expat`, `bone`)

**Bước 0 `passport`** (mode Individual, nhãn `Passport`, tiêu đề `Family Health Passport`, hold `Guardian → Voice`, decides `The family decides: book, change or say no.`, flow `Passport → Guardian → Voice` và thêm `Navigator` khi đã có hành trình). Agent:
- Guardian: `Watches the Family Health Passport: what is due, for whom, how late` · `Checks eligibility first: age, nationality, life stage`
- Voice: `Asks one question to find the barrier, instead of sending another reminder`
- Insight: `Brings in what makes this check matter for this family`

**Đầu vào** (thẻ passport): tuổi (trẻ: tháng, khoảng 0–84; người lớn: năm, 16–85), `Weeks overdue` 0–26, `Reminders already sent` 0–6, quốc tịch Emirati/Expatriate (chỉ hiện với người lớn). Giới tính lấy từ người của case, không nhập.

**Diễn biến bước 0** (`checkPassport()` → `chooseBarrier(id)`):
1. Kiểm tra đủ điều kiện (`dueNow`):
   - Trẻ: tuổi > 72 tháng → P2 `Well-child visits run from 1 month to 6 years, and {{n}} is older, so there is nothing to nudge.`; < 1 tháng → P2 `The first well-child visit is at 1 month. Nothing is due yet.`; còn lại: lần khám đến hạn = mốc lớn nhất ≤ tuổi trong 14 mốc `1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60, 72` tháng. **Không kiểm quốc tịch với trẻ.**
   - Người lớn: không phải Emirati → P2 `IFHAS screening is for Emiratis aged 18 to 75, so Noa does not nudge {{n}} for it. The passport shows only what applies.`; tuổi < 18 hoặc > 75 → P2 `IFHAS screening is for ages 18 to 75, so Noa does not nudge {{n}} for it. {{Her}} own doctor follows {{her}} care.`; còn lại: các nhóm IFHAS đến hạn: ≥ 18 `Metabolic: HbA1c, cholesterol` và `Heart: blood pressure, risk score`; ≥ 45 `Cancer: bowel test`; nữ ≥ 40 `Cancer: breast`; nữ 25–65 `Cancer: cervical`; nữ ≥ 50 hoặc nam ≥ 70 `Bone: density scan`; ≥ 65 `Memory check`.
   - **`overdue` và `rem` không đổi quyết định**; ai đủ điều kiện đều là "đến hạn". Chúng chỉ đổi câu log và dòng kiểm.
2. P2: phase `decided`, quyết định `Nothing to nudge`, log `PASSPORT Noa Guardian · <lý do>`, audit actor Guardian. Case dừng ở bước 0.
3. Đủ điều kiện (P1): ghi `observations` (`Due: <item>` hoặc `Due: <item> · overdue N weeks`), log `PASSPORT ...` và `ASK Noa Voice → {{addr}}: one question to find the barrier, instead of reminder {{rem+1}}`. Thẻ hiện câu hỏi `Noa Voice: “{{addr}}, {{poss}} {{item}} is {{n}} weeks overdue. Is something making it hard?”` (hoặc `... is due. Is something making it hard?`), và 6 lựa chọn `What is making it hard?`. `{{addr}}` = mẹ/cha với trẻ (f1), chính người đó với người lớn.
4. Người xem chọn rào cản (ở phút bắt đầu + 3):

| Rào cản (id) | Câu người dân nói | Luật | Cách hỗ trợ (enabler · tag) | Câu Voice đề nghị đặt lịch |
|---|---|---|---|---|
| `awareness` | “I didn’t know it was due” | P3 | Know what is due · Connected journey | `Here is what is due and why, in plain words: {{list}}. I can book {{slot}}.` |
| `access` | “The times or the travel don’t work for us” | P4 | Easy access and booking · Participation enabler | `I found {{slot}}. Shall I book it?` |
| `trust` | “I’m not sure about it / I’d like a female doctor” | P5 | Trusted, culturally appropriate engagement · Personalised outreach | `Would {{slot}} suit you? You are welcome to bring someone with you.` |
| `value` | “I feel fine, so why test?” | P6 | Personalised outreach · Why it matters for them | `{{why}} Shall I book {{slot}}?` (`{{why}}` = câu riêng của case nếu có, nếu không `These checks find problems years before you feel anything.`) |
| `forgot` | “I just forgot” | P7 | One reminder is enough · No barrier | `No problem. Shall I book {{slot}}?` |
| `decline` | “I don’t want it right now” | P8 | Respect the choice · Preserve meaningful choice | (không đặt lịch) |

   - P3–P7: log `ANSWER {{addr}}: “…”`, ghi `alerts` vàng `<item> due` / `<rule> <name>` / Navigator / trạng thái `booking offered`, log `DECIDE Noa agents decide · <rule> → <name> (not another reminder)`, audit, hành trình `prev` 7 bước mở ra.
   - P8: quyết định `Respect the choice`, lý do `{{addr}} said not now. Noa records the choice, sends no more reminders for 3 months, and keeps it in the passport for whenever {{addr}} is ready.`, ghi `tasks` `Choice recorded: not now` / `no reminders until <ngày + 90 ngày>`, log `CHOICE Noa Navigator · choice recorded; reminders paused for 3 months`. **Không có hành trình**; case dừng ở bước 0.
   - `{{slot}}` = slot riêng của case theo rào cản (bảng trong từng chương; thiếu slot thì dùng slot `access`).

**Hành trình `prev` (7 bước, giống nhau cho 4 case; chữ riêng của case nằm trong từng chương; nguyên văn ở Phụ lục C)**

| # | kind | mode | Nhãn · tiêu đề | Khi nào | Hold | Agent và câu thoại | Chuỗi hand-off | Ai quyết định | Người xem làm gì | Ghi vào DB / log |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | btn | ind | `Book` · `Booked in one tap` | m+2 | `Navigator → family` | Navigator: `Finds the slot that removes the barrier` · `Adds it to the family calendar, with one reminder only`; Voice: `Says it in Arabic or English, the way the family prefers` | Voice → Navigator → {{addr}} | `{{addr}} chooses: book, change or say no.` | Bấm `Book it` | `encounters` (`Booked: {{slot}}`), log `ACT Book it · Booked: {{slot}}`, audit actor hospital |
| 2 | tl | hosp | `Visit` · `The visit` | d4 09:00 | `Clinic` | Courier: `Sent the passport and history before the visit` · `Files each result into the record` | Courier → Clinic team | `The clinicians do the checks.` | Bấm `Next update →` cho từng dòng khám (4 dòng) | mỗi dòng: `encounters` + log `RECORD <tiêu đề> · <chi tiết>` |
| 3 | result | hosp | `Result` · `Result routed` | d4 12:00 | `Insight → team` | Insight: `Reads the result against the threshold` · `Routes it to the right team, or to the passport if all is well` | Clinic → Insight → Team or passport | `A clinician confirms what the result means.` | Kéo thanh trượt kết quả (bị từ chối nếu ngoài khoảng), xem trước `At {{v}} Noa would route it to {{team}}.` / `At {{v}} Noa would add it to the passport.`, bấm `Send the result` | `observations` (giá trị); nếu chuyển tuyến: `alerts` vàng luật **P9** + log `ROUTE Noa Insight · <label> <v> → <team>`; nếu khỏe: log `ROUTE Noa Insight · <label> <v> → healthy · passport: <next>` |
| 4 | refer | hosp | `Care` · `From result to care` | d5 09:00 | `Navigator → team` | Navigator: `Puts the referral on the team’s worklist with the result`; Courier: `Sends the record` | Navigator → Courier → {{team}} | `The team decides the plan.` | Nếu chuyển tuyến: hàng đợi `The doctor’s review queue` (`Approve and accept the referral` / `Change` / `Call the patient`; chỉ nút đầu ghi vào DB) hoặc `Accept the referral` ở Noa panel. Nếu khỏe: bước **tự xong**, chữ `Nothing to refer: the result is healthy.` | Chuyển tuyến: alert P9 → `accepted`, `tasks` `<team>: <t>` / câu refer của case, log `ACCEPT <team> accepted · <câu refer>`, bảng tin gia đình |
| 5 | teach | ind | `Explain` · `Noa explains` | d5 18:00 | `Coach → {{addr}}` | Coach: `Explains the result out loud, in Arabic or English` · `Checks understanding; simpler words if needed` | Coach → {{addr}} | `{{addr}} decides who in the family sees it.` | Teach-back (bộ theo kết quả, mục 6.3), chọn f1/f2 được xem, `Send the plan home` | `checkins` (teach-back passed, first/second try) + log `CHECK Noa Coach · teach-back passed`; sau 20 phút: `consents.family_circle` cập nhật, `tasks` kế hoạch, log `CONSENT {{n}} chose who sees the plan: …` |
| 6 | tl | ind | `Follow up` · `Until it’s done` | d12 10:00 | `Navigator → passport` | Navigator: `Follows up until the care is done` · `Adds the next due items to the passport`; Guardian: `Watches the passport for the next due date` | Navigator → Guardian → Passport | `The family keeps control of every booking.` | `Next update →` cho từng dòng (dòng `follow.refer` hoặc `follow.ok`) | mỗi dòng: `tasks` + log `STEP …` |
| 7 | report | gov | `Department` · `Report to the Department` | d16 09:00 | `Analyst → DoH` | Analyst: `Counts participation, barriers and reminders per visit` · `Removes names: this family is one anonymous case` | Analyst → Health centre → Department of Health | `The health centre signs off the report.` | `Send the monthly report` | `reports` RPT-2026-10 (`Measures only, no names`, `yes, anonymous`), log `POST Noa Analyst drafted, hospital signed off · <title> report → Department of Health`, audit, Noa panel chuyển sang tab Government |

Màn hình theo bước (phòng ngừa): Phone hiện `Family Health Passport`, ô `Due` / `Overdue` / `Reminders` / `Support`, câu `Is something making it hard to go?`, rồi banner bước (`Booked` / slot; `At {{hosp}}` / `Noa updates the passport as you go.`; `Result` `Your clinic will contact you this week.` hoặc `Healthy. Added to your passport.`; `Noa Coach`; `All done` / `Next check is in your passport.`). Web hiện `Family Health Passport`, `Screenings, upcoming tests and care gaps`, các dòng gia đình của case và `Family updates` (`{{f1s}}: Booked: {{slot}}`, `{{f1s}}: At the clinic now.`). Noa panel hiện `Clinic view`: đặt lịch, `Results · {{hosp}}`, `Noa Insight routed to`, `Worklist · {{team}}`, rồi KPI Government ở bước 7.

**Dòng tự kiểm phòng ngừa** (`Right action, right time?`): P2 → `Checked eligibility before sending anything` + `No nudge for a programme that doesn’t apply`. Còn lại: `Asked about the barrier after {{rem}} reminder(s) instead of sending reminder {{rem+1}}` (hoặc `Asked about the barrier before any reminder` khi rem = 0). P8 thêm `Choice recorded: no more nudges for 3 months` + `The passport keeps it there; nothing is hidden`. P3–P7 thêm `Matched the support to the barrier: {{name}}`, `Booking offered in one tap, near home`, `Choice preserved: {{addr}} can change or cancel`. `expat` thêm `Did not nudge Priya or Vikram for IFHAS: it is for Emiratis aged 18–75`. `wellchild` với rào cản `access` thêm `One trip for the family: Khalid’s overdue screening booked 30 minutes later`.

**Mốc thời gian mặc định** của cả 4 case: bắt đầu 20 Oct 18:30, quyết định 18:33, đặt lịch 18:35, khám 24 Oct 09:00, kết quả 24 Oct 12:00, chuyển tuyến 25 Oct 09:00, teach 25 Oct 18:00 (kế hoạch 18:20), theo dõi 1 Nov 10:00, báo cáo 5 Nov 09:00.

#### 3.0.4 Khung case an toàn (dùng cho `stroke`, `fall`, `hypo`, `hf`, `own`)

**Bước 0 `home`** (mode Individual, nhãn `Alert`, tiêu đề `At home`, hold `Guardian → Voice`, decides `At home, the agents only decide how to respond. They never diagnose.`; flow `Sensors → Guardian → Voice`, thêm agent đầu tiên của hành trình khi đã quyết định). Agent:
- Guardian: `Watches heart rate, movement, falls, glucose, weight and oxygen against {{her}} own normal` · `Applies rules R1 to R4 and starts a voice check only when one is met`
- Voice: `Calls {{n}} and runs the speech check` · `Asks one question about what Guardian found`

**Đầu vào** (khóa sau khi bấm `Play`):

| Trường (nhãn trên thẻ) | Điều khiển | Khoảng / bước | Ghi chú |
|---|---|---|---|
| `Heart rate from {{at}}` (bpm, từ phút thứ 10) | thanh trượt + ô nhập số | 45–180 / 1 | |
| `How long it stays` (phút) | thanh trượt | 0–20 / 1 | |
| `Movement`: `Not moving` / `Moving` | công tắc | boolean | |
| `Fall detected`: `No` / `Yes` | công tắc | boolean | Bật lên khi floor đang 0 thì đặt floor = 6 |
| `Time on the floor` (phút) | thanh trượt, chỉ hiện khi có té | 0–30 / 1 | Không kiểm khi không té |
| `Glucose sensor`: `Off` / `On` | công tắc | On đặt glu = 5,6; Off đặt null | |
| `Glucose` (mmol/L) | thanh trượt, chỉ hiện khi bật cảm biến | 1,5–15 / 0,1 | null luôn hợp lệ |
| `Blood oxygen` (%) | thanh trượt | 80–100 / 1 | |
| `Weight change in 3 days` (kg) | thanh trượt | −2 đến 4 / 0,1 | |
| Chỉ `own`: `Person` | 9 chip người | | Đổi người thì tạo lại database |
| Chỉ `own`: `Time` | `Night 01:12` / `Morning 08:10` | | |
| Ngôn ngữ | EN / AR | | Đổi câu kiểm tra giọng nói và teach-back |

**Phát lại từng phút** (`play()`, `playTick()`, giao diện gọi mỗi 90 ms):
- Phút cuối = `10 + max(dur, (fall ? floor : 0), 1) + 6`, tối đa 40 tick.
- Ở phút m: "đang trong cơn" khi `10 ≤ m < 10 + dur`. Nhịp tim đọc được = `round(hr + (rand − 0,5) × 6)` trong cơn, ngoài cơn `round((still ? 60 : 84) + (rand − 0,5) × 5)`. Tức là **nhiễu ±3 bpm** quanh giá trị nhập (seed cố định).
- Từ phút 10: m = 10 và đường < 4 → trigger **R3**; nếu không, m = 10 và (cân nặng ≥ 2 hoặc SpO2 ≤ 92) → **R4** (R3 ưu tiên trong cùng phút); có té và floor ≥ 2, m = 12, chưa có trigger → **R2**; số phút liên tiếp gần nhất có nhịp > 120 và không di chuyển ≥ 10, chưa có trigger → **R1**.
- Biến boolean dùng cho thang quyết định được tính **từ đầu vào**, không từ phát lại: `hr = hr > 120 && still && dur ≥ 10`; `fall = fall && floor ≥ 2`; `hypo = glu ≠ null && glu < 4`; `hypoS = glu < 3` (tính nhưng **không dùng**); `hf = wt ≥ 2 || spo2 ≤ 92`; `spo2c = spo2 < 90`.
- Hết phát lại mà không trigger: phase `decided`, quyết định **R12 `No action`**, log `WATCH Noa Guardian · no rule met · <lý do>`, audit `No action`. Lý do: `All readings are within {{her}} normal range. No rule met, so nobody is woken.` hoặc `Noticed: <ghi chú>. No rule met, so nobody is woken.` với ghi chú `fast heart rate while moving (expected)` (hr > 120 và đang di chuyển), `fast heart rate settled after {{min}} min` (hr > 120 và dur < 10), `fall, but up again within 2 minutes` (té và floor < 2). Không gọi ai, không có hành trình.

**Khi có trigger** (phút tTrig): tCheck = tTrig + 1, phase `check`. Câu hỏi được chọn theo ưu tiên **fall > hypo > hf > hr** (chú ý: có té thì luôn hỏi câu té ngã, kể cả khi R3 là trigger). Ghi `observations` (dòng đọc: `heart rate above 120 for 10 min while still` / `fall detected, still on the floor after 2 min` / `glucose {{glu}} mmol/L` / `weight up {{wt}} kg / oxygen {{spo2}}%`), log `DETECT Noa Guardian · rule <R> met: <dòng đọc> → hand-off to Noa Voice`, log `ALERT Noa Guardian → {{f1s}} and {{f2s}}: “Noa is checking on {{n}}.”` và bảng tin `Safety alert: “Noa is checking on {{n}} now.”` (**bỏ qua với Mariam khi trigger là R4**), log `ASK Noa Voice calls {{n}}: “<câu hỏi>”`, audit `Rule <R> met`, pipeline nút 0–2.

**Câu hỏi và lựa chọn trả lời** (`data/questions.ts`):

| Câu hỏi (qk) | Câu Noa Voice hỏi | Lựa chọn (id: nhãn) |
|---|---|---|
| fall | `{{n}}, I felt a hard fall. Can you get up on your own?` | `ok`: “I’m fine, I can get up” · `cant`: “I can’t get up, my hip hurts” · `none`: No answer |
| hypo | `{{n}}, your sugar is low. Can you drink the juice by your bed?` | `drink`: “Yes, drinking it now” · `confused`: Confused, mixed-up answer · `none`: No answer |
| hf | `{{n}}, your weight is up. Are you more breathless than usual?` | `pillows`: “A bit. I needed 3 pillows last night” · `rest`: “Very breathless, even sitting still” · `fine`: “I feel fine” |
| hr | `{{n}}, are you all right? I noticed your heart racing.` | `fine`: “I’m fine, I couldn’t sleep” · `none`: No answer |

**Bài kiểm tra giọng nói** (chi tiết thuật toán mục 6.1): thẻ hiện `{{at}} · Noa Voice: “{{q}} Please say after me:”` và câu mẫu `My name is {{n}} and I live in Abu Dhabi` (AR: `اسمي {{nar}} وأعيش في أبوظبي`). Người xem nói qua micro (`Say it now` / `Done`), gõ, hoặc dùng mẫu: `Use slurred speech`, `Use {{n}}’s usual speech`, `No answer`. Kết quả ghi `checkins` + log `CHECK Noa Voice · speech check: <as usual | a little different | clearly changed> (score x.xx)` hoặc `speech check: no answer`. Thẻ hiện số từ rõ, thời gian (chuẩn 4,5 s), từ/phút, và dòng G3 so sánh với điểm "usual" của người đó. Không nói gì → câu trả lời tự đặt là `none`.

**Quyết định** (`decide()`, cần kết quả giọng nói và, nếu có nói, một câu trả lời). tAct = tCheck + 2. Thang `choosePath`, **dòng đầu tiên khớp thắng** (noAns = không nói gì hoặc trả lời `none`; sRed = giọng mức đỏ, điểm < 0,6):

| # | Điều kiện | Hành trình | Luật | 998? |
|---|---|---|---|---|
| 1 | hypo và (sRed hoặc noAns hoặc `confused`) | `hypo_em` | R6 | có |
| 2 | hypo | `hypo_home` | R9 | không |
| 3 | fall và (`cant` hoặc noAns) | `fall_em` | R7 | có |
| 4 | hf và noAns | `hf_em` | R8 | có |
| 5 | sRed hoặc (hr và noAns) | `stroke_em` | R5 | có |
| 6 | spo2 < 90 hoặc trả lời `rest` | `hf_em` | R8 | có |
| 7 | fall | `fall_minor` | R11 | không |
| 8 | hf | `hf_clinic` | R10 | không |
| 9 | còn lại | đứng xuống (`Stand down`), ghi luật **R1**, `standdown: true` | R1 | không |

- Có hành trình: ghi `alerts` (đỏ cho `_em`, vàng còn lại; đội: `Emergency services and hospital` / `Heart failure nurse` / `Falls clinic` / `Family doctor`), log `DECIDE Noa agents decide · <rule> → <tên hành trình>`, audit `Decision <rule>`, pipeline nút 4. Thẻ hiện `Noa’s decision · <rule> · <name>` và với `_em`: `998 (UAE ambulance) called at {{at}}. The rest of the journey follows.` (`{{at}}` = tAct + 2); với nhánh không cấp cứu: `Next: <tiêu đề bước 1>.`
- Đứng xuống: quyết định `Stand down`, lý do `{{n}} answered clearly and {{her}} speech is normal. Noa stands down and tells {{f1s}} and {{f2s}} {{she}} is fine.`, bảng tin `All clear: {{n}} answered clearly. {{She}} is fine.`, log `STAND Noa Voice · speech normal, answer clear → stand down; family told`, audit actor Voice. Thực tế chỉ tới được từ trigger R1.

**Cơ chế các bước sau** (giống nhau cho mọi hành trình an toàn):

| kind | Người xem làm gì | Engine ghi gì |
|---|---|---|
| `tl` | `Start` rồi `Next update →` cho từng dòng timeline (dòng có phút lệch so với giờ của bước) | mode hosp: `encounters` + log `RECORD <tiêu đề> · <chi tiết>`; mode ind: `tasks` + log `STEP …`. Xong khi hiện hết. Sau bước 1 của hành trình `_em`: audit `998 call` / `Operator took over` (actor Responder) |
| `btn` | Đọc gói hồ sơ (`Read what arrived on the hospital screen, then:`) rồi bấm nút của bước (đóng vai đội chăm sóc) | `encounters` (câu done), log `ACT <nút> · <done>`, audit actor hospital |
| `teach` | Nghe/đọc lời giải thích của Coach (`Listen`, `Simpler words`, EN/AR riêng của thẻ), trả lời câu teach-back, chọn f1/f2 được xem kế hoạch (`{{n}} chooses who sees the plan`), bấm `Send the plan home` | Trả lời đúng: `checkins` teach-back `passed` (`first try` / `second try`) + log `CHECK Noa Coach · teach-back passed` (hoặc `... passed on the second try`); sai: log `CHECK Noa Coach · teach-back: not yet · explains more simply`, hiện câu `wrong` tương ứng và bản đơn giản. Gửi kế hoạch (giờ của bước + 20 phút): `consents.family_circle` = người đã chọn (hoặc `nobody`), `tasks` `Plan in the phone app: …`, log `CONSENT {{n}} chose who sees the plan: …`. Xong khi cả hai việc đã làm |
| `recheck` | Nhập đường huyết 15 phút sau (mặc định 5,1), bấm gửi | Xem chương `hypo` |
| `daily` | Làm bài giọng nói buổi sáng (`Good morning, {{n}}. Please say this for me.`, mẫu `usual` / `slurred`), nhập số đo hôm nay, `Send today’s reading` | `checkins` + log CHECK; `observations` số đo; đạt mục tiêu: log `CHECK Noa Navigator · <label> <v> <unit> is on target (<target>) → no alert`; không đạt: `alerts` vàng (finding, `target …`, đội) + log `ROUTE Noa Navigator · <finding> → <team>` + bảng tin `Noa sent {{n}}’s readings to {{team}}.`. Bước tự xong khi đã gửi và giọng buổi sáng **không đỏ** (đỏ: thẻ báo `In real use, a failed speech check here would start the emergency path again. Use the usual speech to continue this case.`) |
| `accept` | Đóng vai bác sĩ: `Accept and act` | Có cảnh báo vàng: alert → `accepted`, `tasks` `<act> (the clinician decides)`, log `ACCEPT <team> accepted the alert · <act>`, bảng tin `{{n}}’s care team changed the plan; Noa explained it to {{herO}}.`. **Không có cảnh báo** (số đo đạt mục tiêu): bước tự xong, thẻ hiện `Nothing to act on` |
| `report` | `Send the monthly report` | `reports` RPT-2026-10, log `POST Noa Analyst drafted, hospital signed off · <title> report → Department of Health`, audit actor hospital, Noa panel chuyển sang Government, pipeline nút 5–6 |

**Theo dõi hằng ngày (bước `daily`) theo hành trình:**

| Bộ daily | Số đo (`label`) | Mặc định | Khoảng | Đạt khi | Câu phát hiện khi không đạt (`finding`) | Đội | Việc bác sĩ làm (`act`) |
|---|---|---|---|---|---|---|---|
| stroke | `Morning blood pressure, 5-day average` (mmHg) | 146 (**không đạt**) | 100–190 | < 130 (`under 130`) | `Blood pressure above target for 5 days: average {{v}} mmHg, with every dose taken` | `Stroke clinic · Dr Omar Haddad` | `Review the perindopril dose` |
| fall | `Blood pressure drop on standing` (mmHg) | 22 (**không đạt**) | 0–40 | < 20 (`under 20`) | `Blood pressure drops {{v}} mmHg when {{she}} stands, still the likely cause of falls` | `Family doctor · Dr Fatima Al Ali` | `Review amlodipine (may stop it)` |
| hypo | `Lowest night glucose, last 7 nights` (mmol/L) | 4,6 (**đạt**) | 2–10 | ≥ 4 (`4.0 or above`) | `Night glucose fell to {{v}} mmol/L this week, even on the lower insulin dose` | `Diabetes clinic · Dr Aisha Al Hosani` | `Review the insulin dose again` |
| hf | `Morning weight vs dry weight` (kg) | 0,4 (**đạt**) | −2 đến 4 | ≤ 1 (`up to +1.0`) | `Weight is {{v}} kg above dry weight for 3 mornings` | `Heart failure nurse Rania` | `Adjust the water tablet dose` |

Lưu ý: số đo daily **không qua guardrail** của engine (`setDailyVal` không kiểm khoảng; khoảng chỉ giới hạn thanh trượt giao diện).

**Dòng tự kiểm an toàn** (`Right action, right time?`):
- R12: `No rule met, so nobody was woken at night`; thêm `A fast heart rate while moving (stairs) is expected, so no alert` nếu hr > 120 và đang di chuyển.
- Có trigger: `Rule {{rule}} met at {{tTrig}}; Noa Voice checked at {{tCheck}} ({{lag}} min, target ≤ 1)`; trigger R1 thêm `Waited for the full 10 minutes before waking {{n}}, so a short spike wakes nobody`.
- Đứng xuống: `Speech normal and answer clear: no ambulance, family told {{she}} is fine`.
- `_em`: `998 called at {{tAct+2}}, {{tAct+2−tCheck}} min after the check (target ≤ 3)` (luôn in **4 min**, vượt mục tiêu của chính nó: mục 12).
- Theo hành trình: `hypo_em` `Low sugar can look like a stroke, so Noa checked glucose first and did not start a stroke alert`; `hypo_home` `Answering clearly, so no ambulance: fast sugar now, recheck at {{tAct+15}}`; `fall_em` và người dùng thuốc chống đông `On a blood thinner: head CT flagged before arrival`; `fall_minor` `Up and talking clearly: no ambulance, fall-risk review booked`; `hf_clinic` `Breathless only lying flat: same-day nurse, not 998`; `stroke_em` `Last known well {{start+10}} sent ahead for the stroke team`; leo thang hypo `Two rechecks stayed below 4.0, so Responder called 998 at once`.

**Biến thể cho người dùng thuốc chống đông**: một số dòng timeline và gói hồ sơ có bản `anticoag` (ghi `[ANTICOAG: …]` trong Phụ lục A) thay thế khi người đó dùng thuốc chống đông (trong 9 người chỉ Hessa).

**Chế độ đêm**: giao diện tối khi case là ca đêm (`own` chỉ khi bắt đầu trước 06:00), ở bước 0 sau khi bấm Play, và ở các bước 1..`nightUntil` của hành trình (stroke_em, fall_em, hypo_em: tới bước 3; fall_minor, hypo_home: tới bước 1; hf_clinic, hf_em: không bao giờ).

**Bảng KPI Government** (bước report, `data/report.ts`): số cố định minh họa, không tính từ dữ liệu, **không áp luật ẩn nhóm nhỏ**. Tiêu đề: `Stroke pathway`, `Falls pathway` (fall và fallm), `Diabetes: night hypoglycaemia` (hypo, hypoe), `Heart failure` (hf, hfe), `Well-child visits (1 month to 6 years)`, `IFHAS screening (Emiratis 18–75)` (ifhas, ifhas2), `Family Health Passport`.

---

<a id="c-family"></a>
### 3.1 `family`: Cả gia đình (The whole family)

**Câu chuyện và nhân vật.** Gia đình Al Mansoori, 8 người, 4 thế hệ, hồ sơ nằm ở 6 nơi (`Corniche Stroke Centre`, `Al Bateen FHC`, `Capital General Hospital`, `Al Khalidiya FHC`, `Capital Women’s Hospital`, `School health`). Khalid (47) là người gốc của case (`S.pk = khalid`). Câu một dòng: `One Family Health Passport shows four generations across six places, and Noa’s agents reach each person in the way that works for them.` Câu "How might we": `How might we give a family one passport, and each member one personal, one-tap next step?`

| id | Quan hệ | Thế hệ | Hồ sơ mặc định (chỉnh được) | Trạng thái đầu | Nguồn hồ sơ | Cách tiếp cận |
|---|---|---|---|---|---|---|
| moza | Grandma (Khalid’s mother) | 1 | 78F, SBP 146 có uống thuốc, không hút, không tiểu đường, TC 4,2, HDL 1,4, BMI 26, **cvd có** (đã đột quỵ) | `alert` | Corniche Stroke Centre, Al Bateen FHC | `Arabic voice call; calls her Umm Khalid` |
| saeed | Grandpa (Amna’s father) | 1 | 69M, SBP 136, tiểu đường, TC 4,6, HDL 1,0, BMI 30, xu hướng SBP +2/năm | `overdue` | Capital General Hospital | `Phone call; his son Rashid helps` |
| khalid | Dad, logistics supervisor | 2 | 47M, SBP 132, hút thuốc, chưa đo TC/HDL, BMI 29, xu hướng SBP +3, BMI +0,5 | `overdue` | Al Khalidiya FHC | `Short message: what it means for him` |
| amna | Mum, teacher | 2 | 45F, SBP 124, TC 5,3, HDL 1,3, BMI 28, xu hướng +1 / +0,3 | `due` | Al Khalidiya FHC, Capital Women’s Hospital | `In the app, one tap, family calendar` |
| maitha | Daughter, nurse on shifts | 3 | 25F, SBP 112, chưa đo TC/HDL, BMI 24, 0 / +0,2 | `due` | Al Khalidiya FHC, Capital Women’s Hospital | `In the app, after night shifts` |
| sultan | Son, university student | 3 | 21M, SBP 124, hút (vape), chưa đo TC/HDL, BMI 26, +1 / +0,6 | `overdue` | Al Khalidiya FHC, University clinic | `Short message only, evenings` |
| hind | Granddaughter (Maitha’s) | 4 | trẻ, 18 tháng, trễ 3 tuần | `overdue` | Al Khalidiya FHC, Capital Women’s Hospital | `Through Maitha` |
| hamdan | Grandson (Maitha’s) | 4 | trẻ, 60 tháng, trễ 0 | `ok` | Al Khalidiya FHC, School health | `Through Maitha` |

Mọi người lớn đều là Emirati. Mối liên hệ gia đình ban đầu (Insight): **C1** Moza đột quỵ + rung nhĩ → `Blood pressure and heart rhythm added to Khalid’s checks`; **C7** người cha quá cố Abdullah nhồi máu cơ tim năm 62 tuổi → `Not part of the Framingham score, so Noa Insight shows it next to the forecast`; **C2** Saeed tiểu đường type 2 → `HbA1c moved up for Amna; first HbA1c for Maitha and Sultan`; **C3** Amna tiểu đường thai kỳ → `Maitha’s sugar checked in any pregnancy; Hind’s growth watched`; **C6** 4 việc khám cùng một phòng khám → `One Saturday trip instead of four`. Phát sinh sau: **C8** (đặt lịch Sultan khi Khalid còn hút) `Quit support offered to both, together if they want`; **C4** (TC của Khalid ≥ 7,5) `Cholesterol test for his children: possible inherited high cholesterol`; **C5** (HbA1c của Khalid bị chuyển tuyến) `A family eating and activity plan; Amna joins the lifestyle programme`.

**Mục tiêu của case (chứng minh gì cho giám khảo).** Một passport cho cả nhà; mỗi người một bước tiếp theo một chạm, theo cách hợp với họ; một chuyến đi khám cho nhiều người; kết quả của người này đổi việc khám của người khác; Framingham chỉ chấm khi hợp lệ; "Not now" được tôn trọng; vòng chăm sóc đóng cho cả gia đình chứ không từng người.

**Đầu vào người xem chỉnh được** (bước 0, bộ chỉnh hồ sơ: chạm vào một người trên cây gia đình). Gia đình dùng policy **kẹp về biên** (không từ chối):

| Trường | Áp cho | Khoảng / bước |
|---|---|---|
| age | người lớn | 18–90 / 1 |
| sex | người lớn | M / F (`setSex`) |
| sbp | người lớn | 90–200 / 1 |
| bpTx, smoker, dm, cvd, emirati | người lớn | bật/tắt (`toggleProfile`) |
| `labs` | người lớn | bật: TC 5,2 / HDL 1,2; tắt: cả hai null |
| tc | người lớn | 2,5–10 / 0,1 |
| hdl | người lớn | 0,5–3 / 0,1 |
| bmi | người lớn | 16–45 / 0,5 |
| sbpTrend | người lớn | −5 đến 8 / 1 (mmHg/năm) |
| bmiTrend | người lớn | −2 đến 2 / 0,1 |
| ageM | trẻ | 1–72 / 1 (tháng) |
| overdueW | trẻ | 0–12 / 1 (tuần) |

Kéo thanh trượt (`commit=false`) chỉ đổi cây và dự báo; thả tay (`commit=true`) mới ghi log `EDIT Profile changed by you · {{n}}: {{label}} {{value}}` và đồng bộ cảnh báo. `Reset family` khôi phục hồ sơ (log `Family profiles reset`). Trạng thái của trẻ theo overdueW (còn trễ là `overdue`, về 0 thì `due`) trừ khi đã đặt lịch hoặc từ chối. Tiêu đề cảnh báo của Hind tính từ hồ sơ: `{{visit}} is {{n}} weeks overdue` / `{{visit}} is due` / `All 14 visits done`.

**Bước 0 `famhub` diễn ra thế nào** (nhãn `Passport`, tiêu đề `Family Health Passport`, hold `Guardian + Forecast`, decides `Each adult decides for themselves; parents decide for the children. “Not now” is respected.`, flow `Signals → Guardian → Courier → Forecast → Insight → Navigator → Family`). Agent: Courier `Brings records from 6 hospitals and clinics into one passport, with each adult’s consent`; Guardian `Collects home signals: blood pressure, weight, heart rate, glucose` · `Watches what is due for all eight, from 18 months to 78 years`; Forecast `Turns each adult’s signals into a 10-year heart risk and a 5-year what-if`; Insight `Finds connections across the family: one person’s diagnosis changes another’s checks`; Voice `Asks one question to find the barrier: Maitha by app, Sultan by short message, Moza by Arabic call`; Navigator `Bundles checks into one family trip`.

Màn hình hiện cây gia đình, điểm passport (bắt đầu **25%**), các mối liên hệ, bảng dự báo tim cho từng người lớn, và **cảnh báo của từng người kèm nút**:

| Cảnh báo (id) | Mức | Tiêu đề | Lý do hiển thị (`why`) | Nút (action id) | Hiệu ứng khi bấm |
|---|---|---|---|---|---|
| moza | đỏ | `Blood pressure above target for 5 days` | `Morning average 146 mmHg with every dose taken. Noa Navigator sent it to her stroke clinic at 08:12.` | `Clinic accepted (hospital)` (`moza_ok`) | Moza → `care`, task `Moza: dose review` / `done, explained in Arabic`, log `ACCEPT Stroke clinic accepted Moza’s alert`, huy hiệu `Moza’s blood pressure plan updated` |
| hind | vàng | `18-month visit is 3 weeks overdue` | `3 reminders were ignored, so Noa Voice asked Maitha why instead of sending a 4th: “Clinic hours clash with my shifts.”` | `Book Saturday 09:00 (family trip)` (`book_hind`) / `Not now` (`no_hind`) | Đặt: `booked`, slot `Saturday 09:00, Al Khalidiya Family Health Centre` |
| maitha | vàng nhạt | `IFHAS screening due (last done 2021)` | `She is bringing Hind on Saturday anyway: 15 minutes at the same clinic. Her grandfather’s diabetes moves her first HbA1c up.` | `Add to Saturday 09:15` (`book_maitha`) / `Not now` | slot `Saturday 09:15, same clinic` |
| khalid | vàng (agent Forecast) | `No check-up in 4 years; IFHAS never done` | `He feels fine. Noa Forecast estimated his heart risk from home signals, and both parents’ history raises it further.` | `Add to Saturday 09:30` (`book_khalid`) / `Not now` | slot `Saturday 09:30, same clinic`, huy hiệu `Khalid’s first screening` |
| amna | vàng nhạt | `HbA1c recheck due in 6 weeks` | `Prediabetes (5.9%) in March, and her father Saeed has type 2 diabetes.` | `Do it early, Saturday 09:45` (`book_amna`) / `Keep the date` (`keep_amna`) | Đặt: slot `Saturday 09:45, same clinic`; Giữ ngày: `due`, log `CHOICE Amna keeps the original date; one reminder before` |
| saeed | vàng | `Eye and kidney checks 14 months overdue` | `He goes to his diabetes clinic on Tuesday anyway, so Noa Navigator asks the clinic to add them: no extra trip.` | `Add to Tuesday’s diabetes visit` (`book_saeed`) / `Not now` | slot `Tuesday 10:00, his diabetes clinic visit` |
| sultan | vàng | `Never screened; vapes every day` | `Three reminders unopened. Noa Voice asked once, by short message: “I’m 21, I’m fine.” So Noa offers an evening slot and quit support, not another reminder.` | `Wednesday 19:00 + quit support` (`book_sultan`) / `Not now` | slot `Wednesday 19:00, Al Khalidiya Family Health Centre, with quit support`, huy hiệu `Sultan’s first screening`, và nếu Khalid còn hút: **C8** + log `CONNECT Noa Insight · new family connection: father and son both smoke → quit support for both` |
| hamdan | xanh | `5-year visit done` | `Up to date. Next: the 6-year visit in March, one reminder before.` | (không có, đã xong) | |

Mọi lần đặt lịch: trạng thái `booked`, `tasks` `<tên>: <tiêu đề cảnh báo>` / `Booked <slot>`, log `BOOK Noa Navigator · <tên> booked: <slot>`, bảng tin. `Not now` (`no_*`): `declined`, log `CHOICE Noa Navigator · {{n}}: not now · reminders paused 3 months`. Khi ≥ 2 trong 4 người Hind/Maitha/Khalid/Amna đã đặt: huy hiệu `One trip, four checks`. Mỗi lần điểm đổi: log `SCORE Family passport {{score}}% (±d)`.

**Điểm passport** = trung bình của 8 người theo trọng số: `ok` 1, `care` 0,85, `booked` 0,7, `due` 0,4, `declined` 0,3, `alert` 0,2, `overdue` 0; làm tròn phần trăm. Bước 0 xong khi **ít nhất một người đã đặt lịch**; nếu mọi người "Not now", không đi tiếp được (đã chạy thật: điểm 39%, `canNext = false`).

**Cảnh báo nguy cơ tim (luật F1, Forecast)**: sau mỗi thay đổi, với mỗi người lớn được chấm có nguy cơ ≥ 20% và chưa "Not now" cho tim: tạo **một** cảnh báo đỏ `fc_<member>` `High heart risk: {{pct}} in 10 years` (nút `Book a doctor review` / `Not now`) **chỉ khi người đó không có cảnh báo nào khác đang mở, chưa đặt lịch và chưa từ chối**; rút cảnh báo đang mở khi nguy cơ giảm dưới 20% (log `FORECAST ... alert withdrawn`). Khi đầu vào: Saeed 39,8% nhưng đang có cảnh báo khác nên **không có** `fc_saeed`. Đã chạy thật: tăng SBP của Khalid lên 180 → nguy cơ 29,8% nhưng **không** có `fc_khalid` vì cảnh báo `khalid` còn mở. `Book a doctor review` → `care`, task `heart risk review` / `Booked Sunday 10:00`; `Not now` → không nhắc 3 tháng.

**Dự báo ban đầu (đã chạy thật):**

| Người | Nguy cơ 10 năm | Mức | Biến thể | Tuổi tim | 5 năm theo xu hướng | 5 năm theo kế hoạch |
|---|---|---|---|---|---|---|
| Saeed | 39,77% | cao | lab | 92 | 51,3% | 41,8% |
| Khalid | 18,08% | trung bình | BMI | 65 | 30,0% | 10,4% |
| Amna | 3,52% | thấp | lab | 46 | 5,0% | 3,4% |
| Moza | không chấm (`Has had a heart attack or stroke`) | | | | | |
| Maitha, Sultan | không chấm (`The Framingham score is valid from 30...`) | | | | | |
| Hind, Hamdan | trẻ (`Children are followed by well-child visits`) | | | | | |

Bỏ hút thuốc cho Khalid → 9,3%, tuổi tim 52. Mỗi người có bảng "signals": agent nào thu tín hiệu gì từ đâu (Guardian: huyết áp, BMI; Voice: hút thuốc/tiểu đường; Courier: xét nghiệm; Insight: tiền sử gia đình; Forecast: điểm; Navigator: việc tiếp theo). **Việc tiếp theo** (`nextAction`), theo thứ tự: đã đặt → `Booked: {{slot}}`; đã từ chối → `“Not now” respected for 3 months`; nguy cơ cao → `Doctor review within 2 weeks`; được chấm bằng biến thể BMI → `Measure cholesterol at the next check` (đây là F2 trong code, áp cho **mọi** người BMI dưới 20%, xem mục 12); đủ điều kiện IFHAS và chưa ok → `IFHAS screening`; người lớn không phải Emirati → `IFHAS is for Emiratis 18–75: no IFHAS nudges`; còn lại `Nothing due now`.

**Dòng tự kiểm của gia đình** (cố định, 5 dòng): `Asked Maitha why, after 3 ignored reminders, instead of sending a 4th` · `Raised Khalid’s screening from home signals and his parents’ history, before he feels anything` · `Scored only where Framingham is valid: not Moza (after a stroke), not Maitha or Sultan (under 30)` · `Added Saeed’s checks to a visit he already has, instead of a new trip` · `Celebrated Hamdan being up to date instead of nudging him`.

**Các bước sau bước 0** (nguyên văn ở Phụ lục B):

| # | kind · mode | Tiêu đề (nhãn) | Khi nào (mặc định) | Hold | Agent và câu thoại | Hand-off | Ai quyết định | Người xem làm gì | Màn hình | DB / log |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | tl · hosp | `The family trip` (`Visits`) | d4 09:00 (24 Oct) | `Clinics` | Courier: `Sends each passport, with the forecast and signals, to the clinic before the visit` · `Files every result back into the family passport` | Courier → Clinics → Courier | `The clinicians do the checks.` | `Next update →` cho mỗi người đã đặt (Hind, Maitha, Khalid, Amna, Saeed, Sultan theo thứ tự; không ai đặt thì dòng `No visits booked`) | Phone `Saturday trip` / `Hind 09:00 · Maitha 09:15 · Khalid 09:30 · Amna 09:45`; Web khi xong `Family: Saturday trip done.` | mỗi dòng `encounters` + log `RECORD <Tên> · <việc> · <chi tiết>` |
| 2 | famresult · hosp | `Results, risk and connections` (`Results`) | d5 12:00 | `Insight + Forecast → teams` | Insight: `Reads each result against its threshold` · `Looks for what one result means for the rest of the family`; Forecast: `Recalculates heart risk with the real cholesterol and blood pressure`; Navigator: `Routes each result to the right team within 2 weeks` | Clinics → Insight → Forecast → Navigator → Teams and family | `Clinicians confirm what each result means.` | Nhập một kết quả cho mỗi người đã đặt (bảng dưới), `Send the results` | Ghi chú `Khalid’s cholesterol and clinic blood pressure feed Noa Forecast...`, gợi ý `Try total cholesterol 7.5 or more to see cholesterol tests suggested for Maitha and Sultan.` | xem bên dưới |
| 3 | teach · ind | `Noa explains, to each person` (`Explain`) | d6 18:00 | `Coach → Khalid` | Coach: `Explains Khalid’s result and his heart forecast in Arabic or English` · `Checks he understood`; Voice: `Tells Sultan his result by short message, the way he prefers` | Coach → Khalid → Voice → Sultan | `Khalid decides who in the family sees his result.` | Teach-back của **Khalid** (bộ theo HbA1c của Khalid), chọn Amna/Moza, `Send the plan home` | Phone `Noa Coach` | checkins/CHECK, CONSENT `Khalid chose who sees the plan: Amna, Moza` (18:20) |
| 4 | tl · ind | `Until every result reaches care` (`Follow up`) | d20 10:00 (9 Nov) | `Navigator → family` | Navigator: `Follows every referral until it happens`; Guardian: `Keeps collecting home signals`; Forecast: `Updates each forecast as new readings arrive` | Navigator → Teams → Guardian → Forecast → Passport | `The family keeps control of every booking.` | `Next update →` cho từng dòng theo dõi | Phone `Family passport` / `Everyone is booked, in care or up to date.` | mỗi dòng `tasks` + log `STEP …` |
| 5 | report · gov | `Report to the Department` (`Department`) | d25 09:00 (14 Nov) | `Analyst → DoH` | Analyst: `Counts family-level participation, connected screenings and forecasts acted on` · `Removes names: this family is one anonymous case` | Analyst → Health centres → Department of Health | `The health centres sign off the report.` | `Send the monthly report` | Government: `Family Health Passport`, 7 KPI cố định | `reports` + POST |

**Bước 2: kết quả cả nhà** (một kết quả cho mỗi người đã đặt; giá trị ngoài khoảng bị **kẹp**; thiếu thì chặn gửi):

| Kết quả (id) | Người | Mặc định | Khoảng | Ngưỡng và nơi chuyển (P9) |
|---|---|---|---|---|
| `hind` (words besides mama and dada) | Hind | 2 | 0–30 | < 3 → `Hearing test and speech assessment` → `Child speech and hearing clinic`; ≥ 3 → `On track; 2-year visit in March` |
| `maitha_a1c` | Maitha | 5,4 | 4,5–12 | ≥ 6,5 → `Family doctor`; ≥ 5,7 → `Healthy lifestyle programme`; khác: khỏe |
| `khalid_a1c` | Khalid | 6,1 | 4,5–12 | ≥ 6,5 → `Family doctor · Dr Aisha Al Hosani`; ≥ 5,7 → `Healthy lifestyle programme`; khác: khỏe |
| `amna_a1c` | Amna | 6,0 | 4,5–12 | như Maitha |
| `khalid_tc` | Khalid | 6,4 | 3–10 | ≥ 7,5 → `Very high cholesterol: doctor review and family testing` (Dr Aisha Al Hosani) + **C4**; khác: `Used in his heart risk` |
| `khalid_hdl` | Khalid | 0,9 | | luôn `Used in his heart risk` |
| `khalid_sbp` | Khalid | 142 | 100–190 | ≥ 160 → `High blood pressure: doctor review this week`; khác: dùng cho điểm tim |
| `saeed_acr` | Saeed | 4,2 | 0–30 | ≥ 3 → `Early kidney change: kidney protection review` → `Diabetes clinic · Capital General Hospital` |
| `sultan_sbp` | Sultan | 126 | 100–170 | ≥ 140 → `High blood pressure at 21: repeat readings and doctor review` → `Family doctor` |

Khi gửi: mỗi kết quả ghi `observations`; chuyển tuyến → người đó `care`, `alerts` vàng luật P9, log `ROUTE Noa Insight · <label> <v> → <team>`; khỏe → `ok` (log `... → healthy · passport` trừ các giá trị chỉ dùng cho điểm tim). TC/HDL/SBP của Khalid ghi vào hồ sơ (chuyển sang biến thể lab), HbA1c ≥ 6,5 bật tiểu đường; log `FORECAST Noa Forecast · Khalid recalculated with cholesterol: {{pct}} ({{cat}}), heart age {{ha}}`. Maitha/Amna HbA1c ≥ 6,5 bật tiểu đường; SBP của Sultan được lưu. Sau đó đồng bộ F1 kiểu "results": người **đã đặt** có nguy cơ cao nhận cảnh báo `fc_` đã chuyển sẵn (`care`, alert đỏ luật **F1**, log `FORECAST Noa Forecast · {{n}}: 10-year heart risk {{pct}} (high) → routed to the family doctor`). TC Khalid ≥ 7,5 → C4 (cảnh báo `Cholesterol test suggested` cho Maitha, log CONNECT). HbA1c Khalid bị chuyển tuyến → C5 (`Family plan suggested`, log CONNECT, huy hiệu `Family plan started`). Hind đã đặt → huy hiệu `Hind: 8 of 14 visits`. Mọi người lớn 30–74 không cvd đều có cholesterol → huy hiệu `Every adult’s heart risk known`. Bộ teach-back: HbA1c Khalid chuyển tuyến và ≥ 6,5 → `dm`; chuyển tuyến < 6,5 → `prev_ref`; khỏe → `prev_ok`.

**Bước 4: dòng theo dõi** được dựng lúc chạy: Hind (nếu chuyển tuyến) `Hind · hearing test`; Khalid (nếu có chuyển tuyến) `Khalid · doctor review`; nếu có `fc_khalid`: `Khalid · heart risk`; Amna, Maitha, Saeed, Sultan (nếu chuyển tuyến); C4 `Maitha and Sultan · cholesterol`; C5 `Family plan`; luôn có `Passport`. Nguyên văn ở Phụ lục B.

**Kết quả mong đợi khi chạy mặc định** (autopilot 30 tick; thứ tự bấm: `moza_ok`, `book_hind`, `book_maitha`, `book_khalid`, `book_amna`, `book_saeed`, `book_sultan`, rồi Next):
- Điểm: 25 → 33 (+8) → 42 (+9) → 46 (+4) → 54 (+8) → 58 (+4) → 67 (+9) → 76 (+9) ở bước 0; **91%** sau kết quả; 8/8 "up to date or in care".
- Kết quả định tuyến: hind refer, maitha_a1c ok, khalid_a1c refer (prediabetes → lifestyle), khalid_tc/hdl/sbp dùng cho điểm, amna_a1c refer (prediabetes), saeed_acr refer, sultan_sbp ok. Khalid tính lại: **25,5% (log hiện 26%), cao, tuổi tim 77**. `fc_saeed` và `fc_khalid` được chuyển sẵn. Mối liên hệ cuối: C1, C7, C2, C3, C6, C8, C5 (không có C4 vì TC 6,4 < 7,5). Huy hiệu: hamdan, bp, trip, first, sultan, plan, hind8, heart. Bộ teach-back `prev_ref`.
- Trạng thái cuối: moza care, saeed care, khalid care, amna care, maitha ok, sultan ok, hind care, hamdan ok.
- Bảng DB: agents 9, patients 8, consents 10, observations 15, checkins 0, alerts 6, tasks 15, encounters 12, reports 1, audit 2. Đồng hồ cuối 14 Nov 09:00, bước cuối 5 (6 bước).
- Log đầy đủ: Phụ lục D, mục `# family`.

**Cách test case này**
- Happy path: chạy `Run it for me` hoặc bấm tay theo thứ tự trên; so điểm từng bước, log và kích thước bảng với Phụ lục D.
- Các biến thể quan trọng (đã chạy thật):

| Thao tác | Kết quả mong đợi |
|---|---|
| Mọi người "Not now"/"Keep the date", không đặt ai | Điểm 39%, Moza vẫn `alert`, không qua được bước 0 |
| Chỉ đặt Khalid | Điểm 34%, huy hiệu `Khalid’s first screening`, bước 1 chỉ có dòng của Khalid |
| Khalid tắt hút thuốc | Nguy cơ 18,1% → 9,3%, tuổi tim 65 → 52 |
| Khalid SBP 180 khi cảnh báo `khalid` còn mở | 29,8%, **không** thêm `fc_khalid` (luật một cảnh báo mỗi người) |
| Bước 2: `khalid_tc` 7,8 và `khalid_a1c` 6,8 | Khalid 48,0%, tuổi tim 99; có C4 và C5; `r_khalid_tc` và `r_khalid_a1c` chuyển Dr Aisha Al Hosani; teach-back `dm` |
| Đặt Sultan sau khi đã tắt hút thuốc của Khalid | Không có C8 |
| Đổi Maitha thành 30 tuổi | Maitha bắt đầu được chấm Framingham |
| Đặt `cvd` cho một người lớn | Không chấm, hiện `Has had a heart attack or stroke, so a risk score does not apply...` |
| Kết quả ngoài khoảng (ví dụ ACR 40) | Kẹp về 30, cảnh báo `... so 30 is used.` |
- Biên cần kiểm: HbA1c 5,6 / 5,7 / 6,4 / 6,5; TC 7,4 / 7,5; SBP Khalid 159 / 160; Sultan 139 / 140; ACR 2,9 / 3,0; Hind 2 / 3 từ; nguy cơ đúng 20% (F1 dùng ≥ 0,20); tuổi 29 / 30 và 74 / 75 (hợp lệ Framingham).

---

<a id="c-wellchild"></a>
### 3.2 `wellchild`: Hind, khám trẻ khỏe bị trễ

**Câu chuyện và nhân vật.** Hind Al Mansoori, 18 tháng, lần khám 18 tháng trễ 3 tuần sau 3 lần nhắc. Mẹ là Maitha (y tá làm ca, `{{addr}}` = Maitha), bà ngoại Amna (f2). Nơi khám: Al Khalidiya Family Health Centre. Câu một dòng: `Three reminders were ignored, so Noa asks why instead of sending a fourth, and books one trip for the whole family.` Moment: `When Hind’s 18-month visit is three weeks late, her parents need a slot that fits their shifts, but clinic hours clash with their work and the reminders keep arriving at the wrong time.`

**Mục tiêu.** Hỏi một câu tìm rào cản thay vì nhắc lần 4; rào cản "giờ giấc" dẫn tới slot thứ Bảy gần nhà gộp cả nhà một chuyến; kết quả phát triển ngôn ngữ dưới ngưỡng được chuyển đúng phòng khám trong 2 tuần.

**Đầu vào** (khung 3.0.3): tuổi **18 tháng** (0–84), trễ **3 tuần** (0–26), đã nhắc **3** (0–6), quốc tịch Emirati (không hiện, không ảnh hưởng với trẻ). Rào cản mặc định của autopilot: `access`. Ô kết quả: `Words besides “mama” and “dada”` (đơn vị `words`), mặc định **2**, khoảng 0–30, bước 1, câu luật `At 18 months most children try to say 3 or more words besides mama or dada (demo threshold)`.

**Bước 0.** Item: `18-month visit (8 of 14)`. Log: `PASSPORT Noa Guardian · 18-month visit (8 of 14), overdue 3 weeks · 3 reminders already sent`, `ASK Noa Voice → Maitha: one question to find the barrier, instead of reminder 4`. Câu hỏi trên thẻ: `Noa Voice: “Maitha, Hind’s 18-month visit (8 of 14) is 3 weeks overdue. Is something making it hard?”`. Dòng gia đình hiện trên passport: `Hamdan, 5` · `5-year visit` · `done ✓`; `Maitha, 25 (mother)` · `IFHAS screening` · `due`; `Khalid, 47 (grandfather)` · `IFHAS screening` · `never done`; `Moza, 78` · `Outside the IFHAS age range; her stroke clinic follows her` · `—`.

**Bảng nhánh** (rào cản → luật → slot):

| Rào cản | Luật | Slot (`{{slot}}`) |
|---|---|---|
| access (mặc định) | P4 | `Saturday 09:00 at Al Khalidiya Family Health Centre, 2 km from home, with Maitha’s screening at 09:15 and grandfather Khalid’s at 09:30: one trip for the family` |
| awareness | P3 | `Saturday 09:00 near home; Noa explains the 14 visits and what this one checks` |
| trust | P5 | `Thursday 17:30 with a female doctor, Dr Aisha Al Hosani, in Arabic` |
| value | P6 | `Saturday 09:00; this visit checks growth, speech and vaccines at an age when early help matters most` (câu Voice dùng `These checks find problems years before you feel anything.`) |
| forgot | P7 | `Wednesday 16:00, the slot Maitha usually picks` |
| decline | P8 | dừng ở bước 0 |
| tuổi > 72 hoặc < 1 tháng | P2 | dừng ở bước 0 |

Kết quả: < 3 từ → **refer** `fewer than 3 words: a hearing test and speech assessment` → `Child speech and hearing clinic`, teach-back `child_speech`; ≥ 3 → **ok** `on track`, tiếp theo `the 2-year visit in March`, teach-back `prev_ok`.

**Các bước** (chung ở 3.0.3; giá trị riêng của case, mặc định):

| # | Bước | Giờ mặc định | Nội dung riêng của case |
|---|---|---|---|
| 1 | `Booked in one tap` | 20 Oct 18:35 | Voice: `I found {{slot}}. Shall I book it?`; gói: `For` Hind · 18-month visit (8 of 14), `Slot`, `Support` Easy access and booking, `Reminders` One, 3 days before. Log `ACT Book it · Booked: Saturday 09:00 at Al Khalidiya…` |
| 2 | `The visit` | 24 Oct 09:00 | 4 dòng: `Check-in` · `Weighed and measured: growing on the 50th centile.` (09:00); `Development check` · `Walking well. The doctor records the words she says.` (09:10); `Vaccines` · `Given as per the schedule. No reaction after 15 minutes.` (09:20); `Passport updated` · `Next: the 2-year visit.` (09:25) |
| 3 | `Result routed` | 24 Oct 12:00 | 2 từ → `ROUTE Noa Insight · Words besides “mama” and “dada” 2 → Child speech and hearing clinic`, alert P9 |
| 4 | `From result to care` | 25 Oct 09:00 | `ACCEPT Child speech and hearing clinic accepted · Hearing test booked for next week; speech assessment after.` |
| 5 | `Noa explains` | 25 Oct 18:00 | Bộ `child_speech`: câu hỏi `What helps {{n}}’s speech most at home?`, đúng: `Talking and reading with her every day, and naming what she points at` (mục 6.3). Kế hoạch 18:20: `Hind chose who sees the plan: Maitha, Amna` |
| 6 | `Until it’s done` | 1 Nov 10:00 | refer: `Hearing test` · `Normal hearing.`; `Speech assessment` · `Mild speech delay: 6 sessions of speech therapy on Saturdays near home.`; `Therapy` · `5 of 6 sessions attended. Hind now says 15 words.`; `Passport` · `2-year visit booked; one reminder 3 days before.`. ok: `Passport` · `2-year visit added for March; one reminder 3 days before.`; `Family` · `Hamdan’s 6-year visit added to the same morning.` |
| 7 | `Report to the Department` | 5 Nov 09:00 | `Well-child visits (1 month to 6 years)`; KPI cố định (ví dụ `Visits on time 78%`, `Most common barrier` `Clinic hours`) |

**Kết quả mong đợi mặc định** (24 tick): P4 `Easy access and booking`, nhánh refer, teach `child_speech`, bước cuối 7/7, đồng hồ 5 Nov 09:00. DB: agents 9, patients 1, consents 4, observations 2, checkins 0, alerts 2, tasks 6, encounters 5, reports 1, audit 4. Dòng tự kiểm: `Asked about the barrier after 3 reminders instead of sending reminder 4` | `Matched the support to the barrier: Easy access and booking` | `Booking offered in one tap, near home` | `Choice preserved: Maitha can change or cancel` | `One trip for the family: Khalid’s overdue screening booked 30 minutes later`. Log: Phụ lục D `# wellchild`.

**Cách test case này** (đã chạy thật):

| Đầu vào | Mong đợi |
|---|---|
| Mặc định | như trên |
| Rào cản `decline` | P8 `Respect the choice`, dừng bước 0; kiểm: `... after 3 reminders ...`, `Choice recorded: no more nudges for 3 months`, `The passport keeps it there; nothing is hidden` |
| `awareness`, kết quả 3 | P3, nhánh ok, teach `prev_ok`, bước 4 tự xong |
| `trust`, kết quả 2 | P5, refer, `child_speech` |
| `forgot`, rem 1, kết quả 5 | P7, ok; kiểm `Asked about the barrier after 1 reminder instead of sending reminder 2` |
| rem 0 | `Asked about the barrier before any reminder` |
| Tuổi 73 | P2 `Well-child visits run from 1 month to 6 years, and Hind is older...` |
| Tuổi 0 | P2 `The first well-child visit is at 1 month. Nothing is due yet.` |
| Tuổi 72 | Vẫn đủ điều kiện (mốc 72 tháng) |
| Tuổi 85 | Bị từ chối: `Age: 85 is outside the plausible range 0 to 84 and was not accepted...`; không check được passport |
| Kết quả 31 | Bị từ chối, giữ 2, không gửi được kết quả |
| Quốc tịch Expatriate | Không đổi gì (trẻ không kiểm quốc tịch) |

Biên: kết quả 2 / 3; tuổi 0 / 1 / 72 / 73 (tháng); dòng `One trip for the family` chỉ xuất hiện khi rào cản là `access`.

---

<a id="c-ifhas"></a>
### 3.3 `ifhas`: Khalid, chưa từng tầm soát IFHAS

**Câu chuyện và nhân vật.** Khalid Al Mansoori, 47, giám sát kho vận, làm ca dài, thấy mình khỏe, 4 năm chưa khám, chưa từng làm IFHAS, hút medwakh, mẹ đột quỵ và rung nhĩ, cha nhồi máu cơ tim năm 62. Vợ Amna (f1), mẹ Moza (f2). Câu một dòng: `Khalid feels fine and has never been screened; Noa finds his barrier and gets him to a Saturday slot in one tap.` Đây là nhịp đầu của Judge path (`Wow first: Khalid, one tap`).

**Mục tiêu.** Thay lời nhắc chung chung bằng lý do cá nhân (tiền sử gia đình, huyết áp đang tăng, nguy cơ tim khoảng 1/5), đặt lịch một chạm, và kết quả HbA1c được chuyển đúng chỗ; cạnh đó hiện dự báo tim tính lại với số đo hôm khám.

**Đầu vào:** tuổi **47** (16–85), quốc tịch **Emirati**, trễ 0, đã nhắc **2**. Rào cản mặc định `value`. Ô kết quả: `HbA1c` (%), mặc định **7,4**, khoảng 4,5–12, bước 0,1, câu luật `6.5% or above is in the diabetes range (a second test confirms); 5.7–6.4% is prediabetes`.

**Riêng của case: "Khalid’s moment, told twice"** (thẻ minh họa, `Illustrative story, not a prediction`): tab `Before Noa` (lời nhắc chung `Dear patient, you are due a health screening...`, `Khalid swipes it away...`, `Years later: a first heart or stroke problem...`) và tab `With Noa` (tin nhắn về tiền sử gia đình, `Saturday slot near home`, nút **`Book it · one tap`**). Nút này gọi `oneTapBook()`: tự kiểm passport rồi **Noa tự chọn** rào cản `value` (không hỏi Khalid), log `ROUTE Noa Navigator · P6 ← Personalised outreach, picked from the family history; no answer was asked` thay cho dòng ANSWER, cờ `noaPicked = true`. Nếu không đủ điều kiện: `Noa checked first: this person is not eligible, so Khalid’s message is not sent.`

**Bước 0.** Item `IFHAS screening (3 groups due)` (Metabolic, Heart, Cancer: bowel test). Log `PASSPORT Noa Guardian · IFHAS screening (3 groups due) · 2 reminders already sent`, `ASK Noa Voice → Khalid: one question to find the barrier, instead of reminder 3`. Dòng gia đình: `Hind, 18 months (granddaughter)` · `18-month visit` · `booked Saturday ✓`; `Amna, 45` · `IFHAS screening` · `done Mar 2026 ✓`; `Moza, 78` · ngoài độ tuổi.

**Bảng nhánh:**

| Rào cản | Luật | Slot |
|---|---|---|
| value (mặc định) | P6 | `Saturday 09:30 at Al Khalidiya Family Health Centre, right after Hind’s visit: 15 minutes, fasting blood test`. Câu Voice = `{{why}} Shall I book {{slot}}?` với why: `Your blood pressure has been creeping up on your cuff, you smoke, your mother had a stroke and your father a heart attack at 62. Noa Forecast puts your heart risk at about 1 in 5 over 10 years, rising if nothing changes. These checks find problems years before you feel anything. 15 minutes, right after Hind’s visit.` |
| access | P4 | `Saturday 07:30, before work, 10 minutes from home` |
| trust | P5 | `Thursday 18:00 with Dr Omar, in Arabic` |
| awareness | P3 | `Saturday 09:30; Noa lists which checks are due at 47 and why` |
| forgot | P7 | `Saturday 09:30, after Hind’s visit` |
| decline | P8 | dừng |
| không Emirati, hoặc tuổi < 18 / > 75 | P2 | dừng |

Kết quả HbA1c: ≥ 6,5 → refer `HbA1c in the diabetes range: a second test and a family doctor review` → `Family doctor · Dr Aisha Al Hosani`, teach `dm`; 5,7–6,4 → refer `prediabetes: the healthy lifestyle programme` → `Healthy lifestyle programme`, teach `prev_ref`; < 5,7 → ok `healthy range`, tiếp theo `the next IFHAS check in 3 years`, teach `prev_ok`.

**Hộp dự báo ở bước kết quả** (`Noa Forecast · with today’s results`): giá trị cố định nam, SBP 142 không điều trị, hút thuốc, TC 6,4, HDL 0,9, BMI 29, xu hướng 3 / 0,5; tuổi lấy từ đầu vào; tiểu đường bật khi HbA1c ≥ 6,5. Mặc định 47 tuổi / 7,4% → **40,8% cao, tuổi tim 92**; HbA1c < 6,5 → **25,5%, tuổi tim 77**. Dòng gợi ý: `Set HbA1c below 6.5 and the score drops diabetes.` / `Set HbA1c to 6.5 or more and the score adds diabetes.` Tuổi ngoài 30–74 → hiện lý do không chấm.

**Các bước** (mặc định):

| # | Bước | Giờ | Nội dung riêng |
|---|---|---|---|
| 1 | `Booked in one tap` | 18:35 | `ACT Book it · Booked: Saturday 09:30 at Al Khalidiya Family Health Centre, right after Hind’s visit: 15 minutes, fasting blood test` |
| 2 | `The visit` | 24 Oct 09:00 | `Check-in` · `Blood pressure 138/86. Waist 104 cm.` (09:00); `Blood tests` · `HbA1c and cholesterol (fasting).` (09:10); `Bowel screening` · `Home test kit given, instructions in Arabic.` (09:15); `Heart risk` · `Family history recorded: mother’s stroke, father’s heart attack at 62. Cholesterol goes to Noa Forecast.` (09:20) |
| 3 | `Result routed` | 12:00 | `ROUTE Noa Insight · HbA1c 7.4 → Family doctor · Dr Aisha Al Hosani` |
| 4 | `From result to care` | 25 Oct 09:00 | `ACCEPT Family doctor · Dr Aisha Al Hosani accepted · Second HbA1c and doctor review booked in 2 weeks.` |
| 5 | `Noa explains` | 18:00 | Bộ `dm`: `What happens next?`, đúng: `A second test in 2 weeks, then the doctor explains the plan`. Kế hoạch: `Khalid chose who sees the plan: Amna, Moza` |
| 6 | `Until it’s done` | 1 Nov 10:00 | refer: `Second HbA1c` · `Confirmed by Dr Aisha Al Hosani; care plan agreed. The doctor decides the treatment.`; `Care plan` · `Diet support in Arabic; eye and foot checks booked.`; `Bowel test` · `Kit returned: normal.`; `3 months` · `HbA1c rechecked; next IFHAS items added to the passport.`. ok: `Bowel test` · `Kit returned: normal.`; `Passport` · `Next IFHAS check in 3 years; one reminder before.` |
| 7 | `Report to the Department` | 5 Nov 09:00 | `IFHAS screening (Emiratis 18–75)` |

**Kết quả mong đợi mặc định** (24 tick): P6 `Personalised outreach`, refer, teach `dm`, bước cuối 7. DB giống `wellchild` (patients 1, consents 4, observations 2, alerts 2, tasks 6, encounters 5, reports 1, audit 4). Dòng tự kiểm: `Asked about the barrier after 2 reminders instead of sending reminder 3` | `Matched the support to the barrier: Personalised outreach` | `Booking offered in one tap, near home` | `Choice preserved: Khalid can change or cancel`. Log: Phụ lục D `# ifhas`.

**Cách test case này** (đã chạy thật):

| Đầu vào | Mong đợi |
|---|---|
| HbA1c 6,4 | refer `Healthy lifestyle programme`, teach `prev_ref`, dự báo 25,5% / 77 |
| HbA1c 6,5 | refer Dr Aisha Al Hosani, teach `dm`, dự báo 40,8% / 92 |
| HbA1c 5,7 | refer lifestyle |
| HbA1c 5,6 | ok `healthy range`, teach `prev_ok`, bước 4 tự xong |
| HbA1c 12,1 | Bị từ chối, giữ 7,4 |
| Quốc tịch Expatriate | P2 `IFHAS screening is for Emiratis aged 18 to 75, so Noa does not nudge Khalid for it...` |
| Tuổi 76 / 17 / 16 | P2 `IFHAS screening is for ages 18 to 75...` |
| Tuổi 15 | Bị từ chối (khoảng 16–85) |
| Tuổi 75 | Đủ điều kiện IFHAS; hộp dự báo hiện `The Framingham score is valid up to 74. Their doctor decides.` |
| Tuổi 29 | Đủ điều kiện; dự báo `The Framingham score is valid from 30...` |
| Bấm `Book it · one tap` | P6 do Noa chọn, log ROUTE thay ANSWER |

Biên: HbA1c 5,6 / 5,7 / 6,4 / 6,5; tuổi 17 / 18, 75 / 76 (IFHAS), 29 / 30, 74 / 75 (Framingham).

---

<a id="c-expat"></a>
### 3.4 `expat`: Arjun, gia đình mới đến Abu Dhabi

**Câu chuyện và nhân vật.** Arjun Nair, 4 tháng, sinh ở Kochi, đã tiêm mũi 2 tháng ở Ấn Độ; mẹ Priya (`{{addr}}`, mới sang 2 tháng), cha Vikram. Nơi khám: Mussafah Family Health Centre. Câu một dòng: `A family new to Abu Dhabi does not know what is due; Noa explains it in plain words and books it.`

**Mục tiêu.** Người mới không biết lịch khám: giải thích bằng lời dễ hiểu và đặt lịch; **không** nhắc cha mẹ làm IFHAS vì IFHAS chỉ cho người Emirati 18–75.

**Đầu vào:** tuổi **4 tháng**, quốc tịch **Expatriate** (không ảnh hưởng vì là trẻ), trễ 0, đã nhắc **0**. Rào cản mặc định `awareness`. Ô kết quả: `Weight-for-age centile` (`centile`), mặc định **40**, khoảng 0–100, bước 1, câu luật `Below the 2nd or above the 98th centile needs a feeding and growth review (demo threshold)`.

**Bước 0.** Item `4-month visit (3 of 14)`. Log `PASSPORT Noa Guardian · 4-month visit (3 of 14) · 0 reminders already sent`, `ASK Noa Voice → Priya: one question to find the barrier, instead of reminder 1`. Dòng gia đình: `Priya, 31` · `IFHAS is for Emiratis aged 18–75, so Noa does not nudge her`; `Vikram, 34` · `IFHAS is for Emiratis aged 18–75`.

**Bảng nhánh:**

| Rào cản | Luật | Slot |
|---|---|---|
| awareness (mặc định) | P3 | `Tuesday 10:00 at Mussafah Family Health Centre, 1 km away; Noa explains the 14 visits in English`. Câu Voice: `Here is what is due and why, in plain words: 4-month visit · growth, development, vaccines. I can book {{slot}}.` |
| access | P4 | `Saturday 10:00, when Vikram is off work` |
| trust | P5 | `Tuesday 10:00 with a female doctor; Priya can bring her own records from India` |
| value | P6 | `Tuesday 10:00; this visit checks growth and gives the 4-month vaccines` |
| forgot | P7 | `Tuesday 10:00` |
| decline | P8 | dừng |

Kết quả: < 2 hoặc > 98 → refer `weight outside the usual range: a feeding and growth review` → `Child health nurse`, teach `prev_ref`; còn lại → ok `growing well`, tiếp theo `the 6-month visit`, teach `prev_ok`.

**Các bước** (mặc định, nhánh ok):

| # | Bước | Giờ | Nội dung riêng |
|---|---|---|---|
| 1 | `Booked in one tap` | 18:35 | `ACT Book it · Booked: Tuesday 10:00 at Mussafah Family Health Centre, 1 km away; Noa explains the 14 visits in English` |
| 2 | `The visit` | 24 Oct 09:00 | `Check-in` · `Weighed and measured.`; `Check` · `Feeding well, smiling, holding his head up.`; `Vaccines` · `4-month vaccines given; records from India added to the passport.`; `Passport` · `Next: the 6-month visit.` |
| 3 | `Result routed` | 12:00 | `ROUTE Noa Insight · Weight-for-age centile 40 → healthy · passport: the 6-month visit` (không có alert P9) |
| 4 | `From result to care` | 25 Oct 09:00 | **Tự xong**: `Nothing to refer: the result is healthy.` (refer: `Feeding review booked in 1 week.`) |
| 5 | `Noa explains` | 18:00 | Bộ `prev_ok`: `When will Noa remind you?`, đúng: `Once, a few days before the next check`. Kế hoạch: `Arjun chose who sees the plan: Priya, Vikram` |
| 6 | `Until it’s done` | 1 Nov 10:00 | ok: `Passport` · `6-month visit booked; one reminder 3 days before.`; `Passport` · `All 14 visits listed in English, with what each checks.`. refer: `Feeding review` · `Feeding plan agreed; weight check in 2 weeks.`; `Weight check` · `Back on track.`; `Passport` · `6-month visit booked.` |
| 7 | `Report to the Department` | 5 Nov 09:00 | `Well-child visits (1 month to 6 years)` |

**Kết quả mong đợi mặc định** (21 tick): P3 `Know what is due`, nhánh **ok**, teach `prev_ok`, bước cuối 7. DB: patients 1, consents 4, observations 2, checkins 0, **alerts 1, tasks 3**, encounters 5, reports 1, audit 4. Dòng tự kiểm: `Asked about the barrier before any reminder` | `Matched the support to the barrier: Know what is due` | `Booking offered in one tap, near home` | `Choice preserved: Priya can change or cancel` | `Did not nudge Priya or Vikram for IFHAS: it is for Emiratis aged 18–75`. Log: Phụ lục D `# expat`.

**Cách test case này** (đã chạy thật): bách phân vị 1 → refer `Child health nurse`, teach `prev_ref`; 2 → ok; 98 → ok; 99 → refer; đổi quốc tịch sang Emirati → không đổi gì. Biên: 1 / 2 và 98 / 99; tuổi 0 / 1 và 72 / 73 tháng; dòng `Did not nudge Priya or Vikram...` luôn có ở case này (gắn với case, không gắn với đầu vào).

---

<a id="c-bone"></a>
### 3.5 `bone`: Hamad, kiểm tra xương và trí nhớ

**Câu chuyện và nhân vật.** Hamad Al Hammadi, 74, tăng huyết áp, đã thôi lái xe từ 2025, IFHAS làm lần cuối 2019, đi bộ đến nhà thờ mỗi ngày. Cháu Khalid (f1), chị Moza (f2, cách 450 m). Nơi khám: Al Bateen Family Health Centre. Câu một dòng: `Hamad no longer drives and his bone and memory checks are years overdue; Noa books the check and the taxi.`

**Mục tiêu.** Rào cản thực tế (đi lại) được gỡ bằng taxi hai chiều; kết quả mật độ xương theo định nghĩa WHO được chuyển bác sĩ.

**Đầu vào:** tuổi **74** (16–85), Emirati, trễ 0, đã nhắc **3**. Rào cản mặc định `access`. Ô kết quả: `Bone density T-score` (không đơn vị), mặc định **−2,7**, khoảng −4 đến 1, bước 0,1, câu luật `−2.5 or lower is osteoporosis; between −1 and −2.5 is low bone density (WHO definitions)`.

**Bước 0.** Item `IFHAS screening (5 groups due)` (Metabolic, Heart, Bowel, Bone density vì nam ≥ 70, Memory vì ≥ 65). Log `PASSPORT Noa Guardian · IFHAS screening (5 groups due) · 3 reminders already sent`, `ASK Noa Voice → Hamad: one question to find the barrier, instead of reminder 4`. Dòng gia đình: `Moza, 78` · ngoài độ tuổi; `Khalid, 47` · `IFHAS screening` · `booked ✓`.

**Bảng nhánh:**

| Rào cản | Luật | Slot |
|---|---|---|
| access (mặc định) | P4 | `Monday 10:00 at Al Bateen Family Health Centre; Noa books a taxi both ways and tells Khalid` |
| awareness | P3 | `Monday 10:00; Noa explains the bone and memory checks at 74` |
| trust | P5 | `Monday 10:00 with Dr Fatima Al Ali, whom he knows` |
| value | P6 | `Monday 10:00: a bone scan can show weak bones before a fall breaks one` |
| forgot | P7 | `Monday 10:00` |
| decline | P8 | dừng |
| tuổi > 75, < 18, hoặc không Emirati | P2 | dừng |

Kết quả: ≤ −2,5 → refer `osteoporosis: treatment and falls prevention` → `Family doctor · Dr Fatima Al Ali`, teach `bone`; −2,5 < v < −1 → refer `low bone density: vitamin D, exercise and a recheck in 2 years` → cùng bác sĩ, teach `prev_ref`; ≥ −1 → ok `normal bone density`, tiếp theo `the next check in 5 years`, teach `prev_ok`.

**Các bước** (mặc định):

| # | Bước | Giờ | Nội dung riêng |
|---|---|---|---|
| 1 | `Booked in one tap` | 18:35 | Voice `I found {{slot}}. Shall I book it?`; `ACT Book it · Booked: Monday 10:00 at Al Bateen Family Health Centre; Noa books a taxi both ways and tells Khalid` |
| 2 | `The visit` | 24 Oct 09:00 | `Check-in` · `Blood pressure 142/84.` (09:00); `Bone density scan` · `Hip and spine scanned.` (09:15); `Memory check` · `Normal for his age.` (09:30); `Blood tests` · `Kidney function, vitamin D, HbA1c.` (09:40) |
| 3 | `Result routed` | 12:00 | `ROUTE Noa Insight · Bone density T-score -2.7 → Family doctor · Dr Fatima Al Ali` |
| 4 | `From result to care` | 25 Oct 09:00 | `ACCEPT Family doctor · Dr Fatima Al Ali accepted · Doctor review booked this week; home safety check arranged.` |
| 5 | `Noa explains` | 18:00 | Bộ `bone`: `What lowers your risk of a broken bone?`, đúng: `The medicine your doctor agrees, daily walks and removing trip hazards`. Kế hoạch: `Hamad chose who sees the plan: Khalid, Moza` |
| 6 | `Until it’s done` | 1 Nov 10:00 | refer: `Doctor review` · `Bone-strengthening treatment agreed. The doctor decides.`; `Home safety check` · `Loose rug removed; grab rail fitted in the bathroom.`; `Daily walks` · `Guardian sees his walks to the mosque continue.`; `Passport` · `Next bone scan in 2 years.`. ok: `Passport` · `Next IFHAS check added; one reminder before.` |
| 7 | `Report to the Department` | 5 Nov 09:00 | `IFHAS screening (Emiratis 18–75)` (bộ KPI riêng cho người 65+: `Transport arranged`, `Osteoporosis started on treatment`…) |

**Kết quả mong đợi mặc định** (24 tick): P4, refer, teach `bone`, bước cuối 7. DB như `wellchild`. Dòng tự kiểm: `Asked about the barrier after 3 reminders instead of sending reminder 4` | `Matched the support to the barrier: Easy access and booking` | `Booking offered in one tap, near home` | `Choice preserved: Hamad can change or cancel` (không có dòng "One trip"). Log: Phụ lục D `# bone`.

**Cách test case này** (đã chạy thật): T-score −2,5 → osteo, `bone`; −2,4 → low density, `prev_ref`; −1,1 → low density; −1,0 → ok `normal bone density`, `prev_ok`; tuổi 76 → P2 `IFHAS screening is for ages 18 to 75, so Noa does not nudge Hamad for it. His own doctor follows his care.`; tuổi 69 → vẫn đi tiếp và vẫn có ô T-score dù nhóm "Bone: density scan" không còn trong danh sách đến hạn (giới hạn của demo, mục 12). Biên: −2,5 / −2,4; −1,1 / −1,0; tuổi 75 / 76; 69 / 70 (số nhóm IFHAS 4 / 5).

---

<a id="c-stroke"></a>
### 3.6 `stroke`: Moza, đột quỵ ban đêm

**Câu chuyện và nhân vật.** Moza Al Hammadi, 78, sống một mình ở Al Bateen, tăng huyết áp. Bình thường khi ngủ tim 58–64, điểm giọng nói 0,94. Con trai Khalid ở Al Ain (f1, `Khalid (son, Al Ain)`), em trai Hamad cách 450 m (f2). Bệnh viện: Corniche Stroke Centre. Lúc 01:12 Guardian bắt đầu theo dõi; từ phút thứ 10 tim lên 138 khi nằm yên và kéo dài 12 phút; Voice gọi, giọng nói líu. Câu một dòng: `At night Moza’s racing heart, then slurred speech, trigger a voice check and a 998 call with a pre-arrival packet.` Đây là nhịp thứ ba của Judge path và là case `Live speech test`.

**Mục tiêu.** Phát hiện đột quỵ ban đêm từ tín hiệu (không chờ người bệnh tự gọi), đợi đủ 10 phút để một cơn tim nhanh ngắn không đánh thức ai, kiểm tra giọng nói rồi gọi 998 và gửi gói hồ sơ trước khi xe tới, sau đó đi hết đường điều trị, ra viện có teach-back, theo dõi tại nhà và báo cáo.

**Đầu vào mặc định** (khung 3.0.4): hr **138**, dur **12**, `Not moving`, không té, floor 0, đường huyết **6,4** (cảm biến bật), SpO2 **96**, cân nặng **0**. Autopilot: giọng `slurred`, câu trả lời: vì không đặt sẵn nên dùng lựa chọn đầu tiên `fine`, đặt **im lặng** (không có dòng log ANSWER).

**Bước 0 diễn ra thế nào (mặc định).**

| Phút | Giờ | Điều gì xảy ra |
|---|---|---|
| 0 | 01:12 | `Play`; log `WATCH Noa Guardian · watching Moza from 01:12` |
| 0–9 | 01:12–01:21 | Nhịp nghỉ quanh 60 (nhiễu ±2,5) |
| 10–19 | 01:22–01:31 | Nhịp quanh 138 (±3), không di chuyển; đếm `R1: n/10 min` |
| 19 | 01:31 (tTrig) | Đủ 10 phút liên tiếp > 120 khi nằm yên → **R1** |
| | 01:32 (tCheck) | `DETECT Noa Guardian · rule R1 met: heart rate above 120 for 10 min while still → hand-off to Noa Voice`; `ALERT Noa Guardian → Khalid and Hamad: “Noa is checking on Moza.”`; `ASK Noa Voice calls Moza: “Moza, are you all right? I noticed your heart racing.”`; bài giọng nói: mẫu líu `my … nay … mo … abu` 11,2 s → `CHECK Noa Voice · speech check: clearly changed (score 0.33)` |
| | 01:34 (tAct) | Thang: giọng đỏ → dòng 5 → `DECIDE Noa agents decide · R5 → Emergency: possible stroke`; alert đỏ `Emergency services and hospital`; thẻ `998 (UAE ambulance) called at 01:36. The rest of the journey follows.` (giờ = tAct + 2) |

Câu hỏi trigger R1 (`hr`): `Moza, are you all right? I noticed your heart racing.` với 2 lựa chọn `fine` (“I’m fine, I couldn’t sleep”) và `none` (No answer).

**Bảng nhánh của case** (chỉ R1 có thể kích hoạt với các đầu vào khác giữ mặc định):

| Giọng nói | Câu trả lời | Kết quả |
|---|---|---|
| đỏ (líu, < 0,6) | bất kỳ | **R5 `stroke_em`** (998) |
| không nói gì | (tự `none`) | **R5 `stroke_em`** |
| bình thường | `none` | **R5 `stroke_em`** (tim nhanh + không trả lời) |
| bình thường hoặc vàng | `fine` | **Đứng xuống**, ghi R1, không có hành trình |
| (không trigger) | | **R12**: hr ≤ 120 (thực tế ≤ 123, xem dưới), dur < 10, hoặc đang di chuyển |

Lưu ý quan trọng khi test: vì nhịp phát lại có nhiễu ±3 bpm, với seed mặc định **hr 121, 122, 123 cho R12**, hr 124 mới kích hoạt R1 (đã chạy thật). Benchmark tắt nhiễu nên hr 121 kích hoạt ở đó. Xem mục 12.

**Hành trình `stroke_em`** (`Emergency: possible stroke`, luật R5, báo cáo `Stroke pathway`, teach `stroke`, daily `stroke`, chế độ đêm tới bước 3). Giờ ghi là giờ của lần chạy mặc định (tAct 15 Oct 01:34).

**Bước 1 · `Help` · `Noa calls for help`** (tl, Individual, m+0 = 01:34)
- Hold `Responder → 998`. Chữ: `Noa follows the call list Moza and her family agreed when she joined. Her emergency rule says: always share.` Xong: `Help is on the way.` Quyết định: `The 998 operator sends the ambulance.`
- Agent: Responder `Runs the agreed call list: Khalid first, then the nearest person` · `Calls 998 with the fixed script; a human operator takes over`; Voice `Stays on the line: “Stay seated, help is coming”`.
- Hand-off: Responder → 998 operator → Hamad → Courier.
- Người xem bấm `Next update →` 4 lần: (+0, 01:34) `Responder calls Khalid (son, Al Ain) — No answer`; (+1, 01:35) `Responder calls Hamad (brother), 450 m away — On the way`; (+2, 01:36) `Responder calls 998 · operator takes over — Ambulance dispatched`; (+2, 01:36) `Voice to Moza — “Help is coming. Stay seated. Don’t eat or drink.”`
- Màn hình: Phone đỏ `Help is coming` / `Stay seated. Don’t eat or drink. Hamad is on the way.` (nút `Call 998 (demo)`); Web `Hamad: “I’m on my way.” (450 m)`; Noa panel: worklist đỏ `Emergency: possible stroke · rule R5`. Pipeline: 3 `emergency: always share`, 4 `call list run`.
- Ghi: 4 `tasks` + 4 log `STEP …`; khi xong: audit `998 call` / `Operator took over` (actor Responder).

**Bước 2 · `Pre-arrival` · `Packet sent ahead`** (btn, Hospital, m+33 = 02:07)
- Hold `Courier → ED`. Chữ: `While the ambulance drives, Noa Courier sends her details ahead. Nobody at the door has to guess her medicines or when it started.` Quyết định: `The emergency doctor activates the stroke team.`
- Agent: Courier `Builds the packet from her shared record` · `Flags blood thinners, so the team knows what is safe` · `Sends it 17 minutes before arrival`.
- Hand-off: Courier → Emergency stroke team.
- Gói hồ sơ (hiện ở Noa panel, `Pre-arrival packet`): `Last known well — 01:22 (heart rate above 120 while still)`; `Symptoms — Speech check failed at 01:32`; `Blood thinners — None` (người dùng chống đông: `Apixaban: clot-busting medicine not safe, consider clot retrieval`); `Medicines — Amlodipine 5 mg · aspirin 100 mg · atorvastatin 20 mg`; `History — …`; `Family — Hamad with her · Khalid informed`; `Sharing — Emergency rule: always share`.
- Người xem (đóng vai bác sĩ cấp cứu) bấm **`Activate the stroke team`** → `Stroke team activated. CT room held.`
- Màn hình: Phone `On the way to Corniche Stroke Centre` / `The stroke team is ready for you.`; Web `Family: The hospital has Moza’s details. Ambulance arriving soon.` Pipeline 4 `packet built`, 5 `pre-alert sent`.
- Ghi: `encounters` + log `ACT Activate the stroke team · Stroke team activated. CT room held.` + audit actor hospital.

**Bước 3 · `Treatment` · `Emergency treatment`** (tl, Hospital, m+50 = 02:24)
- Hold `Stroke team`. Chữ: `The hospital’s own notes flow back into her shared record as they happen.` Xong: `Treated within the hour.` Quyết định: `Clinicians lead. The doctor decides on scans and medicine.`
- Agent: Courier `Files the hospital’s notes into her record as they happen`; Voice `Tells Khalid and Hamad in plain words: “Treated, improving”`.
- Hand-off: Stroke team → Courier → Voice → Family.
- Dòng: (+0, 02:24) `Arrival · NIHSS 6 — Right arm weakness, slurred speech. BP 168/96, glucose 6.4.`; (+7, 02:31) `CT head and CT angiogram — No bleeding. Left M2 occlusion.`; (+28, 02:52) `Tenecteplase — Clot-busting medicine, the doctor’s decision. Door to needle 28 min.` (người dùng chống đông: thay bằng (+25) `Clot retrieval (thrombectomy) — On apixaban, so no clot-busting medicine. The interventional team removes the clot. The doctor’s decision.`); (+76, 03:40) `NIHSS 3 — The stroke score improved. Noa Voice tells the family.`
- Màn hình: Phone `Stroke unit` / `Noa keeps Khalid and Hamad updated.`; Web khi xong `Family: Treated and improving. Stroke unit.`
- Ghi: 4 `encounters` + 4 log `RECORD …`.

**Bước 4 · `Screening` · `Hospital screening`** (tl, Hospital, d0 09:10 = 15 Oct 09:10)
- Hold `Stroke unit + Insight`. Chữ: `The hospital screens for the cause and for what comes next, including the family.` Xong: `Cause found and treated.` Quyết định: `The doctor makes the diagnosis.`
- Agent: Courier `Files each result into her record`; Insight `Links the results with her home history` · `Prepares a screening offer for her family (with consent)`.
- Hand-off: Stroke unit → Courier → Insight → Family screening.
- Dòng: (+0, 09:10) `Swallow screen — Passed: safe for a normal diet.`; (+600, 19:10) `Heart monitoring — Paroxysmal atrial fibrillation found. Stroke-risk score (CHA₂DS₂-VASc) 6.` (điểm tính: tuổi ≥ 75 = 2, nữ 1, tăng huyết áp 1, tiểu đường, suy tim, cộng 2 vì đột quỵ; người chống đông: `Known atrial fibrillation; apixaban levels checked.`); (+1440, 16 Oct 09:10) `MRI brain and heart ultrasound — Small infarct. Heart pumping normally.`; (+1450, 09:20) `Family screening — Noa Insight offers Khalid a blood pressure and rhythm check in his own app.`
- Màn hình: Phone `Stroke unit` / `Noa keeps your family updated.` Pipeline 5 `stroke unit results`, 4 `record updated`.
- Ghi: 4 `encounters` + RECORD.

**Bước 5 · `Discharge` · `Home with a plan`** (teach, Individual, d2 10:45 = 17 Oct 10:45)
- Hold `Coach → Moza`. Chữ: `New medicines: apixaban 5 mg twice a day, perindopril 4 mg, atorvastatin 40 mg. Physio, speech therapy ×6, stroke clinic in 6 weeks.` Quyết định: `The doctor chose the medicines. Moza decides who sees her plan.`
- Agent: Courier `Turns the discharge summary into a plan in her app`; Coach `Explains the blood thinner out loud, in Arabic or English` · `Checks she understood; simpler words if needed`.
- Hand-off: Hospital → Courier → Coach → Moza.
- Teach-back bộ `stroke`: câu hỏi `How will you take your new blood thinner?`; lựa chọn `Only when I feel unwell` / **`Twice a day, every day, and never stop it on my own`** (đúng) / `Once a week`. Sai lựa chọn 1 → `This tablet only protects you if you take it every day, even when you feel well.`; sai lựa chọn 3 → `Once a week is not enough to protect you. It is twice a day.`; kèm bản đơn giản `One tablet in the morning and one in the evening, every day. It stops new clots.` Lời giải thích đầy đủ ở mục 6.3.
- Chọn Khalid và/hoặc Hamad, `Send the plan home` (11:05).
- Màn hình: Phone `Noa Coach` (lời giải thích); pipeline 4 `plan → app`, 3 `routine: clinic + family`, 1 `plan received`.
- Ghi: `checkins` teach-back + `CHECK Noa Coach · teach-back passed`; `CONSENT Moza chose who sees the plan: Khalid, Hamad`.

**Bước 6 · `Monitor` · `Recovery at home`** (daily, Individual, d13 08:10 = 28 Oct 08:10)
- Hold `Navigator → clinic`. Chữ: `Day 11 at home. Enter today’s reading yourself and see what Noa Navigator does with it.` Quyết định: `Navigator sends evidence. It never changes medicines.`
- Agent: Guardian `Reads her BP cuff and pill box every morning`; Voice `Runs the daily speech check, the same test that caught the stroke`; Navigator `Compares the reading with her target` · `Routes it to the clinic only if it needs a doctor`.
- Hand-off: Guardian → Voice → Navigator → Stroke clinic.
- Người xem: bài giọng nói buổi sáng (mặc định `usual` → `CHECK Noa Voice · speech check: as usual (score 1.00)`), nhập `Morning blood pressure, 5-day average` (mặc định 146, mục tiêu < 130), `Send today’s reading`.
- Mặc định 146 không đạt → alert vàng, `ROUTE Noa Navigator · Blood pressure above target for 5 days: average 146 mmHg, with every dose taken → Stroke clinic · Dr Omar Haddad`. Nhập 129 → `CHECK ... is on target (under 130) → no alert` và bước 7 tự xong.
- Màn hình: Phone `Good morning, Moza` / `Time for your 1-minute check-in.`, rồi `Noa Navigator` `I’ve sent this to {{team}}.` hoặc `On target today. Well done.`

**Bước 7 · `Hospital` · `Hospital acts`** (accept, Hospital, d13 09:30)
- Hold `Clinic → Coach`. Quyết định: `Dr Omar Haddad decides the new dose.`
- Agent: Navigator `Puts the alert on the clinic worklist with the evidence`; Coach `After the doctor’s change: tells Moza and checks she understood`.
- Hand-off: Navigator → Stroke clinic → Coach → Moza.
- Người xem bấm `Accept and act` → `ACCEPT Stroke clinic · Dr Omar Haddad accepted the alert · Review the perindopril dose`; `tasks` `Review the perindopril dose (the clinician decides)`.

**Bước 8 · `Department` · `Report to the Department`** (report, Government, d16 09:00 = 31 Oct 09:00)
- Hold `Analyst → DoH`. Quyết định: `The hospital signs off the report before it is sent.`
- Agent: Analyst `Counts the pathway measures from the hospital’s records` · `Removes names: Moza is one anonymous case`.
- Hand-off: Analyst → Hospital → Department of Health.
- `Send the monthly report` → `POST Noa Analyst drafted, hospital signed off · Stroke pathway report → Department of Health`. Government: `Department of Health · Stroke pathway · October 2026 · no names`, KPI cố định: `Arrived with a pre-alert 64%` (+ this case), `Median door to needle 41 min`, `AF found → blood thinner at discharge 92%`, `Home alerts acted on in 24 h 88%`, `30-day readmission 6.1%`, `Recovered (mRS 0–2) at 90 days 71%`.

**Kết quả mong đợi mặc định** (31 tick): why1 R1, tTrig 01:31, tCheck 01:32, tAct 01:34, giọng 0,33 đỏ, câu trả lời `fine`, R5 `stroke_em`, bước cuối 8/8, đồng hồ 31 Oct 09:00. DB: agents 9, patients 1, consents 4, observations 2, checkins 2, alerts 2, tasks 6, encounters 9, reports 1, audit 6. Dòng tự kiểm: `Rule R1 met at 01:31; Noa Voice checked at 01:32 (1 min, target ≤ 1)` | `Waited for the full 10 minutes before waking Moza, so a short spike wakes nobody` | `998 called at 01:36, 4 min after the check (target ≤ 3)` | `Last known well 01:22 sent ahead for the stroke team`. Log: Phụ lục D `# stroke`.

**Cách test case này** (đã chạy thật, seed mặc định):

| Đầu vào (khác mặc định) | Giọng / trả lời | Mong đợi |
|---|---|---|
| (mặc định) | slurred / fine | R5, như trên |
| | usual / fine | Đứng xuống: `Stand down`, luật ghi **R1**, lý do `Moza answered clearly and her speech is normal. Noa stands down and tells Khalid and Hamad she is fine.` |
| | usual / none | R5 `stroke_em` |
| | none | R5 (giọng 0,00 đỏ) |
| hr 120, 121, 122, 123 | | R12 `All readings are within her normal range...` |
| hr 124 | slurred | R5, tTrig 01:31 |
| dur 9 | | R12, lý do `Noticed: fast heart rate settled after 9 min. No rule met, so nobody is woken.` |
| dur 10 | slurred | R5, tTrig 01:31 |
| `Moving` | | R12, `Noticed: fast heart rate while moving (expected)...`; kiểm thêm `A fast heart rate while moving (stairs) is expected, so no alert` |
| SpO2 88 | usual / pillows | trigger R4 lúc 01:22, câu hỏi hf, **R8 `hf_em`** |
| hr 200 | | Bị từ chối (khoảng 45–180), không Play được |
| hr 180, dur 20 | usual / fine | Đứng xuống (R1) |
| Ở bước 6 nhập 129 | | Không cảnh báo, bước 7 tự xong (`Nothing to act on`) |
| Ở bước 6 dùng giọng `slurred` | | Bước 6 không xong; thẻ báo câu `In real use, a failed speech check here...` |

Biên: hr 120 / 121 / 123 / 124 (hiểu rằng 121–123 phụ thuộc nhiễu), dur 9 / 10, `still` bật/tắt, điểm giọng nói 0,59 / 0,60 (không chỉnh trực tiếp được trên giao diện; dùng `submitSpeech` với kết quả dựng sẵn ở test đơn vị), daily 129 / 130.

---

<a id="c-fall"></a>
### 3.7 `fall`: Hessa, té ngã ban đêm

**Câu chuyện và nhân vật.** Hessa Al Ketbi, 82, rung nhĩ, **uống apixaban** (thuốc chống đông), loãng xương. Bình thường đi vệ sinh 1 lần/đêm, điểm giọng nói 0,92. Con trai Saif làm ca đêm (f1), hàng xóm Noura có chìa khóa, cách 60 m (f2). Bệnh viện: Capital General Hospital. Lúc 03:05 bắt đầu theo dõi; đồng hồ phát hiện cú ngã mạnh trên đường vào nhà vệ sinh, bà nằm trên sàn 6 phút. Câu một dòng: `After a hard fall on a blood thinner, Noa asks, hears “I can’t get up” and calls 998 with the head-CT flag.`

**Mục tiêu.** Té ngã được phát hiện trong vài phút; nếu không đứng dậy được thì gọi 998 và báo trước cho bệnh viện về thuốc chống đông (cần CT đầu); nếu đứng dậy được và nói bình thường thì **không** gọi xe, hướng dẫn đứng dậy và đặt lịch đánh giá nguy cơ té trong 7 ngày.

**Đầu vào mặc định:** hr 96, dur 4, `Not moving`, **té: có**, floor **6**, cảm biến đường huyết tắt (null), SpO2 95, cân nặng 0. Autopilot: giọng `usual`, trả lời `cant`.

**Bước 0 (mặc định).** Phút cuối = 10 + max(4, 6, 1) + 6 = 22. Ở phút 12 (03:17 = tTrig) có té và floor ≥ 2 → **R2**. 03:18: `DETECT Noa Guardian · rule R2 met: fall detected, still on the floor after 2 min → hand-off to Noa Voice`, `ALERT Noa Guardian → Saif and Noura: “Noa is checking on Hessa.”`, `ASK Noa Voice calls Hessa: “Hessa, I felt a hard fall. Can you get up on your own?”`, giọng `as usual (score 1.00)`. 03:20 (tAct): trả lời `cant` → dòng 3 → `DECIDE ... R7 → Emergency: fall, can’t get up`.

**Bảng nhánh của case:**

| Điều kiện | Giọng / trả lời | Kết quả |
|---|---|---|
| té, floor ≥ 2 | `cant` | **R7 `fall_em`** (998, CT đầu nếu chống đông) |
| | `none` hoặc không nói | **R7 `fall_em`** |
| | `ok`, giọng bình thường hoặc vàng | **R11 `fall_minor`** (không 998) |
| | `ok`, giọng đỏ | **R5 `stroke_em`** (thang kiểm giọng trước dòng `fall_minor`) |
| | `ok`, SpO2 < 90 | **R8 `hf_em`** (SpO2 ≤ 92 cũng làm R4 kích hoạt trước ở phút 10) |
| | `cant`, SpO2 88 | R4 kích hoạt lúc 03:15, câu hỏi vẫn là câu té ngã, **R7** |
| floor < 2 | | **R12**, `Noticed: fall, but up again within 2 minutes...` |
| không té | | **R12** |

**Hành trình `fall_em`** (`Emergency: fall, can’t get up`, R7, báo cáo `Falls pathway`, teach `fall`, daily `fall`, đêm tới bước 3). Giờ theo tAct 15 Oct 03:20.

**Bước 1 · `Help` · `Noa calls for help`** (tl, Individual, m+0 = 03:20)
- Hold `Responder → 998`. Chữ: `Hessa can’t get up. Every minute on the floor matters, so Noa Responder calls for help at once.` Xong `Help is on the way.` Quyết định `The 998 operator sends the ambulance.`
- Agent: Responder `Runs the call list: Saif, then the nearest person with a key` · `Calls 998 with the fixed script; a human operator takes over`; Voice `Stays with Hessa: “Don’t try to get up. Stay warm.”`.
- Hand-off: Responder → 998 operator → Noura → Courier.
- Dòng: (+0, 03:20) `Responder calls Saif (son, night shifts) — No answer`; (+1, 03:21) `Responder calls Noura (neighbour, has a key), 60 m away — Coming with the key`; (+2, 03:22) `Responder calls 998 · operator takes over — Ambulance dispatched`; (+2, 03:22) `Voice to Hessa — “Don’t try to get up. Noura is coming. Stay warm.”`
- Màn hình: Phone đỏ `Help is coming` / `Don’t try to get up. Noura is coming.`; Web `Noura: “Coming now, I have the key.”`; pipeline 3 `emergency: always share`, 4 `call list run`. Ghi: 4 tasks + STEP; audit 998.

**Bước 2 · `Pre-arrival` · `Packet sent ahead`** (btn, Hospital, m+25 = 03:45)
- Hold `Courier → ED`. Chữ: `Noa Courier tells the hospital what matters before she arrives: the time of the fall, the time on the floor, and the blood thinner.` Quyết định `The emergency doctor orders the scans.`
- Agent: Courier `Builds the packet from her record and tonight’s data` · `Flags the blood thinner: a head CT is needed after any fall`. Hand-off: Courier → Emergency team.
- Gói: `Fall — 03:15, detected by the watch`; `Time on the floor — 6 min before Noa acted · Noura arrived 4 min later`; `Blood thinner — Apixaban: head CT needed` (người không dùng: `None`); `Symptoms — Can’t get up, right hip pain`; `Speech check — score 1.00 (as usual)`; `Medicines — Apixaban 5 mg twice a day · amlodipine 5 mg · alendronate weekly`; `History — …`.
- Nút **`Prepare a head CT and hip X-ray`** → `Head CT and hip X-ray ready on arrival.` Phone `On the way to Capital General Hospital` / `The team knows about your fall.`; Web `Family: The hospital has Hessa’s details.`

**Bước 3 · `Treatment` · `Emergency treatment`** (tl, Hospital, m+45 = 04:05)
- Hold `Emergency team`. Chữ `The hospital’s notes flow back into her record.` Xong `Hip fracture found; surgery planned.` Quyết định `The doctors decide on scans, pain relief and surgery.`
- Agent: Courier `Files the scan reports into her record`; Voice `Tells Saif in plain words what was found`. Hand-off: Emergency team → Courier → Voice → Family.
- Dòng: (+0, 04:05) `Arrival — Right leg short and turned out. Pain 8 out of 10.`; (+20, 04:25) `CT head — No bleeding (important on a blood thinner).`; (+35, 04:40) `Hip X-ray — Fractured right hip.`; (+50, 04:55) `Pain relief and plan — Nerve block for pain. Surgery within 36 hours; the surgeon decides. Apixaban paused.`
- Phone `Orthopaedic ward` / `Noa keeps Saif updated.`; Web khi xong `Family: Broken hip. Surgery planned; no bleeding on the head scan.`

**Bước 4 · `Screening` · `Hospital screening`** (tl, Hospital, d1 09:00 = 16 Oct)
- Hold `Ward + Insight`. Chữ `The hospital looks for why she fell, so it doesn’t happen again.` Xong `Cause found: blood pressure drops on standing.` Quyết định `The doctors decide the cause and treatment.`
- Agent: Courier `Files each result`; Insight `Links the fall with home data: 3 bathroom trips a night this week (usual 1)` · `Suggests motion lights and a standing blood pressure check`. Hand-off: Ward → Courier → Insight → Home safety.
- Dòng: (+0, 09:00) `Hip surgery — Done on day 1. Walking with a frame on day 2.`; (+60, 10:00) `Confusion screen — Clear.`; (+120, 11:00) `Lying and standing blood pressure — Drops 24 mmHg on standing: the likely cause of the fall.`; (+180, 12:00) `Bone health and home — Osteoporosis treatment reviewed. Noa Insight books motion lights for the bathroom route.`
- Phone `Orthopaedic ward` / `Physio twice a day.`

**Bước 5 · `Discharge` · `Home with a plan`** (teach, Individual, d5 11:00 = 20 Oct)
- Hold `Coach → Hessa`. Chữ `Home with a walking frame, physio at home 3 times a week, apixaban restarted, motion lights fitted.` Quyết định `The doctors chose the plan. Hessa decides who sees it.`
- Agent: Courier `Turns the discharge summary into a plan in her app`; Coach `Explains how to get up safely, out loud` · `Checks she understood`. Hand-off: Hospital → Courier → Coach → Hessa.
- Teach-back bộ `fall`: `What will you do when you get up at night?`; `Stand up quickly` / **`Sit on the edge of the bed for a minute, then stand with my frame`** / `Walk in the dark so I don’t wake anyone`. Kế hoạch 11:20: `Hessa chose who sees the plan: Saif, Noura`.

**Bước 6 · `Monitor` · `Recovery at home`** (daily, Individual, d14 08:10 = 29 Oct)
- Hold `Navigator → doctor`. Chữ `Two weeks at home. Enter today’s standing blood pressure drop and see what Noa does.` Quyết định `Navigator sends evidence. It never changes medicines.`
- Agent: Guardian `Watches movement and night bathroom trips`; Voice `Runs the daily speech check`; Navigator `Checks the standing blood pressure reading` · `Routes it only if it needs a doctor`. Hand-off: Guardian → Voice → Navigator → Family doctor.
- Số đo `Blood pressure drop on standing` mặc định 22 (mục tiêu < 20) → `ROUTE Noa Navigator · Blood pressure drops 22 mmHg when she stands, still the likely cause of falls → Family doctor · Dr Fatima Al Ali`.

**Bước 7 · `Doctor` · `Doctor acts`** (accept, Hospital, d14 10:00)
- Hold `Doctor → Coach`. Quyết định `Dr Fatima Al Ali decides on the medicine.` Agent: Navigator `Puts the alert on the family doctor’s worklist`; Coach `Explains the change to Hessa and checks she understood`. Hand-off: Navigator → Family doctor → Coach → Hessa.
- `Accept and act` → `ACCEPT Family doctor · Dr Fatima Al Ali accepted the alert · Review amlodipine (may stop it)`.

**Bước 8 · `Department` · `Report to the Department`** (report, d17 09:00 = 1 Nov)
- Quyết định `The hospital signs off the report.` Analyst `Counts the falls pathway measures` · `Removes names`. Government `Falls pathway`: `Median time on the floor 14 min` (this case: 6 min), `Hip surgery within 36 h 87%`, `Head CT if on a blood thinner 96%`, `Falls with a home safety fix 64%`, `30-day readmission 8.2%`, `Home within 30 days 71%`.

**Hành trình `fall_minor`** (`Fall, got up safely`, R11, báo cáo `Falls pathway` bộ fallm, **không teach**, daily `fall`, đêm tới bước 1). Tới khi trả lời `ok` và giọng không đỏ.

| # | Bước (kind · mode) | Khi nào | Hold · ai quyết định | Agent và câu thoại | Người xem làm gì · nội dung | Màn hình |
|---|---|---|---|---|---|---|
| 1 | `Guide` · `Noa guides her up` (tl · ind) | m+0 (03:20) | `Voice → Hessa` · `No ambulance: Hessa is up, talking clearly and has no pain.` | Voice `Talks her through getting up safely` · `Repeats the speech check once she is sitting`; Guardian `Watches movement closely for the rest of the night`. Hand-off Voice → Hessa → Guardian | Chữ `Hessa can get up and her speech is normal, so Noa does not call 998. It guides her instead.` Dòng: (+0) `Voice guides Hessa — “Roll onto your side, crawl to the chair, rest, then sit.”`; (+4) `Hessa is sitting — No pain. Speech check normal.`; (+5) `Saif gets a note — Fell, got up with Noa’s help, fine. No need to come now.`; (+6) `Guardian watches closely — Checks movement every 15 minutes until morning.` Xong `Safe, and nobody was woken needlessly.` | Phone xanh `You’re safe` / `Noa is watching the rest of the night.`; Web `Saif: Fell, got up with Noa’s help, fine.`; pipeline 3 `routine: family note`, 4 `guided at home` |
| 2 | `Review` · `Fall-risk review` (btn · hosp) | d1 09:00 | `Navigator → clinic` · `The clinic decides what to change.` | Navigator `Books a fall-risk review within 7 days` · `Sends last night’s data: time on the floor, bathroom trips`; Insight `Suggests a standing blood pressure check`. Hand-off Navigator → Falls clinic | Chữ `Even without an injury, a fall is a warning. Noa makes sure someone looks into why.` Gói: `Fall — 03:15, got up in 4 minutes`; `Blood thinner — Apixaban (no head symptoms, speech normal)` (người không dùng: `None`); `Pattern — 3 bathroom trips a night this week (usual 1)`; `Request — Fall-risk review and standing blood pressure`. Nút **`Book the fall-risk review`** → `Review booked for next week.` | Phone `Fall-risk review` / `Booked for next Tuesday, 10:00.` |
| 3 | `Monitor` · `At home` (daily · ind) | d8 08:10 | `Navigator → doctor` · `Navigator sends evidence. It never changes medicines.` | Guardian `Watches night movement`; Voice `Runs the daily speech check`; Navigator `Checks the standing blood pressure reading` | Chữ `Enter today’s standing blood pressure drop and see what Noa does.` Daily `fall` (mặc định 22, không đạt) | |
| 4 | `Doctor` · `Doctor acts` (accept · hosp) | d8 10:00 | `Doctor → Coach` · `The family doctor decides on the medicine.` | Navigator `Puts the alert on the family doctor’s worklist`; Coach `Explains the change to Hessa` | `Accept and act` (tự xong nếu số đo đạt) | |
| 5 | `Department` · `Report to the Department` (report · gov) | d17 09:00 | `Analyst → DoH` · `The health centre signs off the report.` | Analyst `Counts falls managed at home` · `Removes names`. Hand-off Analyst → Health centre → Department of Health | `Send the monthly report` | Government `Falls pathway`: `Got up with Noa’s guidance 58%`, `Fall-risk review within 7 days 83%`, `Ambulance calls avoided 212`, `Repeat fall within 30 days 11%` |

Với `fall_minor` dòng tự kiểm là `Rule R2 met at 03:17; Noa Voice checked at 03:18 (1 min, target ≤ 1)` | `Up and talking clearly: no ambulance, fall-risk review booked`.

**Kết quả mong đợi mặc định** (31 tick): why1 R2, tTrig 03:17 / tCheck 03:18 / tAct 03:20, giọng 1,00 xanh, trả lời `cant`, R7 `fall_em`, bước cuối 8/8, đồng hồ 1 Nov 09:00. DB: agents 9, patients 1, consents 4, observations 2, checkins 2, alerts 2, tasks 6, encounters 9, reports 1, audit 6. Dòng tự kiểm: `Rule R2 met at 03:17; Noa Voice checked at 03:18 (1 min, target ≤ 1)` | `998 called at 03:22, 4 min after the check (target ≤ 3)` | `On a blood thinner: head CT flagged before arrival`. Log: Phụ lục D `# fall`.

**Cách test case này** (đã chạy thật): `ok` → R11 `fall_minor`; `ok` + giọng líu (0,32) → R5 `stroke_em` với `Last known well 03:15 sent ahead for the stroke team` và các dòng biến thể chống đông; `none` → R7; không nói → R7; floor 1 → R12; floor 2 + `ok` → R11; tắt té → R12; SpO2 88 + `ok` → R8. Biên: floor 1 / 2; dòng `On a blood thinner...` chỉ khi người đó dùng chống đông (đổi sang người khác ở case `own` để thấy bản `None`).

---

<a id="c-hypo"></a>
### 3.8 `hypo`: Saeed, hạ đường huyết ban đêm

**Câu chuyện và nhân vật.** Saeed Al Nuaimi, 69, tiểu đường type 2 từ 2011, tiêm insulin từ 2021, chức năng thận giảm nhẹ (eGFR 52), đeo cảm biến đường huyết liên tục (CGM). Bình thường đêm 5–8 mmol/L, điểm giọng 0,95. Vợ Shamsa ngủ phòng bên (f1), con trai Rashid cách 2 km (f2). Bệnh viện: Capital General Hospital. Lúc 02:40 bắt đầu; đường huyết 2,7. Câu một dòng: `Glucose drops to 2.7 while he sleeps; Noa checks that he answers, then guides sugar at home or calls 998 if he cannot.` Moment: hạ đường huyết có thể giống đột quỵ, và gọi báo động đột quỵ sẽ gửi sai người.

**Mục tiêu.** Kiểm đường huyết **trước** giọng nói (hạ đường huyết trông giống đột quỵ); trả lời rõ thì xử lý tại nhà (15 g đường nhanh, đo lại sau 15 phút, bác sĩ buổi sáng); không trả lời, lú lẫn hoặc giọng đỏ thì 998 và hướng dẫn người nhà dùng bút glucagon; hai lần đo lại vẫn thấp thì leo thang 998.

**Đầu vào mặc định:** hr 104, dur 5, `Not moving`, không té, **glu 2,7**, SpO2 97, cân nặng 0. Autopilot: giọng `usual`, trả lời `drink`, giá trị đo lại 5,1.

**Bước 0 (mặc định).** Phút 10 (02:50 = tTrig): glu < 4 → **R3**. 02:51: `DETECT Noa Guardian · rule R3 met: glucose 2.7 mmol/L → hand-off to Noa Voice`, `ALERT Noa Guardian → Shamsa and Rashid: “Noa is checking on Saeed.”`, `ASK Noa Voice calls Saeed: “Saeed, your sugar is low. Can you drink the juice by your bed?”`, giọng `as usual (score 1.00)`. 02:53: trả lời `drink` → dòng 2 → `DECIDE ... R9 → Low sugar, treated at home`.

**Bảng nhánh:**

| Điều kiện | Giọng / trả lời | Kết quả |
|---|---|---|
| glu < 4 | bình thường / `drink` | **R9 `hypo_home`** |
| | `confused` | **R6 `hypo_em`** (998) |
| | giọng đỏ (kể cả khi trả lời `drink`) | **R6 `hypo_em`** |
| | không nói / `none` | **R6 `hypo_em`** |
| | `drink`, SpO2 88 | **R9** (đường huyết được kiểm trước dòng SpO2; xem mục 11) |
| `hypo_home` rồi đo lại < 4 hai lần | | leo thang **R6 `hypo_em`** |
| glu 4,0 | | **R12** |
| glu < 3 (ví dụ 2,9) | `drink` | vẫn **R9** (`hypoS` không dùng) |
| glu 1,4 | | bị từ chối (khoảng 1,5–15) |
| có té + glu thấp (ví dụ ở `own` với Saeed) | `ok` | trigger R3 nhưng câu hỏi là câu **té ngã**; kết quả R9 |

**Hành trình `hypo_home`** (`Low sugar, treated at home`, R9, báo cáo `Diabetes: night hypoglycaemia` bộ hypo, teach `hypo`, daily `hypo`, đêm tới bước 1). Giờ theo tAct 15 Oct 02:53.

**Bước 1 · `Treat` · `Treat at home`** (recheck, Individual, m+0 = 02:53)
- Hold `Coach → Saeed`. Chữ `Saeed answered clearly, so Noa treats the low sugar at home first. You enter the glucose 15 minutes later.` Quyết định `Saeed is answering clearly, so no ambulance yet. If two rechecks fail, Responder calls 998.`
- Agent: Coach `Tells him exactly what to take: 15 g of fast sugar` · `Rechecks after 15 minutes`; Guardian `Watches the glucose sensor every minute`; Responder `On standby: calls 998 if the sugar doesn’t come up after two tries`. Hand-off: Coach → Saeed → Guardian.
- Thẻ: `Noa Coach: “Drink the juice by your bed now. I’ll check again in 15 minutes.”`, ô `Glucose at {{at}}` (mặc định 5,1), gửi.
- Logic `recheck()`: lần n ghi `observations` `glucose recheck {{v}} mmol/L` lúc tAct + 15 × n. v ≥ 4 → log `CHECK Noa Coach · recheck {{v}} mmol/L → recovered; snack now; doctor in the morning`, bảng tin `Shamsa: Sugar back to {{v}}. Saeed is eating a snack.`, bước xong (thẻ `Recovered: {{v}} mmol/L`). v < 4 lần 1 → `CHECK Noa Coach · recheck {{v}} mmol/L → still low: another 15 g, check again in 15 min` (thẻ `Still low` / `Noa Coach: “Another 15 g of sugar, please.” If the next check is still low, Responder calls 998.`, nút `Check again`). v < 4 lần 2 → log `ESCALATE Two rechecks still low → hand-off to Noa Responder: 998`, quyết định đổi thành **R6 `hypo_em`** (`escalated: true`), tAct = giờ lần đo thứ hai, tiến độ các bước xóa, alert đỏ `Low sugar not recovering after two tries` / R6 / `Emergency services`, và dòng tự kiểm thêm `Two rechecks stayed below 4.0, so Responder called 998 at once`. Thẻ gợi ý `Try a value under 4.0 twice to see Noa escalate to 998.`
- Màn hình: Phone vàng `Noa Coach` / `Drink the juice by your bed now. I’ll check again in 15 minutes.`; Web `Shamsa: Noa woke Saeed: low sugar, drinking juice. Noa is watching.`; pipeline 4 `treat at home`.
- Mặc định: `CHECK Noa Coach · recheck 5.1 mmol/L → recovered; snack now; doctor in the morning` lúc 03:08.

**Bước 2 · `Doctor` · `Doctor reviews insulin`** (btn, Hospital, d0 08:30 = 15 Oct 08:30)
- Hold `Navigator → doctor`. Chữ `A night hypo is a sign the dose is wrong. Noa makes sure a doctor sees it the same morning.` Quyết định `The doctor decides the new insulin dose.`
- Agent: Navigator `Sends the night’s glucose curve to the family doctor before clinic opens`; Insight `Points out that kidney function is reduced, so insulin lasts longer`. Hand-off: Navigator → Family doctor → Coach.
- Gói: `Last night — Glucose 2.7 at 02:50; recovered after fast sugar`; `Insulin — Insulin glargine 24 units at night · metformin 1 g twice a day`; `Kidneys — eGFR 52: insulin lasts longer`; `Request — Review night insulin today`.
- Nút **`Review the insulin dose`** → `Night insulin lowered from 24 to 20 units.` Phone `Your doctor has your readings` / `Expect a call this morning.`

**Bước 3 · `Explain` · `Noa explains the change`** (teach, Individual, d0 11:00)
- Hold `Coach → Saeed`. Chữ `Night insulin glargine lowered to 20 units.` Quyết định `The doctor chose the dose. Saeed decides who sees it.` Agent: Coach `Explains the new dose and the warning signs, out loud` · `Checks he understood`. Hand-off: Doctor → Coach → Saeed.
- Teach-back bộ `hypo`: `If your sugar is low at night, what do you do first?`; `Go back to sleep` / **`Take 15 g of fast sugar, like juice, then check again in 15 minutes`** / `Take more insulin`. Kế hoạch 11:20 `Saeed chose who sees the plan: Shamsa, Rashid`.

**Bước 4 · `Monitor` · `Nights at home`** (daily, Individual, d7 08:10 = 22 Oct)
- Hold `Navigator → clinic`. Chữ `One week later. Enter the lowest night glucose and see whether Noa needs to act.` Quyết định `Navigator sends evidence. It never changes insulin.` Agent: Guardian `Watches the glucose sensor every night`; Voice `Runs the daily speech check`; Navigator `Checks the lowest night glucose this week`.
- Mặc định 4,6 (mục tiêu ≥ 4) → **đạt**: `CHECK Noa Navigator · Lowest night glucose, last 7 nights 4.6 mmol/L is on target (4.0 or above) → no alert`. Nhập 3,9 → alert `Night glucose fell to 3.9 mmol/L this week, even on the lower insulin dose` → `Diabetes clinic · Dr Aisha Al Hosani`.

**Bước 5 · `Clinic` · `Clinic acts`** (accept, Hospital, d7 10:00): Hold `Clinic → Coach`; quyết định `The diabetes doctor decides the dose.`; Navigator `Puts the alert on the diabetes clinic worklist`; Coach `Explains any change to Saeed`. Mặc định **tự xong** (không có cảnh báo); nếu có: `Review the insulin dose again`.

**Bước 6 · `Department` · `Report to the Department`** (report, d17 09:00 = 1 Nov): quyết định `The health centre signs off the report.`; Analyst `Counts night hypos treated at home` · `Removes names`. Government `Diabetes: night hypoglycaemia`: `Night hypos treated at home 74%`, `Insulin reviewed within 24 h 88%`, `Hypos needing an ambulance 19`, `Repeat severe hypo in 30 days 4%`.

**Hành trình `hypo_em`** (`Emergency: severe low sugar`, R6, báo cáo bộ hypoe, teach `hypo`, daily `hypo`, đêm tới bước 3). Giờ dưới đây nếu tới thẳng từ bước 0 (tAct 02:53); nếu leo thang thì tính từ giờ lần đo lại thứ hai.

| # | Bước (kind · mode) | Khi nào | Hold · ai quyết định | Agent và câu thoại | Nội dung · người xem làm gì | Màn hình |
|---|---|---|---|---|---|---|
| 1 | `Help` · `Noa calls for help` (tl · ind) | m+0 | `Responder → 998` · `The 998 operator sends the ambulance. Shamsa gives the glucagon.` | Responder `Wakes Shamsa with a loud alarm on her phone` · `Calls 998 with the fixed script; a human operator takes over`; Coach `Guides Shamsa to use the glucagon pen in the drawer`. Hand-off Responder → Shamsa → 998 operator → Courier | Chữ `Low sugar and no clear answer: this is an emergency. Noa wakes the person next door first.` Dòng: (+0) `Responder wakes Shamsa (wife, asleep next door) — “He won’t wake properly.”`; (+1) `Coach guides Shamsa — “Don’t give food or drink if he can’t swallow. Use the glucagon pen in the drawer.”`; (+2) `Responder calls 998 · operator takes over — Ambulance dispatched`; (+6) `Shamsa gives glucagon — Noa logs the time for the paramedics.` Xong `Glucagon given; ambulance on the way.` | Phone đỏ `Help is coming` / `Shamsa is with you.`; Web `Rashid: Noa: your father’s sugar is very low; ambulance called, your mother is with him.` |
| 2 | `Pre-arrival` · `Packet sent ahead` (btn · hosp) | m+20 | `Courier → ED` · `The emergency doctor decides treatment.` | Courier `Sends the glucose curve, the insulin dose and the glucagon time` | Chữ `The team knows the cause before he arrives, so nobody wastes time on a stroke work-up.` Gói: `Glucose — 2.7 mmol/L at 02:50, falling for 3 hours`; `Glucagon — Given by Shamsa, 6 min after the alert`; `Insulin — …`; `Kidneys — eGFR 52: insulin lasts longer`; `Speech check — …`. Nút **`Ready IV glucose`** → `IV glucose ready on arrival.` | Phone `On the way to Capital General Hospital` / `The team knows your sugar is low.` |
| 3 | `Treatment` · `Emergency treatment` (tl · hosp) | m+35 | `Emergency team` · `The doctors decide treatment.` | Courier `Files the hospital’s notes`; Voice `Updates Shamsa and Rashid` | (+0) `Arrival — Glucose 3.4 after glucagon. Drowsy.`; (+10) `IV glucose — Glucose 7.8. Awake and talking.`; (+40) `Cause — Insulin dose too high for his kidney function.`; (+360) `Observed for 6 hours — Stable. Night insulin lowered to 20 units by the doctor.` Xong `Recovered; insulin lowered.` | Phone `Emergency department` / `Your family has been updated.`; Web khi xong `Family: Awake and talking. Home later today.` |
| 4 | `Discharge` · `Home with a plan` (teach · ind) | d0 11:00 | `Coach → Saeed` · `The doctor chose the dose. Saeed decides who sees it.` | Courier `Turns the discharge letter into a plan in his app`; Coach `Explains the new dose and the warning signs` · `Checks he understood` | Chữ `Night insulin lowered to 20 units. Glucagon pen replaced.` Teach-back bộ `hypo` | Phone `Noa Coach` |
| 5 | `Monitor` · `Nights at home` (daily · ind) | d7 08:10 | `Navigator → clinic` · `Navigator sends evidence. It never changes insulin.` | Guardian, Voice, Navigator như `hypo_home` | Chữ `Enter the lowest night glucose this week.` Daily `hypo` | |
| 6 | `Clinic` · `Clinic acts` (accept · hosp) | d7 10:00 | `Clinic → Coach` · `The diabetes doctor decides the dose.` | Navigator, Coach | | |
| 7 | `Department` · `Report to the Department` (report · gov) | d17 09:00 | `Analyst → DoH` · `The hospital signs off the report.` | Analyst `Counts severe hypos and how they were handled` · `Removes names` | | Government bộ hypoe: `Severe hypos with glucagon at home 61%`, `Insulin reviewed before discharge 93%`, `Hypos needing an ambulance 19` (+ this case), `Repeat severe hypo in 30 days 4%` |

Dòng tự kiểm `hypo_em`: `Rule R3 met at 02:50; Noa Voice checked at 02:51 (1 min, target ≤ 1)` | `998 called at 02:55, 4 min after the check (target ≤ 3)` | `Low sugar can look like a stroke, so Noa checked glucose first and did not start a stroke alert`. Khi leo thang (đo lại 3,5 rồi 3,6): `998 called at 03:25, 34 min after the check (target ≤ 3)` cùng dòng `Two rechecks stayed below 4.0, so Responder called 998 at once` (con số 34 phút là hệ quả của cách tính, mục 12).

**Kết quả mong đợi mặc định** (17 tick): why1 R3, tTrig 02:50 / tCheck 02:51 / tAct 02:53, giọng 1,00, trả lời `drink`, R9 `hypo_home`, bước cuối 6/6, đồng hồ 1 Nov 09:00. DB: agents 9, patients 1, consents 4, observations 3, checkins 2, alerts 1, tasks 1, encounters 1, reports 1, audit 5. Dòng tự kiểm: `Rule R3 met at 02:50; Noa Voice checked at 02:51 (1 min, target ≤ 1)` | `Answering clearly, so no ambulance: fast sugar now, recheck at 03:08`. Log: Phụ lục D `# hypo`.

**Cách test case này** (đã chạy thật): `confused` → R6; giọng líu + `drink` → R6; không nói → R6; glu 4,0 → R12; glu 3,9 → R9; glu 2,9 → R9; đo lại 3,5 rồi 4,2 → vẫn R9, bước 1 xong ở lần hai; đo lại 3,5 rồi 3,6 → leo thang R6; SpO2 88 + `drink` → R9. Biên: glu 3,9 / 4,0; 2,9 / 3,0 (không khác nhau, ghi nhận như lỗi đã biết); đo lại 3,9 / 4,0; daily 3,9 / 4,0.

---

<a id="c-hf"></a>
### 3.9 `hf`: Mariam, ứ dịch do suy tim

**Câu chuyện và nhân vật.** Mariam Al Shamsi, 81, suy tim (phân suất tống máu 35%), từng nhập viện vì ứ dịch tháng 3/2026. Cân nặng khô 61,0 kg, oxy bình thường 95–97%, điểm giọng 0,93. Con trai Ahmed (f1), con gái Latifa cách 1 km (f2). Bệnh viện: Capital General Hospital. Sáng 08:10: cân nặng tăng 2,4 kg trong 3 ngày, SpO2 93, hơi khó thở. Câu một dòng: `A 2.4 kg weight gain in three days sends the heart failure nurse the same day: not 998, and not a wait.`

**Mục tiêu.** Bắt sớm ứ dịch và chuyển điều dưỡng suy tim **ngay trong ngày** (không 998, không chờ); chỉ gọi 998 khi khó thở lúc nghỉ, SpO2 < 90 hoặc không trả lời.

**Đầu vào mặc định:** hr 92, dur 0, `Moving`, không té, cảm biến đường huyết tắt, SpO2 **93**, cân nặng **+2,4**. Autopilot: giọng `usual`, trả lời `pillows`. Case ban ngày (không có chế độ đêm).

**Bước 0 (mặc định).** Phút 10 (08:20): cân nặng ≥ 2 → **R4**. 08:21: `DETECT Noa Guardian · rule R4 met: weight up 2.4 kg / oxygen 93% → hand-off to Noa Voice` (**không có dòng ALERT và không báo gia đình**: ngoại lệ riêng của Mariam với R4), `ASK Noa Voice calls Mariam: “Mariam, your weight is up. Are you more breathless than usual?”`, giọng `as usual (score 1.00)`. 08:23: `pillows` → dòng 8 → `DECIDE ... R10 → Fluid build-up: same-day nurse`.

**Bảng nhánh:**

| Điều kiện | Giọng / trả lời | Kết quả |
|---|---|---|
| R4 (cân ≥ 2 hoặc SpO2 ≤ 92) | bình thường / `pillows` | **R10 `hf_clinic`** |
| | bình thường / `fine` (“I feel fine”) | **R10 `hf_clinic`** (dòng tự kiểm vẫn in `Breathless only lying flat...`, xem mục 12) |
| | `rest` | **R8 `hf_em`** (998) |
| | không nói | **R8 `hf_em`** (dòng 4; bảng luật đọc theo nghĩa đen ra R5: lệch benchmark `C-hf-nospeech`) |
| | giọng đỏ + `pillows` | **R5 `stroke_em`** |
| SpO2 89 | `pillows` | **R8 `hf_em`** |
| SpO2 90 | `pillows` | R10 |
| cân 1,9, SpO2 93 | | **R12** |
| cân 2,0, SpO2 96 | `pillows` | R10 |
| cân 0, SpO2 92 | `pillows` hoặc `fine` | R10 |

**Hành trình `hf_clinic`** (`Fluid build-up: same-day nurse`, R10, báo cáo bộ hf, teach `hf`, daily `hf`, không đêm). Giờ theo tAct 15 Oct 08:23.

**Bước 1 · `Same day` · `Same-day nurse`** (btn, Hospital, m+5 = 08:28)
- Hold `Navigator → nurse`. Chữ `Weight up and breathless only lying flat: an early warning. Treated today, it usually avoids a hospital stay.` Quyết định `The nurse decides whether to change treatment.`
- Agent: Navigator `Books the heart failure nurse today, not 998`; Courier `Sends 7 days of weight, oxygen and her answer`. Hand-off: Navigator → Courier → Heart failure nurse.
- Gói: `Weight — Up 2.4 kg in 3 days`; `Oxygen — 93%`; `Mariam says — “A bit. I needed 3 pillows last night”`; `Medicines — Furosemide 40 mg morning · bisoprolol 2.5 mg · ramipril 5 mg`; `History — …`.
- Nút **`Accept the same-day slot`** → `Seen at 11:30 today.` Phone `Nurse visit today` / `Rania will see you at 11:30.`; Web `Ahmed: Noa booked a nurse visit for Mariam today at 11:30.`; pipeline 3 `routine: shared`, 4 `routed`, 5 `same-day slot`.

**Bước 2 · `Treatment` · `Seen the same day`** (tl, Hospital, d0 11:30)
- Hold `Nurse`. Chữ `The nurse’s notes flow back into her record.` Xong `Treated at home.` Quyết định `The nurse and cardiologist decide the dose.`
- Agent: Courier `Files the nurse’s notes`; Voice `Tells Ahmed the plan in plain words`. Hand-off: Heart failure nurse → Courier → Voice → Family.
- Dòng: (+0, 11:30) `Nurse visit — Swollen ankles, crackles at the lung bases, weight up 2.4 kg.`; (+15, 11:45) `Plan with the cardiologist — Furosemide 40 → 80 mg for 3 days.`; (+20, 11:50) `Blood tests — Kidney function and potassium; recheck in 3 days.`; (+30, 12:00) `Home the same day — No hospital admission.`
- Phone `Seen today` / `Double water tablet for 3 days.`; Web khi xong `Family: Treated at home: extra water tablet for 3 days.`

**Bước 3 · `Explain` · `Noa explains the plan`** (teach, Individual, d0 13:00)
- Hold `Coach → Mariam`. Chữ `Furosemide 80 mg for 3 days, then back to 40 mg. Weigh every morning.` Quyết định `The nurse chose the dose. Mariam decides who sees it.` Coach `Explains the double dose and daily weighing, out loud` · `Checks she understood`.
- Teach-back bộ `hf`: `When do you weigh yourself?`; `Only when I feel unwell` / **`Every morning after the toilet, before breakfast`** / `Once a week`. Kế hoạch 13:20 `Mariam chose who sees the plan: Ahmed, Latifa`.

**Bước 4 · `Monitor` · `Mornings at home`** (daily, d4 08:10 = 19 Oct): Hold `Navigator → nurse`; chữ `Four days later. Enter today’s weight compared with dry weight.`; Guardian `Reads the scale and oxygen every morning`, Voice `Runs the daily speech check`, Navigator `Checks weight against dry weight`. Mặc định 0,4 kg (mục tiêu ≤ 1) → **đạt**: `CHECK Noa Navigator · Morning weight vs dry weight 0.4 kg is on target (up to +1.0) → no alert`. Nhập 1,1 → alert `Weight is 1.1 kg above dry weight for 3 mornings` → `Heart failure nurse Rania`.

**Bước 5 · `Nurse` · `Nurse acts`** (accept, d4 10:00): quyết định `The nurse decides the dose.`; mặc định **tự xong**; nếu có cảnh báo: `Adjust the water tablet dose`.

**Bước 6 · `Department` · `Report to the Department`** (report, d17 09:00 = 1 Nov): quyết định `The hospital signs off the report.`; Analyst `Counts warnings seen the same day and admissions avoided` · `Removes names`. Government `Heart failure`: `Fluid warnings seen the same day 91%`, `Admissions avoided (estimate) 37`, `Weight logged 6+ days a week 79%`, `30-day readmission 14.5%`.

**Hành trình `hf_em`** (`Emergency: breathless at rest`, R8, báo cáo bộ hfe, teach `hf`, daily `hf`, không đêm). Giờ theo tAct 08:23.

| # | Bước (kind · mode) | Khi nào | Hold · ai quyết định | Agent và câu thoại | Nội dung · người xem làm gì | Màn hình |
|---|---|---|---|---|---|---|
| 1 | `Help` · `Noa calls for help` (tl · ind) | m+0 | `Responder → 998` · `The 998 operator sends the ambulance.` | Responder `Calls 998 with the fixed script; a human operator takes over` · `Calls Ahmed`; Voice `“Sit upright with your feet down. Help is coming.”`. Hand-off Responder → 998 operator → Ahmed → Courier | Chữ `Breathless at rest is an emergency. Noa calls 998 straight away.` Dòng (+0) `Voice to Mariam — “Sit upright with your feet down. Help is coming.”`; (+1) `Responder calls 998 · operator takes over — Ambulance dispatched`; (+2) `Responder calls Ahmed (son) — On the way`; (+3) `Courier prepares the packet — Weight up 2.4 kg in 3 days, oxygen 93%`. Xong `Help is on the way.` | Phone đỏ `Help is coming` / `Sit upright with your feet down.`; Web `Ahmed: “On my way.”` |
| 2 | `Pre-arrival` · `Packet sent ahead` (btn · hosp) | m+15 | `Courier → ED` · `The emergency doctor decides treatment.` | Courier `Sends 7 days of weight and oxygen, medicines and history` | Chữ `The team sees the fluid building up over 3 days before she arrives.` Gói: cân nặng, oxy, câu Mariam nói, thuốc, tiền sử. Nút **`Alert the cardiology team`** → `Cardiology team alerted.` | Phone `On the way to Capital General Hospital` / `The team knows you’re coming.` |
| 3 | `Treatment` · `Emergency treatment` (tl · hosp) | m+30 | `Emergency team` · `The doctors decide treatment.` | Courier `Files the hospital’s notes`; Voice `Updates the family` | (+0) `Arrival — Oxygen low, fluid on the lungs.`; (+10) `Treatment — Oxygen and a water tablet through a drip. The doctor’s decision.`; (+40) `Chest X-ray — Fluid on both lungs.`; (+120) `Admitted — Cardiology ward for 3 days.` Xong `Treated and admitted.` | Phone `Cardiology ward` / `Your family has been updated.`; Web `Family: Admitted to cardiology for 3 days.` |
| 4 | `Discharge` · `Home with a plan` (teach · ind) | d3 11:00 | `Coach → Mariam` · `The doctor chose the plan. Mariam decides who sees it.` | Courier `Turns the discharge letter into a plan in her app`; Coach `Explains the dose and daily weighing` · `Checks she understood` | Chữ `Water tablet adjusted, weigh every morning, nurse call in 48 hours.` Teach-back `hf` | |
| 5 | `Monitor` · `Mornings at home` (daily · ind) | d7 08:10 | `Navigator → nurse` | như `hf_clinic` | Chữ `Enter today’s weight compared with dry weight.` | |
| 6 | `Nurse` · `Nurse acts` (accept · hosp) | d7 10:00 | `Nurse → Coach` · `The nurse decides the dose.` | Navigator, Coach | | |
| 7 | `Department` · `Report to the Department` (report · gov) | d17 09:00 | `Analyst → DoH` · `The hospital signs off the report.` | Analyst `Counts admissions and missed early warnings` · `Removes names` | | Government bộ hfe: `Arrived with a pre-alert 71%`, `Warnings missed before admission 22%`, `30-day readmission 14.5%`, `Weight logged 6+ days a week 79%` |

**Kết quả mong đợi mặc định** (20 tick): why1 R4, tTrig 08:20 / tCheck 08:21 / tAct 08:23, giọng 1,00, trả lời `pillows`, R10 `hf_clinic`, bước cuối 6/6, đồng hồ 1 Nov 09:00. DB: agents 9, patients 1, consents 4, observations 2, checkins 2, alerts 1, tasks 1, encounters 5, reports 1, audit 5. Dòng tự kiểm: `Rule R4 met at 08:20; Noa Voice checked at 08:21 (1 min, target ≤ 1)` | `Breathless only lying flat: same-day nurse, not 998`. Log: Phụ lục D `# hf`.

**Cách test case này:** xem bảng nhánh (mọi dòng đã chạy thật). Biên: cân 1,9 / 2,0; SpO2 93 / 92 (trigger) và 90 / 89 (998); daily 1,0 / 1,1.

---

<a id="c-own"></a>
### 3.10 `own`: Tự nhập (Enter your own)

**Câu chuyện.** Người xem chọn một người trong 9 người, chọn `Night 01:12` (bắt đầu 72) hoặc `Morning 08:10` (bắt đầu 490), đặt chỉ số tùy ý. Câu một dòng: `Choose a person and set any readings: the rules, not a script, decide what Noa does.` Moment: `...a fixed demo would only prove that it plays one tape.`

**Mục tiêu.** Chứng minh luật, không phải kịch bản, quyết định: cùng engine, cùng thang R1–R12 như 4 case an toàn, với bất kỳ người và số liệu nào.

**Đầu vào mặc định:** Moza, đêm, hr 70, dur 0, `Not moving`, không té, cảm biến đường huyết tắt, SpO2 96, cân 0. Không có giọng/câu trả lời mặc định (autopilot dừng ở R12). Chế độ đêm chỉ khi bắt đầu trước 06:00. Đổi người thì tạo lại database (bệnh nhân, consent, call list theo người đó). Mọi đầu vào khác giống khung 3.0.4. `Replay with the same readings` giữ người, giờ và chỉ số.

**Bước 0 (mặc định).** Phát lại 17 phút (01:12 → 01:28), không trigger: `WATCH Noa Guardian · no rule met · All readings are within her normal range. No rule met, so nobody is woken.`, R12 `No action`. Thẻ hiện `Try another case, or change the readings and play again.`

**Bảng nhánh:** toàn bộ thang ở 3.0.4. Mọi hành trình của 4 case an toàn đều tới được từ `own`; chữ trong hành trình dùng token của người được chọn (tên, f1/f2, thuốc, bệnh viện, giới tính). Một số câu trong hành trình viết cứng cho người gốc (ví dụ `hypo_em` có `He won’t wake properly`, `your father’s sugar`, `her phone`), nên chạy hành trình đó với người khác sẽ ra câu không khớp (mục 12).

**Kết quả mong đợi mặc định** (2 tick): R12, không có hành trình, bước cuối 0, đồng hồ 15 Oct 01:28. DB: agents 9, patients 1, consents 4, observations 0, checkins 0, alerts 0, tasks 0, encounters 0, reports 0, audit 2. Dòng tự kiểm: `No rule met, so nobody was woken at night`. Log: Phụ lục D `# own`.

**Cách test case này** (đã chạy thật):

| Đầu vào | Mong đợi |
|---|---|
| hr 130, dur 5 | R12, `Noticed: fast heart rate settled after 5 min...` |
| hr 130, dur 12, `Moving` | R12, `Noticed: fast heart rate while moving (expected)...` |
| té, floor 1 | R12, `Noticed: fall, but up again within 2 minutes...` |
| Buổi sáng, mặc định | R12, giao diện không tối |
| Hessa, hr 130, dur 12, usual / fine | Đứng xuống R1, `Hessa answered clearly ... tells Saif and Noura she is fine.` |
| Saeed, glu 3,0, té floor 5, usual / `ok` | trigger R3 lúc 01:22, câu hỏi té ngã, **R9** |
| SpO2 85, usual / `pillows` | trigger R4, **R8** |
| Buổi sáng, hr 138, dur 12, usual / none | trigger R1 lúc 08:29, R5 |
| hr 181 / glu 1,4 | Bị từ chối, không Play được |
| hr 45 | R12 |

Gợi ý cho người test: dùng `own` để chạy toàn bộ bảng biên của AI plan (nhịp tim 119/120/121, phút 9/10/11, đường 2,9/3,0/3,9/4,0, oxy 89/90/92/93, cân 1,9/2,0, floor 1/2) và đối chiếu với benchmark (mục 8). Nhớ rằng giao diện có nhiễu nhịp tim còn benchmark thì không.

---

<a id="muc-4"></a>
## 4. Luật đầy đủ

### 4.1 Luật an toàn R1–R12 (`data/rules.ts`, chữ trong `testcase.json rules.*`, logic `engine/safety.ts` và `engine/state.ts`)

| id | When (chữ công bố) | Then (chữ công bố) | Điều kiện đúng như code |
|---|---|---|---|
| R1 | `Heart rate above 120 for 10 minutes while not moving` | `Voice check within 1 minute` | Boolean `hr > 120 && still && dur ≥ 10`; trigger khi phát lại có ≥ 10 phút liên tiếp nhịp đọc được > 120 và không di chuyển (nhịp có nhiễu ±3). Cũng là luật được ghi khi **đứng xuống** |
| R2 | `Fall detected and still on the floor after 2 minutes` | `Voice check now` | `fall && floor ≥ 2`, trigger ở phút phát lại 12 |
| R3 | `Glucose below 4.0 mmol/L (below 3.0 is severe)` | `Voice check now, fast sugar first` | `glu ≠ null && glu < 4` ở phút 10. Phần "dưới 3,0 là nặng" chỉ tính ra biến `hypoS`, **không dùng** |
| R4 | `Weight up 2 kg or more in 3 days, or oxygen 92% or lower` | `Voice check this morning` | `wt ≥ 2 || spo2 ≤ 92` ở phút 10 (sau R3 trong cùng phút) |
| R5 | `Speech check score below 0.6, or no answer to a check` | `Treat as a possible stroke: 998 now (low sugar checked first)` | Thang dòng 5: giọng đỏ, hoặc (trigger tim nhanh và không trả lời) |
| R6 | `Low sugar plus no answer or a confused answer` | `998 now, family guided to the glucagon pen` | Thang dòng 1: hypo và (giọng đỏ hoặc không trả lời hoặc `confused`); hoặc hai lần đo lại < 4 |
| R7 | `Fall plus “can’t get up” or no answer` | `998 now; head CT flagged if on a blood thinner` | Thang dòng 3 |
| R8 | `Breathless at rest, or oxygen below 90%` | `998 now` | Thang dòng 4 (hf và không trả lời) và dòng 6 (SpO2 < 90 hoặc `rest`) |
| R9 | `Low sugar, answering clearly` | `Fast sugar at home, recheck in 15 minutes, doctor in the morning` | Thang dòng 2 |
| R10 | `Weight up, breathless only lying flat` | `Heart failure nurse the same day (not 998)` | Thang dòng 8: mọi trigger hf còn lại (kể cả trả lời `fine`, kể cả trigger chỉ do SpO2) |
| R11 | `Got up after a fall, speech normal` | `No ambulance; fall-risk review within 7 days` | Thang dòng 7: té, không `cant`/không im lặng, giọng không đỏ (vàng vẫn tính là "normal") |
| R12 | `Nothing above` | `No action. Nobody is woken.` | Không trigger trong suốt phát lại |

### 4.2 Luật phòng ngừa P1–P9 và luật gia đình F1–F2 (`data/rules.ts`, chữ `prevention.rules.*`)

| id | When | Then | Điều kiện đúng như code |
|---|---|---|---|
| P1 | `Eligible and due or overdue` | `Find the barrier first: one question, not another reminder` | `dueNow` ok → phase `ask` |
| P2 | `Not eligible for this programme, or nothing due` | `Say nothing; the passport shows only what applies` | `dueNow` không ok (mục 3.0.3) |
| P3 | `“I didn’t know it was due”` | `Know what is due: explain in plain words, one-tap booking` | rào cản `awareness` |
| P4 | `Times or travel don’t work` | `Easy access: slot near home outside work hours, transport, one trip for the family` | `access` |
| P5 | `Unsure, or wants a female doctor or another language` | `Trusted, culturally appropriate engagement` | `trust` |
| P6 | `“I feel fine, so why test?”` | `Personalised outreach: what it means for them and their family` | `value` (hoặc `oneTapBook` ở case `ifhas`) |
| P7 | `Just forgot, no other barrier` | `One reminder and one-tap booking is enough` | `forgot` |
| P8 | `Doesn’t want it now` | `Respect the choice: no more nudges for 3 months, door stays open` | `decline`: không hành trình; task "no reminders until" + 129600 phút (90 ngày) |
| P9 | `A result outside the healthy range` | `Route to the right team within 2 weeks; healthy results go to the passport` | `routeResult` (4 case phòng ngừa) và `routeFamilyResult` (gia đình); ngưỡng ở từng chương |
| F1 | `Heart risk 20% or more in 10 years (Framingham, ages 30–74, no heart attack or stroke)` | `Doctor review within 2 weeks; the doctor decides on treatment` | `FC_CUTS.high = 0.2`; cảnh báo `fc_<member>` (mục 3.1) |
| F2 | `Heart risk 10–20%, cholesterol not measured` | `Measure cholesterol at the next check; show the what-if plan` | `FC_CUTS.mid = 0.1`; trong code chỉ hiện thành "việc tiếp theo" `Measure cholesterol at the next check` cho **mọi** người lớn chấm bằng biến thể BMI dưới 20% (không chỉ 10–20%) |

Ngoài các luật trên, Test case không có luật đánh số nào khác. Mã luật mang tooltip `Noa’s published rule table: every decision names the rule it used`.

### 4.3 Thứ tự quyết định (tóm tắt)

1. **Phát hiện** (case an toàn): R3 (phút 10) > R4 (phút 10) > R2 (phút 12) > R1 (khi đủ 10 phút liên tiếp). Trigger đầu tiên thắng và dừng phát lại.
2. **Câu hỏi**: fall > hypo > hf > hr (theo đầu vào, không theo trigger).
3. **Thang R5–R11**: thứ tự bảng ở 3.0.4: hypo trước (đường huyết kiểm trước giọng nói, đúng câu `low sugar checked first`), rồi té, rồi suy tim không trả lời, rồi giọng nói/không trả lời với tim nhanh, rồi SpO2 < 90 hoặc khó thở lúc nghỉ, rồi té nhẹ, rồi suy tim, rồi đứng xuống.
4. **Đo lại hạ đường huyết**: hai lần < 4 đổi R9 thành R6.
5. **Phòng ngừa**: đủ điều kiện trước (P2), rồi rào cản (P3–P8), rồi kết quả (P9).
6. **Gia đình**: mỗi người tối đa một cảnh báo mở; F1 chỉ thêm khi người đó không có cảnh báo nào khác, chưa đặt lịch, chưa từ chối.

So với thứ tự trong AI plan: xem mục 11.

### 4.4 "Right action, right time?" (`engine/checks.ts`)

Các dòng tự kiểm hiện dưới quyết định và trong tab For judges. Danh sách đầy đủ: an toàn ở 3.0.4, phòng ngừa ở 3.0.3, gia đình ở 3.1. Chúng là chữ soạn sẵn có điền số; không có dòng nào "fail" (không có trạng thái đạt/không đạt), kể cả dòng 998 in 4 phút với mục tiêu ≤ 3.

### 4.5 Năm cổng an toàn trên thẻ (`ui/app/Gates.tsx`, chữ `tcGates.json gates.*`)

Trạng thái: pass / hold / pending (hiện `Not reached`) / bypassed. Thứ tự: consent, data, urgent, rule, human. Tính hoàn toàn từ snapshot (không có logic riêng trong engine).

| Cổng | Logic |
|---|---|
| Consent | Không có dòng consent → hold `No consent on file, so nothing is shared.`; case an toàn chưa gửi kế hoạch và bỏ chọn cả f1 lẫn f2 → hold `No one is chosen to see the plan, so it stays closed.`; còn lại pass `{{n}} consent records on file. Nothing is shared outside them.` |
| Data complete | Có lỗi `required` → hold (thông báo đầu tiên, `+N more`); chỉ có cảnh báo → pass kèm `N warning(s) to read below`; còn lại pass `Every input is present and in its plausible range.` |
| Urgent bypass | Đã quyết định hành trình `_em` → bypassed `Urgent rule {{rule}}: the routine flow is skipped and the emergency call comes first.` (nhãn `Urgent: skipped the queue`); gia đình có cảnh báo đỏ đang mở → bypassed `A red alert is open: it jumps the routine queue.`; đã quyết định / gia đình / phase ask → pass `No sudden change...`; phase check → hold (đang chờ bài giọng nói); còn lại pending |
| Rule decision | Có quyết định → pass `{{rule}}: {{name}}`; gia đình có cảnh báo → pass `{{n}} alerts raised by rules.`; check/ask → hold; còn lại pending |
| Human approval | Log có ACCEPT → pass; chưa quyết định → pending; không có hành động (không hành trình, kết quả phòng ngừa khỏe, daily đạt, bước accept xong) → pending `No action was raised, so no one needs to confirm.`; `_em` → hold `The 998 call does not wait for approval. The care team approves the follow-up plan at step {{n}}.` (nhãn `Waiting for a person to approve`); còn lại hold `Waiting for the care team to accept (step {{n}})` hoặc với gia đình `Waiting for a person to book or accept.` |

Đây **không** phải 3 cổng phát hành A/B/C của AI plan (mục 8, 11).

### 4.6 Nhãn nguồn gốc (`ui/app/Provenance.tsx`, `tcGates.json prov.*`)

Bốn nhãn, luôn hiện bằng chữ: `Observed` (`Read from a sensor, a record, or entered by a person`), `Calculated` (`Worked out by a rule or a formula`), `AI-written` (`Wording written by AI. It explains; it never decides`), `Clinician confirmed` (`A clinician or care team accepted it`).
- Dòng log: START WATCH DETECT ANSWER CHOICE EDIT CONSENT BOOK ACT = Observed; AI = AI-written; ACCEPT = Clinician confirmed; còn lại Calculated.
- Dòng DB: patients/consents/observations = Observed; alerts = Clinician confirmed nếu `accepted`, không thì Calculated; tasks = Clinician confirmed nếu là việc của bác sĩ (`actClinician`), không thì Calculated; encounters = Observed nếu id bắt đầu `SRC`, không thì Clinician confirmed; audit = Clinician confirmed nếu actor là hospital, không thì Calculated; còn lại Calculated.
- Thẻ: home/passport/famhub = Observed + Calculated; tl = Calculated; btn = Clinician confirmed; **teach = AI-written + Calculated** ("explanation and questions" ghi AI-written, sai sự thật vì là chữ soạn sẵn); recheck/daily/result/famresult = Observed + Calculated; accept/refer = Clinician confirmed + Calculated; report = Calculated.
- Thẻ giọng nói còn có G3 `Today’s speech score against the usual one`: điểm hôm nay so với điểm "usual" lấy từ chữ `usual` của người đó, chênh lệch, một câu, không ngưỡng.

AI plan muốn nhãn theo từng tin nhắn khác: `live AI` / `prepared` / `fixed script` / `guardrail` và bộ đếm `AI overruled` (mục 11).

### 4.7 Ẩn nhóm nhỏ

Không thuộc Test case. Tab Government trong Test case dùng KPI cố định (`data/report.ts`), không áp ẩn nhóm. Ẩn nhóm nhỏ có ở chỗ khác của web cho view Government: `web/src/domain/suppression.ts` (MIN_CELL = 10; đếm < 10 hiện `<10`; ẩn tỷ lệ khi mẫu số < 10; ẩn bổ sung khi đúng một ô của một phép chia bị ẩn), dùng trong `web/src/domain/district.ts`, `web/src/components/ui/Suppressed.tsx`, bản đồ quận; mô tả trong `docs/submission/responsible-ai.md` mục 6. AI plan gọi luật này là **S1** (Analyst không được thấy tên, nhóm dưới 10 bị ẩn).

---

<a id="muc-5"></a>
## 5. Chín agent hiện tại và ánh xạ sang 4 agent mới

Trong code hiện tại, agent **chỉ là vai trò** trong engine xác định (tên actor trong log/audit, câu thoại soạn sẵn), không phải service, không gọi LLM. Bảng `agents` trong DB được seed đủ 9 dòng (AG-1..AG-9) mỗi lần tải case. Chú thích trong `data/agents.ts` ghi "The eight Noa agents" nhưng có 9; giao diện ghi `Noa is a team of 9 AI agents` và `An orchestrator passes the case to the right agent and logs every hand-off.`

| Agent | Vai trò | Can | Cannot | Câu chuyện (tóm tắt) | Dùng ở đâu |
|---|---|---|---|---|---|
| Guardian | `Monitoring agent` | `Watch readings, apply the rules, raise alerts` | `Diagnose, or call 998 itself` | Theo dõi "bình thường của từng người" (tim Moza 58–64 khi ngủ, đường Saeed 5–8 ban đêm, cân khô Mariam 61 kg); một lần tim nhanh vì leo cầu thang không đánh thức ai | Bước 0 an toàn, daily, `fall_minor` bước 1, passport và theo dõi phòng ngừa, gia đình; actor audit cho R12 / P2 |
| Voice | `Check-in and speech agent` | `Talk with the person, run the speech check` | `Decide treatment` | Nói tiếng Ả Rập Emirati và tiếng Anh, gọi người bằng tên gia đình hay dùng (Umm Khalid, Abu Rashid), biết điểm giọng nói thường ngày của từng người | Bước 0 (giọng nói + câu hỏi), daily, báo tin gia đình ở bước điều trị, `fall_minor`, câu hỏi rào cản phòng ngừa và gia đình, Sultan qua tin nhắn; actor audit khi đứng xuống |
| Responder | `Emergency coordination agent` | `Call family and 998, stay on the line` | `Change the script or give medical advice` | Theo call list gia đình đã thống nhất, đọc kịch bản cố định đã được bác sĩ duyệt, chuyển mọi cuộc 998 cho người điều phối, không bao giờ ứng biến | Bước 1 của mọi hành trình `_em`; chờ sẵn ở `hypo_home` |
| Courier | `Records and handover agent` | `Build packets, file notes, turn summaries into plans` | `Edit what a clinician wrote` | "Nói FHIR", gom tiền sử nhiều nơi thành một trang đọc trong 2 phút, mang ghi chú bệnh viện về hồ sơ | Gói hồ sơ gửi trước, ghi chú bệnh viện, kế hoạch ra viện, lần khám phòng ngừa, hồ sơ gia đình từ 6 nguồn |
| Insight | `Clinical context agent` | `Link results with home history, suggest screening` | `Make a diagnosis` | Nối điều bệnh viện thấy với điều xảy ra ở nhà | Bước tầm soát ở viện, `fall_minor`, bước bác sĩ của `hypo_home`, định tuyến kết quả phòng ngừa, mối liên hệ gia đình C1–C8 |
| Forecast | `Risk prediction agent` | `Combine signals into a validated risk score and a what-if forecast` | `Diagnose, or score someone the model was not built for` | Dùng Framingham, hiện tín hiệu đã dùng và còn thiếu, từ chối chấm dưới 30 / trên 74 / sau nhồi máu cơ tim hoặc đột quỵ | Chỉ ở case gia đình (hub, kết quả, theo dõi, cảnh báo `fc_*`, cảnh báo của Khalid) và hộp dự báo của `ifhas` |
| Coach | `Education and teach-back agent` | `Explain, guide, check understanding, set reminders` | `Change doses` | Mỗi lần một điều, nói to, bằng ngôn ngữ của người đó; sai thì dùng lời đơn giản hơn chứ không nhiều lời hơn | Bước teach, `hypo_home` bước 1, hướng dẫn glucagon ở `hypo_em`, bước accept (giải thích thay đổi) |
| Navigator | `Follow-up agent` | `Book, track tasks, route alerts with evidence` | `Prescribe` | Giữ vòng khép kín: quên liều là nhắc, liều không hiệu quả là câu hỏi cho bác sĩ | Định tuyến daily/accept, đặt điều dưỡng `hf_clinic`, đánh giá té ngã, đặt lịch/chuyển tuyến/theo dõi phòng ngừa, gộp chuyến gia đình |
| Analyst | `Population reporting agent` | `Count measures, draft reports` | `See who anyone is` | Không bao giờ thấy tên, chỉ đếm | Bước report của mọi hành trình |

**Ánh xạ sang Orchestrator + 4 agent (AI plan bản cuối):**

| Agent mới | Kỹ năng (agent cũ) | Việc của mô hình AI theo AI plan | Đầu ra Orchestrator nhận | Validator chặn |
|---|---|---|---|---|
| Personal care | Guardian, Voice, Coach (+ việc của Responder) | Guardian: giải thích một cờ bằng lời thường so với "bình thường" của người đó. Voice: chạy check-in, **đọc câu trả lời** thành nhãn. Coach: giải thích kế hoạch, teach-back EN và AR. Responder không còn là agent riêng: cuộc gọi 998 dùng **kịch bản cố định (template, không sinh bằng AI)** do Orchestrator giữ | Guardian: chữ + mã luật nó giải thích. Voice: một nhãn trong danh sách cố định + transcript. Coach: chữ + understood / not yet | Guardian: tạo cờ mới (cờ chỉ đến từ lớp feature). Voice: nhãn tự do, câu trấn an kiểu "you’re fine" trên đường cấp cứu. Coach: liều, thay đổi thuốc |
| Screening | Forecast, Navigator | Forecast: giải thích kết quả Framingham (con số do code tính). Navigator: hỏi một câu tìm rào cản, soạn lời đề nghị | Forecast: chữ tham chiếu nguy cơ đã tính. Navigator: nhãn rào cản (P3–P8) + yêu cầu đặt lịch | Forecast: con số tự tính, chấm ngoài 30–74 hoặc sau nhồi máu/đột quỵ. Navigator: chương trình không đủ điều kiện (N1), nhắc sau "not now" (N3) |
| Specialist | Courier, Insight | Courier: dựng gói hồ sơ gửi trước và bàn giao. Insight: đọc kết quả so với ngưỡng và tiền sử gia đình, soạn lựa chọn "for the doctor" | Courier: FHIR Bundle kiểm theo schema. Insight: lựa chọn đánh dấu "for the doctor" | Courier: sửa chữ của bác sĩ. Insight: chẩn đoán, quyết định điều trị (H1) |
| Government | Analyst | Soạn báo cáo Sở Y tế từ số đếm | Chữ báo cáo trên số tổng hợp | Tên, nhóm dưới 10 (S1) |

Ghi chú khi chuyển: (1) Trong engine hiện tại **Voice** hỏi câu tìm rào cản (bước 0 phòng ngừa); AI plan giao việc này cho **Navigator** (Screening). (2) Nên giữ nguyên các câu "Cannot" của 9 agent làm luật cho validator. (3) AI plan dùng hai model: model nhanh cho nhãn câu trả lời và câu ngắn ban đêm, model mạnh cho gói hồ sơ, giải thích và báo cáo; cả hai ghim phiên bản; đổi model là một lần phát hành và chạy lại toàn bộ bộ test.

---

<a id="muc-6"></a>
## 6. Công thức: điểm giọng nói, Framingham, teach-back

### 6.1 Điểm giọng nói (`engine/speech.ts`)

- **Câu mẫu**: EN `My name is {{n}} and I live in Abu Dhabi` (tên tiếng Anh, kể cả khi giao diện tiếng Ả Rập), AR `اسمي {{nar}} وأعيش في أبوظبي`.
- **Tách từ** `words()`: chữ thường; với tiếng Ả Rập bỏ dấu (harakat) và tatweel, gộp `إ أ آ` → `ا`, `ة` → `ه`, `ى` → `ي`; bỏ dấu câu; tách theo khoảng trắng.
- **So khớp từ** `lcsMask`: dãy con chung dài nhất giữa từ mẫu và từ nói; hai từ khớp nếu giống hệt, hoặc cả hai dài hơn 3 chữ cái và khoảng cách Levenshtein ≤ 1.
- **Tỷ lệ**: ws = số từ khớp / số từ mẫu; cs = max(0, 1 − lev(mẫu nối liền, nói nối liền) / độ dài mẫu nối liền); match = max(ws, cs) (0 nếu không nói gì).
- **Tốc độ**: ratio = giây / 4,5 (BASE_SECS); null nếu gõ chữ.
- **Điểm** = round2(match × 0,75 + (ratio ? min(1, 1/ratio) : match) × 0,25).
- **Mức**: đỏ < 0,6 (`clearly changed`), vàng < 0,8 (`a little different`), xanh ≥ 0,8 (`as usual`). Chú thích trong code: `Not a validated stroke test.` Thẻ: `Demo rule: words matched and time taken, compared with the usual. Not a validated stroke test.`
- Kết quả còn có: từ/phút, mặt nạ từng từ (`heard clearly` / `not heard`), số khớp / tổng, chế độ (spoken / typed / sample).
- **Mẫu soạn sẵn**: `usual` = đúng câu mẫu, 4,3 s (EN) / 4,4 s (AR) → **1,00 xanh**. `slurred` = `my … nay … {{2 chữ đầu tên}} … abu`, 11,2 s (AR `اسـ … {{2 chữ}} … بوظ`, 11,6 s) → **0,31–0,33 EN, 0,35–0,36 AR, đỏ** (đã chạy thật: Moza 0,33, Hessa 0,32, Saeed 0,32, Mariam 0,31). `none` = rỗng → **0, đỏ**, câu trả lời tự đặt `none`.
- **Lối vào**: `spokenSpeech(text, secs)`, `typedSpeech(text)` (không có thời gian), `sampleSpeech(key)`, `submitSpeech(result)`. Bước 0 có mẫu [slurred, usual, none]; daily có [usual, slurred]. Mỗi lần ghi một dòng `checkins`.
- **Micro và đọc to** (`ui/kinds/safety/useSpeech.ts`): chỉ Web Speech API của trình duyệt. Nhận dạng `SpeechRecognition`/`webkitSpeechRecognition`, ngôn ngữ `ar-AE` hoặc `en-GB`, liên tục, có kết quả tạm; số giây tính từ lúc có âm thanh tới `Done`; từ tạm được tính nếu không kịp chốt; lỗi ánh xạ thành `micOff` / `unavailable` / `noWords` / `failed` với câu tương ứng (`Speaking needs a browser with speech recognition, such as Chrome or Edge. Type it, or use a sample.`…). Đọc to bằng `speechSynthesis` tốc độ 0,95. Không gọi server.
- **AI plan giữ nguyên nguyên tắc**: điểm do code chấm, mô hình AI không chấm giọng nói; chỉ thay phần chuyển giọng nói thành chữ (Gulf Arabic + English).

### 6.2 Framingham (`engine/forecast.ts`, hằng số `data/forecast.ts`)

Mô hình D’Agostino 2008, nguy cơ tim mạch chung 10 năm.

| Hệ số | Nam, lab | Nữ, lab | Nam, BMI | Nữ, BMI |
|---|---|---|---|---|
| ln tuổi | 3.06117 | 2.32888 | 3.11296 | 2.72107 |
| ln TC (mg/dL) | 1.12370 | 1.20904 | — | — |
| ln HDL (mg/dL) | −0.93263 | −0.70833 | — | — |
| ln BMI | — | — | 0.79277 | 0.51125 |
| ln SBP chưa điều trị / đang điều trị | 1.93303 / 1.99881 | 2.76157 / 2.82263 | 1.85508 / 1.92672 | 2.81291 / 2.88267 |
| Hút thuốc | 0.65451 | 0.52873 | 0.70953 | 0.61868 |
| Tiểu đường | 0.57367 | 0.69154 | 0.53160 | 0.77763 |
| S0 (10 năm) | 0.88936 | 0.95012 | 0.88431 | 0.94833 |
| Trung bình Σβx | 23.9802 | 26.1931 | 23.9388 | 26.0145 |

- **Công thức**: risk = min(0,99, 1 − S0^exp(Σβx − mean)); Σ là tổng hệ số × ln(giá trị) với tuổi, SBP, (TC, HDL đổi sang mg/dL = mmol/L × 38,67) hoặc BMI, cộng hằng số hút thuốc/tiểu đường. **Biến thể lab chỉ khi có cả TC và HDL**, không thì biến thể BMI.
- **Phạm vi hợp lệ** (`fcValidity`): trẻ → không chấm (`Children are followed by well-child visits, not a heart score.`); cvd → không chấm (`Has had a heart attack or stroke, so a risk score does not apply: their clinic manages heart risk directly.`); tuổi < 30 (`The Framingham score is valid from 30. Until then Noa shows habits that set lifetime risk.`); tuổi > 74 (`The Framingham score is valid up to 74. Their doctor decides.`).
- **Mức**: cao ≥ 0,20 (đỏ, `High`), trung bình ≥ 0,10 (vàng, `Moderate`), còn lại thấp (xanh, `Low`). Hiển thị phần trăm làm tròn; dưới 1% hiện `<1%`.
- **Tuổi tim**: chia đôi 40 vòng trên khoảng 30..100 để tìm tuổi mà một người tham chiếu (SBP 125 chưa điều trị, không hút, không tiểu đường, TC 180 mg/dL, HDL 45 mg/dL, BMI 22,5, cùng giới và cùng biến thể) có cùng nguy cơ; ở hai đầu trả về `30 or less` / `over 100`.
- **"Nếu thì" 5 năm** `fcProject(p, yrs, plan)`: tuổi + yrs. Theo xu hướng: SBP + xu hướng × yrs, BMI + xu hướng × yrs. Theo kế hoạch: SBP giảm tối đa 10 mmHg về phía 120 (trong năm đầu) và giữ xu hướng âm, BMI giảm tối đa 2 về phía 25, bỏ hút thuốc, TC giảm 0,8 nếu > 5 (sàn 4); sàn SBP 95, sàn BMI 18. Biểu đồ năm 0..5, trục tối thiểu 0,3, các dải low/mid/high. Đây là minh họa, **chưa được thẩm định**.
- **Bằng chứng**: các đầu vào đã dùng và còn thiếu, ghi chú `BMI used because cholesterol is not measured yet` hoặc `Total and HDL cholesterol used`.

**Bảng đáp án** (đã chạy thật bằng engine; **khớp từng dòng với bảng "Expected outputs" của AI plan**):

| Hồ sơ | Nguy cơ 10 năm | Tuổi tim | 5 năm theo xu hướng | 5 năm theo kế hoạch |
|---|---|---|---|---|
| Khalid, 47M, SBP 132, hút thuốc, BMI 29, chưa có cholesterol (xu hướng +3 / +0,5) | 18,1% (18,08) | 65 | 30,0% (29,96) | 10,4% (10,39) |
| Khalid sau tầm soát: SBP 142, TC 6,4, HDL 0,9 | 25,5% (25,55) | 77 | 38,6% (38,62) | 14,5% (14,46) |
| Khalid không hút (biến thể BMI) | 9,3% (9,34) | 52 | 16,1% (16,07) | 10,4% (10,39) |
| Amna, 45F, SBP 124, TC 5,3, HDL 1,3 (+1 / +0,3) | 3,5% (3,52) | 46 | 5,0% (4,98) | 3,4% (3,38) |
| Saeed, 69M, tiểu đường, SBP 136, TC 4,6, HDL 1,0 (+2 / 0) | 39,8% (39,77) | 92 | 51,3% (51,35) | 41,8% (41,84) |
| Hộp dự báo `ifhas`: 47M, SBP 142, hút, TC 6,4, HDL 0,9, BMI 29, HbA1c 7,4 (tiểu đường) | 40,8% (40,76) | 92 | 58,0% (57,95) | 24,2% (24,20) |
| Như trên, HbA1c < 6,5 | 25,5% | 77 | | |
| Khalid sau kết quả TC 7,8, HbA1c 6,8 (case gia đình) | 48,0% | 99 | | |

Test hiện có so `framRisk`, `heartAge`, `fcProject`, `fcFor` với "oracle" của prototype tới 12 chữ số thập phân (`web/tests/testcase/forecast.test.ts`, `fixtures/prototype-oracle.json`), cộng tính đơn điệu, trần 0,99, tuổi tim 50 cho người tham chiếu, `atMost30` / `over100`.

### 6.3 Teach-back (`data/teach.ts`, `engine/state.ts`, `ui/kinds/safety/TeachCard.tsx`)

**Cấu trúc mỗi bộ**: `facts` (dữ kiện, viết để làm đầu vào prompt, **chưa dùng**), và cho mỗi ngôn ngữ EN/AR: `explain` (lời giải thích), `q` (câu hỏi), `opts` (3 lựa chọn), `simpler` (bản đơn giản), `wrong` (2 câu phản hồi khi chọn sai). Cả hai ngôn ngữ có trong cả hai file locale; công tắc EN/AR trên thẻ độc lập với ngôn ngữ app.

**Luật chấm**: đáp án đúng **luôn là lựa chọn thứ 2 (index 1)** (`curExplain` đặt `correct: 1`). Chọn index 0 → hiện `wrong[0]`; chọn index 2 → hiện `wrong[1]`; kèm bản `simpler`. Đúng ở lần sau → log `teach-back passed on the second try` và `checkins` ghi `second try`. Autopilot dùng `passTeachBack()` (không ghi dòng checkins). Thẻ hiện nhãn `Prepared text`; dòng provenance lại ghi AI-written (mục 12).

**`applyLiveExplain(json)`** (chưa ai gọi): nhận `{explain: string, q, opts: mảng đúng 3 phần tử, correct: số nguyên 0–2, simpler}`; sai hình dạng → trả false; đúng → thay lời giải thích (nguồn `live`), xóa kết quả teach-back cũ, log `AI Noa Coach · explanation written live by an AI model`. Đây là điểm cắm tự nhiên cho Coach của team AI.

**Bộ nào dùng ở đâu**: hành trình an toàn dùng bộ của mình (`stroke_em` stroke, `fall_em` fall, `hypo_home`/`hypo_em` hypo, `hf_clinic`/`hf_em` hf; `fall_minor` không có teach). Phòng ngừa dùng bộ theo kết quả: `wellchild` refer → child_speech, ok → prev_ok; `ifhas` dm → dm, pre → prev_ref, ok → prev_ok; `expat` refer → prev_ref, ok → prev_ok; `bone` osteo → bone, low → prev_ref, ok → prev_ok. Gia đình dùng HbA1c của Khalid (refer và ≥ 6,5 → dm; refer → prev_ref; ok → prev_ok; mặc định prev_ref).

**Chín bộ (tiếng Anh; đáp án đúng in đậm):**

| Bộ | Lời giải thích (EN) | Câu hỏi | Lựa chọn 0 / **1** / 2 | Simpler | wrong[0] · wrong[1] |
|---|---|---|---|---|---|
| stroke | `{{n}}, the heart monitor in hospital found an uneven heartbeat called atrial fibrillation. It most likely caused the clot in your brain. Your new tablet, apixaban, stops new clots forming. Take it twice a day, morning and evening, and never stop it on your own. If you see black stools, blood in your urine or bad bruising, call your care team.` | `How will you take your new blood thinner?` | `Only when I feel unwell` / **`Twice a day, every day, and never stop it on my own`** / `Once a week` | `One tablet in the morning and one in the evening, every day. It stops new clots.` | `This tablet only protects you if you take it every day, even when you feel well.` · `Once a week is not enough to protect you. It is twice a day.` |
| fall | `{{n}}, you fell because your blood pressure drops when you stand up quickly. When you wake at night, sit on the edge of the bed for a minute, then stand slowly with your frame. Motion lights now light the way to the bathroom. Your blood thinner, apixaban, has restarted after the operation, so don’t stop it.` | `What will you do when you get up at night?` | `Stand up quickly` / **`Sit on the edge of the bed for a minute, then stand with my frame`** / `Walk in the dark so I don’t wake anyone` | `Sit for one minute first, then stand slowly with your frame.` | `Standing up quickly drops your blood pressure and can cause another fall.` · `Walking in the dark is risky. The lights come on by themselves when you move.` |
| hypo | `{{n}}, your sugar went too low in the night because your insulin dose was a little high for your kidneys. Your doctor lowered your night insulin to 20 units. If you feel shaky, sweaty or confused, take 15 g of fast sugar, like the juice by your bed, and check again after 15 minutes. Noa watches your sugar sensor every night.` | `If your sugar is low at night, what do you do first?` | `Go back to sleep` / **`Take 15 g of fast sugar, like juice, then check again in 15 minutes`** / `Take more insulin` | `Low sugar: drink the juice first, then check again in 15 minutes.` | `Sleeping with low sugar is dangerous. Take the juice first.` · `More insulin makes sugar go even lower. Take sugar, not insulin.` |
| hf | `{{n}}, extra fluid is building up because your heart is under strain. For the next 3 days, take two water tablets (furosemide 80 mg) in the morning, then go back to one. Weigh yourself every morning after the toilet, before breakfast. If your weight goes up by more than 1 kg, or you can’t lie flat, Noa will tell your nurse.` | `When do you weigh yourself?` | `Only when I feel unwell` / **`Every morning after the toilet, before breakfast`** / `Once a week` | `Weigh every morning, before breakfast. Noa watches the numbers.` | `Weight goes up days before you feel unwell, so weigh every day.` · `Once a week is too late to catch fluid building up.` |
| child_speech | `{{addr}}, at {{n}}’s visit she said {{val}} words besides mama and dada. Many children catch up, but it’s worth checking her hearing and speech early. Noa booked a hearing test for next week. Talk and read with her every day, and name the things she points at.` | `What helps {{n}}’s speech most at home?` | `Waiting for her to start on her own` / **`Talking and reading with her every day, and naming what she points at`** / `More time with cartoons` | `Talk and read with her every day.` | `Waiting can delay help that works best early.` · `Screens don’t teach talking as well as you do.` |
| dm | `{{n}}, your HbA1c is {{val}}%. That is in the diabetes range, but one test isn’t enough: a second test in 2 weeks will confirm it. It is not an emergency. If it is diabetes, starting early protects your heart, eyes and kidneys, and your family history makes that more important.` | `What happens next?` | `Nothing, I feel fine` / **`A second test in 2 weeks, then the doctor explains the plan`** / `Start insulin today` | `One more test in 2 weeks. Then the doctor explains.` | `Feeling fine is common with high sugar; the second test matters.` · `No medicine starts today. The doctor decides after the second test.` |
| bone | `{{n}}, your bone scan shows thin bones (osteoporosis), so a fall could break a bone more easily. Your doctor will talk with you about a bone-strengthening medicine. Noa will help with vitamin D, your daily walk, and a home check for trip hazards.` | `What lowers your risk of a broken bone?` | `Staying in bed more` / **`The medicine your doctor agrees, daily walks and removing trip hazards`** / `Stopping all exercise` | `Medicine from your doctor, a daily walk, and a safe home.` | `Resting more weakens bones and muscles.` · `Gentle exercise keeps bones and balance strong.` |
| prev_ok | `{{addr}}, {{poss}} results are in the healthy range. Noa added {{next}} to the Family Health Passport and will send one reminder before it. You can change or cancel it any time.` | `When will Noa remind you?` | `Every day until the visit` / **`Once, a few days before the next check`** / `Never` | `One reminder before the next check.` | `Noa doesn’t nag: one reminder is enough when nothing stands in the way.` · `Noa sends one reminder, and you can turn it off.` |
| prev_ref | `{{addr}}, {{poss}} result needs a closer look: {{finding}}. It is not an emergency. Noa booked it with {{team}} and added it to the Family Health Passport.` | `What happens next?` | `Nothing, it can wait a year` / **`Go to the appointment Noa booked and ask any questions`** / `Stop all medicines` | `Go to the appointment Noa booked.` | `Waiting may miss the best time to act.` · `Don’t stop anything; the appointment is to check and advise.` |

Dữ kiện `facts` (để làm prompt), ví dụ stroke: `Heart monitoring found paroxysmal atrial fibrillation, the likely cause of the clot. New blood thinner apixaban 5 mg twice a day replaces aspirin. Never stop it on your own. Call the care team for black stools, blood in urine or bad bruising. Call 998 for new face, arm or speech symptoms.` Các bộ khác cùng dạng; xem `testcase.json teach.<bộ>.facts`. Bản tiếng Ả Rập có đủ cho cả 9 bộ, do máy viết, chưa ai duyệt; riêng `prev_ref` AR bỏ mất phần `{{finding}}` và `{{team}}` (ngắn hơn bản EN).

Khi mô hình AI viết lại teach-back: nên **xáo vị trí đáp án đúng** và kiểm bằng validator như `applyLiveExplain`.

---

<a id="muc-7"></a>
## 7. Engine API, snapshot, autopilot, Judge path, database, log

### 7.1 API của engine (`engine/state.ts`, tài liệu API trong `engine/types.ts`, xuất ở `engine/index.ts`)

- Tạo: `new TestCaseEngine({ t?, random?, caseId? (mặc định family), lang? })`. `random` tiêm vào thì không seed lại.
- Store: `subscribe(fn)`, `getSnapshot()` (bất biến mỗi lần đổi), `state` (sống), `setTranslator`, `ctx()` (bảng token), `text(txt)`.
- Vòng đời: `restart(caseId?)`, `replay()` (cùng đầu vào/người/giờ), `setLang`, `setInput`, `setInputToggle('still'|'fall'|'glus')`, `setNationality`, `setPerson`, `setStart`, `setResVal`, `setRecheckVal`, `setDailyVal`, `setFamResult`, `setPlanShare('f1'|'f2')`, `setNoaTab('hosp'|'doh')`, `setDbTab`.
- An toàn: `play()`, `playTick()`, `needAns()`, `submitSpeech`, `spokenSpeech`, `typedSpeech`, `sampleSpeech`, `answer(id)` (fall: ok|cant|none; hypo: drink|confused|none; hf: pillows|rest|fine; hr: fine|none).
- Phòng ngừa: `checkPassport()`, `oneTapBook()`, `chooseBarrier(id, asked=true)`, `prevForecast()`, `sendResult()`, `referAct()`.
- Gia đình: `famSelect`, `forecast(member)`, `familyView()`, `setProfile(member, field, value, commit)`, `toggleProfile`, `setSex`, `resetFamily`, `famAct(id)`, `famSendResults()`.
- Bước: `steps()`, `cur()`, `meta()`, `stepTime(step)`, `items(step)`, `packet(step)`, `canNext()`, `targetAlert()`, `tlNext()`, `btnAct()`, `sendPlan()`, `curExplain()`, `teachKey()`, `applyLiveExplain()`, `answerTeach(j)`, `recheck()`, `sendDaily()`, `accept()`, `report()`, `go(i)` (chỉ bước đã tới), `next()`, `checks()`, `decisionChecks()`, `prevChecks()`, `inputIssues()`.
- Pipeline: `flowTick()` (giao diện gọi mỗi 220 ms khi `busy`), `settle()`, `drain()`.
- Autopilot: `setAuto`, `autoStep()` (trả 400 ms khi bận, 850 ms khi rảnh, null khi xong), `stepOnce()`, `answerSilently()`, `passTeachBack()` (không ghi checkins); getter `busy`, `night`, `isFam`, `isPrev`, `person`, `caseDef`, `pvDef`; trường `paused`.
- Phase: `setup`, `playing`, `check`, `decided` (an toàn), `ask` (phòng ngừa).

### 7.2 Snapshot (hợp đồng với giao diện, `engine/types.ts`)

| Trường | Nội dung |
|---|---|
| `version` | Số phiên bản tăng mỗi lần đổi |
| `state` | Toàn bộ `State` (case, người, đầu vào, phase, tTrig/tCheck/tAct, why1, speech, ans, qk, dec {path, rule, name, why?, standdown?, escalated?}, path, step, max, prog, done, tb, explain, fam {f1, f2}, planSent, rc, daily, noaTab, dbTab, clock, feed, fm (gia đình), notes (lỗi đầu vào), barrier, branch, route, teachKey…) |
| `db` | 10 bảng (7.5) |
| `log` | Mới nhất trước, tối đa 150 dòng `{t: HH:MM, m: tag, cls, tx}` |
| `steps`, `step` | Các bước của hành trình hiện tại và bước đang mở |
| `busy`, `night` | Đang chạy hoạt ảnh pipeline; giao diện tối |
| `fresh` | Id các dòng DB thêm từ khi vào bước |
| `canNext` | Có đi tiếp được không |
| `famScore`, `famUp` | Điểm passport và số người up to date / in care |
| `family` | `FamilyView` hoặc null |
| `inputIssues` | `{required, recommended}` |

**Đề xuất cho bản mới**: giữ một engine thuần dùng chung cho prototype, server và bộ test (đúng tinh thần AI plan). Mỗi tin nhắn/hand-off cần thêm các trường: mã luật (R/P/F và mã Orchestrator), `consent ✓ · logged ✓`, nhãn nguồn chữ (`live AI` / `prepared` / `fixed script` / `guardrail`), và bộ đếm (live AI, prepared, guardrail, AI overruled). Hai bên chốt hình dạng các trường này trước khi code.

### 7.3 Autopilot (`engine/autopilot.ts`)

Kịch bản `Run it for me`, mỗi tick làm một việc:
- Gia đình bước 0: bấm hành động mở đầu tiên theo thứ tự `moza_ok`, `book_hind`, `book_maitha`, `book_khalid`, `book_amna`, `book_saeed`, `book_sultan`; hết thì Next.
- Phòng ngừa bước 0: `checkPassport` → rào cản của case → Next (dừng ở P2/P8).
- An toàn bước 0: `play` → mẫu giọng của case (mặc định `usual`) → câu trả lời của case, nếu không có thì **lựa chọn đầu tiên**, đặt im lặng không log → Next (dừng ở R12 / đứng xuống).
- Bước sau: tl → hiện dòng tiếp; btn → bấm; teach → pass teach-back rồi gửi kế hoạch; recheck → 5,1; daily → giọng `usual` rồi số đo mặc định; accept; report; result / refer / famresult → gửi; rồi Next.
- `runAutopilot(e)` chạy tức thì. Số tick (đã chạy thật): family 30, wellchild/ifhas/bone 24, expat 21, stroke/fall 31, hypo 17, hf 20, own 2.

### 7.4 Driver, Judge path, For judges (`ui/app/driver.ts`, `ui/judges/kpis.ts`)

- Nhịp: PLAY_MS 90 (phát lại), FLOW_MS 220 (pipeline), tick autopilot đầu tiên 300 ms. Tốc độ `Slow` ×2 (mặc định), `Normal` ×1, `Fast` ×0,5. Judge path nhân 1,9; nghỉ giữa các nhịp 5200 ms × tốc độ. Giảm chuyển động (reduced motion): chạy tức thì, mỗi bước tối đa 150 ms.
- `JUDGE_BEATS = ['ifhas', 'family', 'stroke']`: `Wow first: Khalid, one tap` → `The whole family, one passport` → `The stroke at night`, khoảng 3 phút. Mỗi nhịp có `Pain` / `Magic`. Điều khiển: Pause, Resume, Skip (hoàn thành bước hoặc sang nhịp sau), Back (chạy lại xác định tới bước trước, dừng ở trạng thái pause), Stop, Speed; phím Space cũng pause/play. Lối vào: banner `Start the 3-minute tour`, nút `Start here: 3-minute Judge path`, deep link `?test`, `?test=<case>`, `?test=bench`, `?test=judges`. Tab: case, judges, bench.
- KPI For judges (tính từ engine đang chạy, gộp được cả 10 lần chạy tự động, dữ liệu hư cấu): `Rising-risk people who completed screening`, `Days from invitation to booking`, `Barriers resolved`, `Minutes from alert to the 998 call` (= tAct + 2 − tCheck, tức **4 phút** ở các ca cấp cứu mặc định), `Teach-back right the first time`, `Results that reached care`.

### 7.5 Database demo (`engine/db.ts`, seed trong `state.ts`)

| Bảng | Ý nghĩa (chú thích trên giao diện) | Id |
|---|---|---|
| agents | `The Noa agents, what each may do and what each may never do.` | AG-1..AG-9 |
| patients | `The person in this case.` | P-1000.. (an toàn/phòng ngừa), FAM-1-1..8 (gia đình) |
| consents | `What the person chose to share, and with whom.` | theo scope |
| observations | `Readings you entered and the sensors recorded.` | O-10001.. |
| checkins | `Noa Voice and Coach check-ins: speech checks and teach-back.` | C-01.. |
| alerts | `Created when a rule says someone must act.` | AL-01.. |
| tasks | `Calls, plans and follow-ups, until done.` | T-01.. |
| encounters | `Hospital and clinic events, step by step.` | E-01.., SRC-n (nguồn hồ sơ gia đình) |
| reports | `What the hospital sends to the Department of Health, without names.` | RPT-2026-10 |
| audit | `Who did what, and when.` | A-01.. |

- Consent ca an toàn/phòng ngừa (4 dòng, ngày `2 Jul 2026`): `emergencies` (Emergency services and hospital, `always share`), `routine_alerts` (Family doctor, `share`), `family_circle` (f1 và f2, `granted`; `sendPlan` cập nhật), `malaffi` (Abu Dhabi shared record, `planned link`).
- Consent gia đình (10 dòng): mỗi người lớn một dòng hồ sơ (Moza chia với Khalid; Saeed với Amna; Khalid hồ sơ và dự báo, kết quả chia với Amna; Amna với Khalid; Maitha với Amna; **Sultan `private`, chưa chia gì**), trẻ em do Maitha quản lý (`parent`), Malaffi `planned`, cộng Khalid `family_circle` (Amna, Moza) và `home_signals` (Noa Forecast từ app InsideSync).
- Panel DB mở bảng theo loại bước, hiện 40 dòng mới nhất kèm cột provenance, `Copy table as JSON`.
- Kích thước bảng sau mỗi lần chạy mặc định: ở từng chương mục 3 và Phụ lục D (được test so với prototype).

### 7.6 Token chữ (`ctx()`)

| Token | Giá trị |
|---|---|
| `n`, `nar`, `nen`, `full`, `age` | Tên gọi, tên Ả Rập, tên Anh, họ tên, tuổi (trẻ: chuỗi `18 months`) |
| `f1`, `f1s`, `f2`, `f2s`, `f2d` | Người liên hệ 1/2 (đầy đủ và ngắn), khoảng cách người 2 |
| `meds`, `hist`, `hosp`, `usual` | Thuốc, tiền sử, nơi điều trị, "bình thường" |
| `she`/`he`, `She`, `her`, `Her`, `herO` | Đại từ theo giới |
| `glu`, `wt`, `spo2`, `floor` | Đầu vào an toàn (glu null → `normal`) |
| `t0`, `lkw` | Giờ bắt đầu + 10 phút (thời điểm té / last known well) |
| `chk` | tCheck |
| `speech` | `score x.xx (<mức>)` hoặc `no answer` |
| `answer` | Nhãn câu trả lời đã chọn |
| `addr`, `addrar`, `poss` | Người được nói tới (trẻ: f1; người lớn: chính người đó), sở hữu (`Hind’s` / `your`) |
| `val`, `finding`, `team`, `next` | Kết quả phòng ngừa, câu kết luận, đội nhận, việc tiếp theo |
| `item`, `slot`, `enabler`, `voice` | Việc đến hạn, slot theo rào cản, tên enabler, câu Voice |
| `chads` | Điểm CHA₂DS₂-VASc (có cộng 2 cho đột quỵ) |

### 7.7 Log sự kiện (`ui/app/Panels.tsx`)

Mỗi dòng `{t: HH:MM, m: tag, cls, tx}`, mới nhất trước, tối đa 150 dòng (Phụ lục D in cũ nhất trước). Tag đang dùng: START WATCH DETECT ALERT ASK CHECK ANSWER DECIDE STAND ESCALATE STEP RECORD ACT CONSENT ACCEPT ROUTE POST PASSPORT CHOICE BOOK BADGE SCORE EDIT FORECAST CONNECT AI. Ý nghĩa nhanh: START tải case; WATCH Guardian theo dõi / không luật nào; DETECT trigger; ALERT báo gia đình; ASK Voice hỏi; CHECK giọng nói, teach-back, đo lại, daily đạt; ANSWER câu trả lời rào cản; DECIDE quyết định; STAND đứng xuống; ESCALATE leo thang hypo; STEP dòng timeline mode Individual; RECORD dòng timeline mode Hospital; ACT nút của bác sĩ/đặt lịch; CONSENT chọn người xem kế hoạch; ACCEPT bác sĩ/đội chấp nhận; ROUTE định tuyến kết quả/daily, Noa tự chọn rào cản; POST gửi báo cáo; PASSPORT kiểm passport; CHOICE "not now" / giữ ngày; BOOK đặt lịch gia đình; BADGE huy hiệu; SCORE điểm passport; EDIT sửa hồ sơ; FORECAST dự báo; CONNECT mối liên hệ gia đình; AI lời giải thích do AI viết (chưa bao giờ xuất hiện).

---

<a id="muc-8"></a>
## 8. Benchmark

File: `bench/scenarios.ts` (bộ tình huống), `bench/runner.ts`, `bench/metrics.ts`, `bench/open.ts`, kiểu `bench/types.ts`; giao diện `ui/bench/*`; báo cáo `docs/submission/test-report.md`.

**Thành phần (249 tình huống, đã chạy thật):**

| Nhóm | Số | Nhóm | Số |
|---|---|---|---|
| safety-rules | 25 | arabic | 15 |
| boundary | 27 | people | 24 |
| tough-input | 26 | prevention-rules | 36 |
| contradictory | 10 | prevention-results | 24 |
| night-day | 20 | family-results | 22 |
| | | family-forecast | 20 |

Theo loại setup: safety 147, prev 60, famResult 22, famRisk 20. Tag: en 232 / **ar 17**; night 133 / day 116; tuổi 65+ 155, trẻ em 34, 40–64 50, 18–39 10; easy 191 / tough 58. Quyết định mong đợi: call-998 46, stand-down 14, no-action 40, home-plan 22, same-day-clinic 12, refused 24, ask-barrier 4, stay-silent 6, barrier-help 17, respect-choice 3, refer 28, passport-ok 18, measure-cholesterol 2, doctor-review 6, not-scored 7.

**Gán nhãn**: viết tay "from the PUBLISHED rule table ... never from what the engine happens to do". Mỗi tình huống = setup + mong đợi {trigger, rule, lớp quyết định, agent (bảng `AGENT_OF`), tùy chọn detail/speech/warn/alert}, tùy chọn `near` (đối chứng âm), ghi chú, tag. **Nhãn do chính team viết, chưa độc lập.**

**Runner**: engine mới cho mỗi tình huống, không timer (`drain`); an toàn chạy trên case `own` với **nhiễu nhịp tim tắt** (`random = () => 0.5`), giọng mặc định `usual`, câu trả lời mặc định là lựa chọn đầu tiên; phòng ngừa chạy passport, rào cản, và nếu có kết quả thì chạy hết autopilot; famResult chạy autopilot gia đình tới bước kết quả; famRisk áp sửa hồ sơ rồi đọc dự báo (F1 cao; F2 trung bình và biến thể BMI; còn lại no-action / not-scored). `diverge` báo bước lệch đầu tiên (guardrail đầu vào, trigger/Guardian, giọng/Voice, quyết định, luật, agent, detail, alert, warning). Lỗi chạy thành kết quả fail. Agent được quy theo actor audit mới nhất.

**Chỉ số** (`metrics.ts`): khoảng Wilson 95% (z 1,96) cho mọi tỷ lệ; ma trận nhầm lẫn "needs 998 now" trên các tình huống an toàn có quyết định (không có quyết định tính là âm); độ nhạy, độ đặc hiệu, PPV, NPV, độ chính xác; theo nhóm, theo luật (dương và đối chứng âm qua `near`, bảng CONTRAST), theo phân nhóm (ngôn ngữ, giờ, tuổi, độ khó), chỉ số tới hạn theo phân nhóm.

**Kết quả hôm nay** (chạy lại 20/11, khớp `docs/submission/test-report.md`):
- **Cổng A** (khớp bảng luật): 248/249 = 99,6% [97,8–99,9]. Mọi nhóm 100% trừ contradictory 9/10 = 90% [59,6–98,2]; tough 57/58; luật R4 22/23, R5 77/78, R12 128/129, còn lại 100%.
- **Cổng B** (độ nhạy 998): TP 46, FN 0 → 46/46 = 100% [92,3–100].
- **Cổng C** (độ đặc hiệu 998): TN 83, FP 0 → 83/83 = 100% [95,6–100].
- Lệch duy nhất: `C-hf-nospeech` ("Weight up, no speech at all (no answer)"): mong đợi R5 / call-998, engine R8 / call-998 (thang dòng 4 `hf && noAns → hf_em` đứng trước dòng 5). Cùng quyết định 998 nên chỉ số tới hạn không đổi. Test `runner.test.ts` "only the documented differences fail".
- Đã sửa trước đó nhờ benchmark: T-glu-02/T-glu-40 (lỗi từ chối bị che bởi cảnh báo thiếu đường huyết), C-hf-weight-hypo (ưu tiên R3/R4 cùng phút), thanh kết quả phòng ngừa thiếu kiểm khoảng.
- Các con số này **trùng với AI plan**, nên bộ 249 dùng được ngay làm "chế độ 1: chỉ luật".

**Lệnh báo cáo**: từ `web/`, `npm run benchmark:report` → `scripts/run-benchmark-report.mjs` chạy `vitest run tests/benchmark/report.test.ts` với `BENCH_REPORT=1`, viết lại `docs/submission/test-report.md`. Một test khác fail nếu báo cáo đã commit bị cũ. Giao diện: `?test=bench`, Run có tiến độ và Cancel, mở một tình huống thành case (`prepareCase`).

---

<a id="muc-9"></a>
## 9. Test hiện có

**Cách chạy (Windows)**: PowerShell, `Set-Location D:\WORK\no-one-alone\web` (**D viết hoa**; đường dẫn `d:` viết thường làm hỏng setup jest-dom), rồi:
- `npx vitest run tests/testcase tests/benchmark` (hoặc `npm test` cho cả web).
- E2E: `npx playwright test e2e/testcase-*.spec.ts` (xem `web/e2e/testcase-helpers.ts`; mở app với `?test...`).

Lần chạy 20/11/2026: **28 file, 1.074 test, 1.073 đạt, 0 lỗi, 1 bỏ qua** (bộ viết báo cáo, chỉ chạy với `BENCH_REPORT`).

| File | Số test | Phủ gì |
|---|---|---|
| `tests/testcase/cases.test.ts` | 82 | 10 case chạy autopilot: tự kết thúc; quyết định, hành trình, bước cuối, đồng hồ; các bước, kích thước bảng DB và 60 dòng log đầu bằng lần chạy prototype (`fixtures/prototype-runs.json`); bộ chọn; chế độ đêm; loại bước theo hành trình |
| `tests/testcase/engine.test.ts` | 46 | Mọi khóa chữ có ở en và ar; hình dạng dữ liệu; mọi chữ của bước điền được với mọi người; hành vi API |
| `tests/testcase/safety.test.ts` | 49 | Trigger R1–R4, thang R5–R11, khớp prototype |
| `tests/testcase/speech.test.ts` | 55 | Điểm bằng prototype; các mẫu |
| `tests/testcase/prevention.test.ts` | 207 | P1/P2 đủ điều kiện, rào cản → enabler P3–P8, định tuyến P9 |
| `tests/testcase/family.test.ts` | 70 | Passport cả nhà, ngưỡng kết quả, định tuyến, nguy cơ tim, C4/C5, huy hiệu |
| `tests/testcase/family-editor.test.ts` | 25 | Khoảng của `setProfile`, bước, kẹp; trạng thái và tiêu đề cảnh báo của trẻ; công tắc và giới |
| `tests/testcase/family-edit.test.ts` | 38 | Kết quả bộ chỉnh bằng prototype (`fixtures/prototype-family-edits.json`) |
| `tests/testcase/forecast.test.ts` | 264 | framRisk, heartAge, fcCat, pct, fcProject so oracle; tính chất mô hình; hợp lệ 30–74 |
| `tests/testcase/inputs.test.ts` | 21 | checkValue/snap; guardrail an toàn, phòng ngừa, kết quả |
| `tests/testcase/playback.test.ts` | 7 | Driver pause/resume/back/skip/speed, Judge path back/skip |
| `tests/testcase/ui-*.test.tsx` (app 19, app-judges 5, family 41, gates 15, prevention 32, safety-steps 21, safety 14) | 147 | Render React: deep link, bộ chọn, timer dừng khi đóng, giao diện đêm, tab Noa, stepper; KPI và Judge path; bảng gia đình/bộ chỉnh/dự báo; cổng G1, provenance G2, điểm usual G3; luồng phòng ngừa, thẻ Khalid trước/với Noa; tl/btn/teach/recheck/daily/accept; bước home và giọng nói |
| `tests/testcase/ux-*.test.ts(x)` (firstview 5, follow 6, orientation 9, playback 3, scroll 7) | 30 | Màn hình đầu, tự cuộn theo, toast, định hướng, điều khiển phát, cuộn |
| `tests/benchmark/scenarios.test.ts` | 5 | Kích thước bộ, id duy nhất, mỗi luật có ca dương và âm, mỗi rào cản, đủ tag, cả hai câu trả lời 998 |
| `tests/benchmark/runner.test.ts` | 8 | Chạy lặp lại giống nhau, chỉ các lệch đã ghi mới fail, không sót cấp cứu hay báo động giả, ca guardrail, báo lệch, hủy |
| `tests/benchmark/metrics.test.ts` | 11 | Khoảng Wilson, ma trận nhầm lẫn, computeMetrics, độ phủ luật |
| `tests/benchmark/report.test.ts` | 2 (+1 bỏ qua) | Nội dung báo cáo; báo cáo đã commit còn mới |
| `tests/benchmark/bench-ui.test.tsx` | 6 | Tab Benchmark, run/cancel, mở thành case, khóa en/ar khớp |
| `e2e/testcase-entry.spec.ts` | 5 | Mở/đóng lớp phủ, Esc/focus, deep link, `Start the 3-minute tour` |
| `e2e/testcase-run.spec.ts` | 4 (một ca tham số theo case) | `Run it for me` tới bước cuối mỗi case, trạng thái xong của Judge path, KPI, chỉ số Benchmark |
| `e2e/testcase-ui.spec.ts` | 5 (tham số) | axe (không lỗi serious/critical), tương phản 4,5:1, RTL tiếng Ả Rập không tràn, điện thoại 390 px |
| `e2e/testcase-ux.spec.ts` | 9 (tham số) | Cuộn/focus, replay, Judge path pause/back/skip, màn hình đầu theo viewport |

Các bộ quan trọng nhất với team AI: `cases.test.ts` (10 case khớp prototype), `safety.test.ts`, `prevention.test.ts`, `family.test.ts`, `speech.test.ts`, `forecast.test.ts`, và `tests/benchmark/*`.

---

<a id="muc-10"></a>
## 10. Đề xuất tự test và test độc lập

### 10.1 Ba chế độ chạy (theo AI plan) và việc của từng bên

| Việc | Ai | Ghi chú |
|---|---|---|
| **Chế độ 1, chỉ luật**: đầu vào có cấu trúc đi thẳng vào engine; chạy 249 tình huống mỗi lần đổi luật, prompt, bộ chấm giọng hoặc model | Team AI, tự động trong CI, chặn phát hành | Hiện 248/249 vì `C-hf-nospeech`; phải chốt bảng luật hay engine đúng (mục 11) và quyết định cổng A cho phép 1 lệch hay đòi 249/249 |
| **Chế độ 2, có mô hình AI**: transcript đi qua Voice để ra nhãn câu trả lời; mỗi tình huống chạy 5 lần, báo lần tệ nhất | Team AI | Cần thêm transcript: câu trả lời tự do, EN và AR, trộn hai thứ tiếng, "I’m fine" nói líu, không trả lời, tiếng ồn, người chăm sóc trả lời thay |
| **Chế độ 3, có nhận dạng giọng nói**: âm thanh thật đầu cuối | Team AI + người thu âm | Cần bản ghi tiếng Ả Rập vùng Vịnh và tiếng Anh, từ tình nguyện viên có đồng ý |
| **Bộ đáp án viết độc lập** | **Bác sĩ**, viết từ bảng luật **trước khi chạy code**, rồi ký | Nhãn hiện nay do chính team viết |
| **Test độc lập** | Nhóm test ngoài | Xem 10.3 |
| **Kiểm chữ tiếng Ả Rập và câu chữ lâm sàng** | Người bản ngữ + bác sĩ | Tiếng Ả Rập hiện do máy viết |

### 10.2 Team AI tự test gì trước khi bàn giao

1. **Tương đương với engine cũ**: chạy autopilot 10 case trên engine mới, so với Phụ lục D (quyết định, hành trình, đồng hồ, bước cuối, kích thước 10 bảng DB, từng dòng log, dòng tự kiểm). Mọi khác biệt phải là khác biệt **đã quyết định** ở mục 11, có ghi chú.
2. **Bảng nhánh của từng chương mục 3**: mỗi dòng "Cách test case này" thành một test tự động.
3. **Biên**: toàn bộ danh sách biên của AI plan (nhịp tim 119/120/121; 9/10/11 phút; đường 2,9/3,0/3,9/4,0; oxy 89/90/92/93; cân 1,9/2,0; điểm giọng 0,59/0,60/0,61; floor 1/2) cộng biên phòng ngừa và gia đình ở mục 3. Ghi rõ có bật nhiễu nhịp tim hay không.
4. **Look-alike**: hạ đường huyết kèm giọng líu; tim nhanh khi leo cầu thang; té rồi đứng dậy nhưng giọng thay đổi; khó thở chỉ khi nằm so với khó thở lúc nghỉ; cơn tim nhanh ngắn; hạ đường huyết kèm SpO2 thấp (điểm khác biệt 998 với AI plan).
5. **Thất bại hướng về an toàn**: mô hình AI không trả lời / chậm quá 8 giây / trả về sai schema trên đường cấp cứu → coi như `none`; kiểm rằng cổng B không đổi và mọi báo động giả bị cổng C bắt.
6. **Validator**: mỗi câu "Cannot" của 9 agent thành một ca bị chặn (liều thuốc, chẩn đoán, câu "you’re fine" trên đường cấp cứu, con số nguy cơ tự tính, nhắc sau "not now", tên người trong báo cáo, nhóm dưới 10).
7. **Teach-back do mô hình AI viết**: đúng 3 lựa chọn, một đáp án đúng, vị trí đáp án được xáo, không có liều mới, EN và AR cùng nghĩa.
8. **Nhãn nguồn**: mỗi tin nhắn mang đúng nhãn `live AI` / `prepared` / `fixed script` / `guardrail`; cuộc gọi 998 luôn `fixed script`.

### 10.3 Đưa gì cho nhóm test độc lập

- Bảng luật có phiên bản (R1–R12, P1–P9, F1–F2 và 34 mã Orchestrator khi đã định nghĩa), kèm thứ tự quyết định đã chốt.
- File tình huống (249 hiện có, mở rộng dần) với đáp án do bác sĩ ký; định dạng: đầu vào theo thời gian, lời nói (chữ và âm thanh), mã luật mong đợi, hành động mong đợi, 998 có/không.
- Mục 3 của tài liệu này (bảng đầu vào, nhánh, từng bước) và **Phụ lục A–D** (chữ nguyên văn và log mong đợi).
- Định nghĩa 3 cổng: A (khớp mã luật và hành động), B (độ nhạy 998, một lần sót là fail), C (độ đặc hiệu 998, một lần gọi thừa là fail), khoảng Wilson 95%.
- Quyền truy cập một bản build chạy được (UI và một điểm gọi engine), **không** cần xem code.
- Mẫu báo cáo lỗi: id tình huống, đầu vào, mong đợi, thực tế, lớp gây lỗi (luật, nhãn của mô hình AI, nhận dạng giọng nói, giao diện), ảnh chụp log.
- Tiêu chí nghiệm thu: cổng B và C 100% ở chế độ 1, 2 và 3; cổng A theo con số đã chốt; không lỗi validator nào lọt; mọi lệch được truy đến lớp và có ghi chú bác sĩ.

### 10.4 Giới hạn của các con số

46/46 cấp cứu vẫn cho phép tỷ lệ sót thật tới khoảng 8%. Theo AI plan: không sót lần nào thì 73 ca cấp cứu nâng cận dưới lên 95%, 184 ca lên 98%, khoảng 363 ca lên 99%; kế hoạch là tăng tới khoảng 400 ca cấp cứu và 400 ca không cấp cứu trước pilot. Các cổng chỉ chứng minh hệ thống làm đúng bảng luật; bảng luật có đúng cho bệnh nhân Abu Dhabi hay không là câu hỏi lâm sàng, trả lời bằng chạy song song (shadow mode) trước pilot.

---

<a id="muc-11"></a>
## 11. Khác biệt với AI plan cần quyết

Mọi điểm dưới đây đã được đối chiếu với code và với văn bản AI plan (phần "The safety-net decision", "What each agent does with [the AI model]", "The test harness", "Final version"). Ví dụ đều đã chạy thật trên engine hiện tại.

**11.1 Thứ tự quyết định khác nhau.** AI plan:
```
if not triggered: R12
if breathless_at_rest or spo2 < 90: R8
if glucose < 4.0: answer in {none, confused} -> R6, else R9
if fall and answer in {cant_get_up, none}: R7
if speech_score < 0.6 or answer == none: R5
if weight_up and breathless_lying_flat_only: R10
if fall and got_up and speech_normal: R11
return R12
```
Engine: hypo (R6/R9) → té (R7) → suy tim không trả lời (R8) → giọng đỏ hoặc tim nhanh không trả lời (R5) → SpO2 < 90 hoặc `rest` (R8) → té nhẹ (R11) → suy tim (R10) → đứng xuống (R1). Hệ quả (đã chạy thật):

| Tình huống | Engine | AI plan | Ảnh hưởng |
|---|---|---|---|
| Đường thấp + SpO2 88 + trả lời "drinking it now" | **R9, không 998** | **R8, 998** | **Đổi quyết định 998** (cổng B/C) |
| SpO2 85 + giọng líu + "3 pillows" | R5 (998) | R8 (998) | Chỉ cổng A |
| Té + "can’t get up" + SpO2 88 | R7 (998) | R8 (998) | Chỉ cổng A |

Bản nháp trước nói "cả hai đều 998 nên cổng B và C không đổi"; điều đó đúng với ví dụ SpO2 + giọng líu nhưng **sai** với trường hợp đường thấp + SpO2 < 90.

**11.2 R6 và giọng nói.** AI plan: R6 khi đường thấp và câu trả lời ∈ {none, confused}; giọng nói không được xét trong nhánh đường. Engine: thêm cả "giọng đỏ". Hệ quả: đường thấp + giọng líu + trả lời "drinking it now" → engine **R6 (998)**, AI plan **R9 (không 998)**. **Đổi quyết định 998.**

**11.3 Không trả lời.** Bản nháp ghi "AI plan: không trả lời → R5 trong mọi trường hợp đã kích hoạt"; **chưa chính xác**. Trong AI plan, không trả lời với đường thấp → R6, với té → R7, chỉ các trường hợp còn lại mới R5. Khác biệt thật với engine chỉ ở **suy tim + không trả lời**: engine R8 (dòng 4), AI plan R5. Cả hai đều 998; đây chính là lệch `C-hf-nospeech` của benchmark. AI plan còn quy định mọi đầu ra mô hình AI thiếu/trễ/sai trên đường cấp cứu đọc thành `none` (engine chưa có khái niệm này).

**11.4 R10 hẹp hơn trong AI plan.** AI plan: R10 cần cả "cân tăng" **và** "khó thở chỉ khi nằm". Engine: mọi trigger R4 (cân ≥ 2 **hoặc** SpO2 ≤ 92) còn lại sau các dòng trên đều ra R10, kể cả khi người bệnh nói "I feel fine" và kể cả khi chỉ SpO2 thấp. Theo AI plan những ca đó ra R12. Không đổi 998, đổi cổng A.

**11.5 R11 và "speech normal".** AI plan: cần giọng bình thường. Engine: giọng vàng (0,6–0,8) vẫn ra R11. Cần định nghĩa "normal" (≥ 0,8 hay ≥ 0,6).

**11.6 Đứng xuống.** Engine ghi luật **R1** (kèm cờ `standdown`); AI plan trả **R12**. Cổng A sẽ khác nếu so mã luật.

**11.7 Nhãn câu trả lời.** AI plan dùng 6 nhãn cố định: clear, confused, none, can’t get up, breathless at rest, breathless lying flat; nhãn khác bị từ chối và đọc thành none. Engine dùng id theo từng câu hỏi. Ánh xạ đề xuất: `fine`/`ok`/`drink` → clear; `confused` → confused; `none` → none; `cant` → can’t get up; `rest` → breathless at rest; `pillows` → breathless lying flat; `fine` của câu suy tim ("I feel fine") → clear (và theo 11.4 sẽ ra R12 thay vì R10). Cần chốt.

**11.8 34 mã luật Orchestrator chưa có trong engine.** Danh sách trong AI plan: IN, G0–G3, L1–L2, B1–B2, V1–V4, Q1, N1–N3, F1, R1, H1–H2, C1, X1, D1, P1, S1, T1–T2, U1, O1, W1, A1, K1–K2 (đếm đủ 34). Văn bản AI plan chỉ cho biết nghĩa của vài mã: **H1** bác sĩ quyết định mọi chẩn đoán và điều trị; **S1** dữ liệu Sở Y tế đã khử định danh, nhóm dưới 10 bị ẩn; **N1** không mời chương trình người đó không đủ điều kiện; **N3** không nhắc sau "not now"; **P1** kết quả gen chỉ dùng khi có đồng ý và tắt được bất cứ lúc nào; **D1** mỗi cờ hiện yếu tố, nguồn và độ chắc chắn. Các mã còn lại cần tác giả AI plan cung cấp định nghĩa. **Trùng tên**: R1, F1, P1 vừa là mã Orchestrator vừa là mã trong bảng R/P/F hiện có (P1 Orchestrator = gen + consent, P1 phòng ngừa = đủ điều kiện và đến hạn); cần quy ước tiền tố để không nhầm.

**11.9 Những thứ AI plan có mà engine chưa có**: Orchestrator "rule wins" và nhãn `AI overruled`; `consent ✓ · logged ✓` trên mỗi hand-off; nhãn nguồn từng tin nhắn và bộ đếm; hai người đọc trên nhãn rủi ro (kiểm từ khóa song song với mô hình AI, bất đồng thì lấy nhãn khẩn hơn); thiết bị mất kết nối 30 phút bị gắn cờ, không bao giờ coi là bình thường; nhận dạng giọng hỏng thì hỏi lại một lần rồi coi điểm < 0,6; mô hình AI quá 8 giây thì dùng chữ soạn sẵn; audit ghi mã luật, hash đầu vào, phiên bản bảng luật, phiên bản prompt và model; rút consent thì loại dữ liệu đó dừng ở lớp 2. AI plan nói "This is already visible in the final prototype" về `AI overruled`: điều này nói về prototype mới, **không** có trong Test case hiện tại.

**11.10 Phân vai.** Engine: Voice hỏi câu tìm rào cản. AI plan: Navigator (Screening) hỏi. Engine: Responder là agent riêng. AI plan: kịch bản 998 cố định nằm ở Orchestrator/Personal care.

**11.11 Cổng A tự mâu thuẫn trong AI plan.** Phần cổng: "At most one mismatch, and never on a 998 decision" (248/249). Phần chế độ chạy: "Rules only ... must be 249 of 249, any miss is a bug". Cần chốt một con số.

**11.12 Hành trình mới.** Prototype mới là một hành trình xoay quanh Khalid: huyết áp tăng trên máy đo → IFHAS với nguy cơ tim 18% → phòng khám tầm soát → bác sĩ quyết định → kế hoạch về nhà → vài tuần sau tim nhanh ban đêm → kiểm tra giọng nói → 998 và gia đình → gói hồ sơ gửi trước. Khác 10 case riêng lẻ hiện nay. Team web sẽ gửi đặc tả bảng journey (đang soạn).

**11.13 Tuổi Khalid** không thống nhất: 47 (deck, journey, engine hiện tại), 46 (danh sách case cũ), 38 (một thẻ gia đình), theo chính AI plan. Framingham phụ thuộc tuổi nên phải chốt một tuổi; mọi bảng đáp án trong tài liệu này dùng 47.

**11.14 Những điểm khớp (không cần quyết)**: bảng Framingham "Expected outputs" của AI plan khớp engine cả 5 dòng (mục 6.2); số liệu 3 cổng của AI plan trùng kết quả benchmark hiện tại; nguyên tắc "điểm giọng nói do code chấm" trùng; F1 ≥ 20% và F2 10–20% trùng chữ công bố.

---

<a id="muc-12"></a>
## 12. Lỗi và giới hạn đã biết

| # | Vấn đề | Chi tiết | Mức |
|---|---|---|---|
| 1 | Dòng 998 vượt mục tiêu của chính nó | `998 called at … , 4 min after the check (target ≤ 3)` luôn in 4 phút vì tAct = tCheck + 2 và cuộc gọi ở tAct + 2; KPI `to998` cũng ra 4. Khi leo thang hypo in 34 phút (tAct đặt lại thành giờ đo lại lần 2 nhưng vẫn trừ tCheck ban đầu). Cần chốt mục tiêu hay cách tính giờ | trung bình |
| 2 | `C-hf-nospeech` | Bảng luật đọc theo nghĩa đen ra R5, engine R8; cả hai 998 | thấp |
| 3 | R3 "dưới 3,0 là nặng" | `hypoS` tính nhưng không dùng; mức nặng chỉ đến từ câu trả lời/giọng nói | thấp |
| 4 | F2 rộng hơn chữ công bố | "Measure cholesterol" áp cho mọi người lớn chấm bằng BMI dưới 20%, kể cả < 10% | thấp |
| 5 | `overdue`, `rem` không ảnh hưởng quyết định | Ai đủ điều kiện đều "đến hạn"; trẻ em không kiểm quốc tịch (case `expat` dựa vào điều này) | thấp |
| 6 | Đứng xuống luôn ghi R1 | Chỉ tới được từ trigger R1 nên thực tế đúng, nhưng mã luật không phải "R12" như AI plan | thấp |
| 7 | Teach-back | Đáp án luôn ở vị trí 2; chữ cố định; `applyLiveExplain` và `facts` không dùng; tiếng Ả Rập do máy viết, chưa duyệt; `prev_ref` AR thiếu `{{finding}}`/`{{team}}` | trung bình |
| 8 | Nhãn "AI-written" sai sự thật | Provenance của thẻ teach ghi AI-written trong khi là chữ soạn sẵn (thẻ ghi `Prepared text`); `Noa is a team of 9 AI agents` trong khi không gọi AI | **cao** (trung thực với giám khảo) |
| 9 | Điểm giọng nói | Điểm demo (khớp từ + thời gian so với 4,5 s), chưa thẩm định; micro cần Chrome/Edge; giọng Ả Rập chưa ai nghe kiểm | trung bình |
| 10 | Nhiễu nhịp tim ±3 bpm | Với seed mặc định, hr 121–123 **không** kích hoạt R1 trên giao diện (hr 124 mới kích hoạt), trong khi benchmark tắt nhiễu nên hr 121 kích hoạt. Hành vi ở biên khác nhau giữa demo và benchmark | trung bình |
| 11 | KPI Government cố định | `data/report.ts`, không tính từ dữ liệu, không áp ẩn nhóm nhỏ | thấp (đã ghi "Fictional") |
| 12 | Framingham và ngưỡng | Mô hình Mỹ, cần hiệu chỉnh cho UAE; mọi ngưỡng R, P, F, daily, kết quả là demo, chưa ký duyệt | cao trước pilot |
| 13 | Nhãn benchmark | Do chính team viết từ cùng bảng luật; 249 tình huống tổng hợp; tiếng Ả Rập chỉ 17 | cao trước pilot |
| 14 | Một cảnh báo mỗi người | Saeed 39,8% không có cảnh báo tim khi đang có cảnh báo khác; Khalid lên 29,8% (SBP 180) cũng không. Đúng như prototype nhưng cần xác nhận | thấp |
| 15 | Chú thích "eight Noa agents" | `data/agents.ts` ghi 8 nhưng có 9 | rất thấp |
| 16 | Backend khác bảng luật | `respond-agent` dùng HR ≥ 130 và các mức OK / MONITOR / COME_NOW / EMERGENCY; nên gộp về một bảng luật | trung bình |
| 17 | Suy tim + "I feel fine" | Ra R10 và dòng tự kiểm vẫn in `Breathless only lying flat: same-day nurse, not 998` dù người bệnh nói khỏe | thấp |
| 18 | Số đo daily không qua guardrail | `setDailyVal` không kiểm khoảng (chỉ thanh trượt giới hạn) | thấp |
| 19 | Log F1 ghi sai đội | `FORECAST ... → routed to the family doctor` in cho mọi người, kể cả Saeed mà alert trong DB gửi `Diabetes clinic · Capital General Hospital` | thấp |
| 20 | Chữ cứng theo người gốc | `hypo_em`: `He won’t wake properly`, `her phone`, `your father’s sugar ... your mother is with him`; chạy hành trình này với người khác ở case `own` ra câu sai giới/quan hệ | thấp |
| 21 | Case `bone` dưới 70 tuổi | Vẫn hỏi T-score dù nhóm `Bone: density scan` không còn đến hạn | thấp |
| 22 | Người chọn xem kế hoạch là trẻ em | Log `Hind chose who sees the plan: Maitha, Amna`, `Arjun chose who sees the plan: Priya, Vikram` | rất thấp |
| 23 | Bước giải thích của gia đình | Chữ `Each person hears their own result their own way` nhưng chỉ có teach-back của Khalid | thấp |
| 24 | Câu hỏi khi té và đường thấp cùng lúc | R3 là trigger nhưng Voice hỏi câu té ngã (ưu tiên câu hỏi fall > hypo) | thấp |
| 25 | Test case không gọi backend | Không thử được agent đã triển khai (`agents/respond`, `agents/hospital`). Backend: `agents/respond` (FastAPI; `/verify`, `/checkin/turn`, `/triage`, `/plan`, `/handoff`, `/recovery`, `/chat`; Gemini 2.5 Flash; dự phòng mọi lỗi, ví dụ triage lỗi → EMERGENCY) và `agents/hospital` (ADK, A2A, `HospitalAgent` xác định "No LLM planning", consent fail-closed, gói hồ sơ theo luật). Gọi từ core-api `RespondAgentClient.java`; web gọi core-api qua `/api/**` (ví dụ `POST /api/chat`) | thông tin |

---

<a id="muc-13"></a>
## 13. Câu hỏi mở

1. Engine mới viết bằng gì và chạy ở đâu: vẫn TypeScript dùng chung cho web + server + test, hay Python ở backend và web gọi qua API?
2. Khi demo cho giám khảo không có mạng hoặc mô hình AI chậm, giao diện chạy ở chế độ chữ soạn sẵn hay vẫn chờ AI?
3. Gọi mô hình AI qua đâu (khóa API không được nằm trên trình duyệt): mở rộng `respond-agent` hay service mới? Hosting trong UAE?
4. Giữ 10 case cũ (cho benchmark) song song với hành trình mới, hay benchmark chuyển hẳn sang hành trình mới?
5. Ai viết và ký bộ đáp án độc lập, và hạn khi nào?
6. **Thứ tự quyết định nào là chuẩn**: của engine hay của AI plan? Đặc biệt hai ca đổi quyết định 998: đường thấp + SpO2 < 90 + trả lời rõ (11.1) và đường thấp + giọng líu + trả lời rõ (11.2).
7. Cổng A: cho phép 1 lệch (248/249) hay bắt buộc 249/249?
8. Bộ nhãn câu trả lời chính thức và ánh xạ từ các lựa chọn hiện tại (11.7); "speech normal" là ≥ 0,8 hay ≥ 0,6 (11.5)?
9. Định nghĩa đầy đủ 34 mã Orchestrator và quy ước tên để không trùng R1/F1/P1.
10. Bản sản phẩm có giữ nhiễu nhịp tim mô phỏng không, và benchmark nên chạy có nhiễu hay không (mục 12 dòng 10)?
11. Sửa ngay nhãn "AI-written" và câu "team of 9 AI agents" trong lớp phủ hiện tại, hay chờ bản mới?
12. Mục tiêu "998 trong ≤ 3 phút sau kiểm tra" giữ hay đổi; đồng hồ tAct có cần đổi?
13. Chốt tuổi Khalid (47 trong mọi bảng đáp án của tài liệu này).

---

<a id="muc-14"></a>
## 14. Hành trình mới "Noa · family health" và cổng cắm AI (cập nhật 20/11)

> **Chương này đã cũ.** Bản đầy đủ và mới nhất (cổng AI, ranh giới AI và engine luật, nút trạng thái AI tự đổi, chỗ còn lấn cấn) nằm ở [BAN_GIAO_UXUI_MOI_CHO_TEAM_AI.md](BAN_GIAO_UXUI_MOI_CHO_TEAM_AI.md). Khi hai file khác nhau, theo file đó.

Từ đợt làm lại ngày 20/11, web làm theo prototype mới nhất: lớp phủ Test case với 10 case ở các chương trên **đã bị ẩn khỏi giao diện**. Code vẫn giữ trong `web/src/features/testcase/` và bật lại được bằng cờ trong `web/src/config/legacy.ts`. Team AI tiếp tục phụ trách phần đó.

Tab đầu tiên của Individual giờ là **Family health**, tức bảng "Noa · family health". Tổng quan bảng:
- **6 người, 3 thế hệ:** Moza 78, Saeed 64, Khalid 38, Amna 35, Hamdan 5, Hind 18 tháng.
- **Hành trình 5 bước:** Detect → Protect → Home screening → Right pathway → Referral. Nhánh cấp cứu dừng sau Home screening.
- **Phân việc:** Orchestrator và 4 agent (Personal care, Screening, Specialist, Government) với 9 kỹ năng.
- **34 mã luật**, có sẵn **10 quick test case**.
- **Cấp cứu** (Q1, V1, V2, L1): Noa khuyên đi cấp cứu bằng **kịch bản cố định**, không gọi 998 và không bao giờ đi qua AI.

### 14.1 Code nằm ở đâu
| Phần | Đường dẫn |
|---|---|
| Dữ liệu: người, luật, agent, chương trình, bài kiểm tra, 10 test case | `web/src/features/familyHealth/data/` |
| Engine thuần TypeScript: hành trình, cờ D1, chấm giọng nói, pathway, Framingham dùng chung | `web/src/features/familyHealth/engine/` (`journey.ts` là chính) |
| **Cổng AI** | `web/src/features/familyHealth/engine/ai.ts` |
| Giao diện | `web/src/features/familyHealth/ui/` |
| Chữ (en + ar) | `web/src/locales/{en,ar}/familyHealth.json`, `familyHealthUi.json` |
| Test | `web/tests/familyHealth/` (chạy lại 19 lần chạy thật của prototype), `web/e2e/family-health.spec.ts` |

Engine **hoàn toàn xác định**: chữ soạn sẵn cộng bộ đọc từ khóa, giống chế độ "AI off" của prototype. Vì vậy test luôn cho cùng một kết quả.

### 14.2 Cổng cắm AI: interface `NoaAi`
```ts
interface NoaAi {
  say(req: SayRequest): Promise<SayResult>              // một lượt nói của agent
  understand(req: UnderstandRequest): Promise<UnderstandResult>  // đọc câu trả lời tự do thành một lựa chọn
}
```
- **`SayRequest`** gồm:
  - `skill`: tên agent đang nói, hoặc `familyChat`;
  - `domain`;
  - `audience`: lời nói dành cho ai;
  - `lang`: `en` hoặc `ar`;
  - `facts`: chỉ được nói những gì có trong đây;
  - `task`: lệnh cho mô hình, bằng tiếng Anh, không hiện ra;
  - `fallback`: chữ soạn sẵn;
  - `maxWords`: 55, riêng thư chuyển tuyến 80, tin gia đình 45;
  - `route`: tùy chọn, là bước chuyền việc mà luật sẽ chọn.
- **`SayResult`** gồm:
  - `text`;
  - `source`: `live`, `prepared` hoặc `guardrail`;
  - `note`: lý do khi hiện chữ soạn sẵn;
  - `handoffTo`: agent tiếp theo mà mô hình gợi ý.
- **Engine tự kiểm lại chữ "live"** bằng `guard()` và chặn ba loại: liều thuốc, câu chẩn đoán, câu khuyên đừng đi cấp cứu. Dính một trong ba thì engine thay bằng chữ soạn sẵn và gắn nhãn **Guardrail**. Nếu `handoffTo` khác `route`, luật vẫn thắng và bộ đếm **AI overruled** tăng.
- **`understand`** đọc câu trả lời tự do thành `choice` trong các lựa chọn của thẻ, dùng cho các câu hỏi `rf`, `sym`, `pref`, `time`, `book`, `words`. Bản mặc định dùng bộ đọc từ khóa (`KEYWORDS` trong `ai.ts`).
- **Mỗi chỗ gọi `say` trong `journey.ts`** đều có chú thích `facts` và `task`. Danh sách lượt nói:
  - Guardian: Detect, Protect;
  - Forecast: đọc hồ sơ; giải thích "why?";
  - Voice: mở đầu bài kiểm tra; nhắc nói lại;
  - Insight: kết quả;
  - Navigator: đề nghị pathway; "not now" có U1 và N3;
  - Courier: thư chuyển tuyến;
  - Analyst: báo cáo;
  - tin nhắn gia đình.
- **Bản mặc định `PreparedAi`:** trả `fallback`, nguồn `prepared`, dùng bộ đọc từ khóa.

### 14.3 Ráp vào web
1. Viết một lớp `RemoteAi implements NoaAi`. Lớp này gọi API của team AI **qua backend**; khóa API không được nằm trên trình duyệt.
2. Truyền lớp đó vào engine ở `web/src/features/familyHealth/ui/store.ts`, hàm `getEngine()`: `new FamilyHealthEngine({ ai: new RemoteAi(...), scheduler: ... })`.
3. Nút trạng thái AI ở đầu bảng đang hiện "Prepared text (no live AI here)". Khi có AI, cho nó hiện "Live AI · Noa agents", "Noa agent is thinking…" hoặc "Prepared text (AI off)" như prototype (`ui/Panel.tsx`).
4. Dự phòng khi AI lỗi: lớp `RemoteAi` tự xử lý, engine chưa có đồng hồ chờ.
   - Theo AI plan: quá 8 giây thì trả `fallback` với nguồn `prepared`, kèm `note`.
   - Theo prototype: lỗi hoặc sai định dạng thì cũng trả chữ soạn sẵn kèm ghi chú; bị từ chối quyền thì tắt AI cho cả trang.

### 14.4 Test khi ráp
- `npx vitest run tests/familyHealth` (chạy từ `D:\WORK\no-one-alone\web`, chữ **D hoa**) phải đạt hết với `PreparedAi`.
- Có sẵn test cho AI giả lập ở các trường hợp live, guardrail và overruled (`tests/familyHealth/engine.test.ts`). Bổ sung test cho lớp `RemoteAi` bằng mock của API.
- Với AI thật, đề xuất chạy lại mỗi test case nhiều lần, như "chế độ 2" của AI plan. Kiểm cho cả hai ngôn ngữ en và ar:
  - nhánh, luật và pathway không đổi so với `PreparedAi`;
  - chỉ có chữ của agent là khác.

---

<a id="pl-a"></a>
## Phụ lục A. Hành trình an toàn, từng bước nguyên văn

Dữ liệu tham chiếu cho người test: toàn văn tiếng Anh của bước 0 (an toàn và phòng ngừa) và mọi bước của 7 hành trình an toàn, sinh từ `data/journeys.ts` + `testcase.json`; `{{…}}` là token (mục 7.6), `[ANTICOAG: …]` là bản thay thế cho người dùng thuốc chống đông.

Định dạng: `[i] kind | mode | label | title | at` (at: `{"m":X}` = X phút sau tAct, `{"d":N,"h":"HH:MM"}` = ngày thứ N sau tAct lúc HH:MM), rồi hold, text, done, decides, flow, câu thoại agent (`||` ngăn cách các câu), dòng timeline với phút lệch (`item +X`), dòng gói hồ sơ (`packet`), banner điện thoại (`phone(tone): tiêu đề / chữ`), pipeline (`nút:chữ`), bảng tin gia đình (`fam(onEnter|onDone)`), `back` (ghi chú bệnh viện chảy về hồ sơ).

```text
## step 0 (safety home / prevention passport)
  [0] home | mode=ind | label="Alert" | title="At home" | at=null
      hold: Guardian → Voice
      decides: At home, the agents only decide how to respond. They never diagnose.
      flow: label:Sensors -> agent:guardian -> agent:voice
      agent guardian: Watches heart rate, movement, falls, glucose, weight and oxygen against {{her}} own normal || Applies rules R1 to R4 and starts a voice check only when one is met
      agent voice: Calls {{n}} and runs the speech check || Asks one question about what Guardian found
  [0] passport | mode=ind | label="Passport" | title="Family Health Passport" | at=null
      hold: Guardian → Voice
      decides: The family decides: book, change or say no.
      flow: label:Passport -> agent:guardian -> agent:voice
      agent guardian: Watches the Family Health Passport: what is due, for whom, how late || Checks eligibility first: age, nationality, life stage
      agent voice: Asks one question to find the barrier, instead of sending another reminder
      agent insight: Brings in what makes this check matter for this family

## stroke_em name="Emergency: possible stroke" rule=R5 report=stroke teach=stroke daily=stroke nightUntil=3
  [1] tl | mode=ind | label="Help" | title="Noa calls for help" | at={"m":0}
      hold: Responder → 998
      text: Noa follows the call list {{n}} and {{her}} family agreed when {{she}} joined. {{Her}} emergency rule says: always share.
      done: Help is on the way.
      decides: The 998 operator sends the ambulance.
      flow: agent:responder -> label:998 operator -> label:{{f2s}} -> agent:courier
      agent responder: Runs the agreed call list: {{f1s}} first, then the nearest person || Calls 998 with the fixed script; a human operator takes over
      agent voice: Stays on the line: “Stay seated, help is coming”
      item +0: Responder calls {{f1}} — No answer
      item +1: Responder calls {{f2}}, {{f2d}} away — On the way
      item +2: Responder calls 998 · operator takes over — Ambulance dispatched
      item +2: Voice to {{n}} — “Help is coming. Stay seated. Don’t eat or drink.”
      phone(red): Help is coming / Stay seated. Don’t eat or drink. {{f2s}} is on the way.
      pipe: 3:emergency: always share | 4:call list run
      fam(onEnter): {{f2s}}: “I’m on my way.” ({{f2d}})
  [2] btn | mode=hosp | label="Pre-arrival" | title="Packet sent ahead" | at={"m":33}
      hold: Courier → ED
      btn: Activate the stroke team
      text: While the ambulance drives, Noa Courier sends {{her}} details ahead. Nobody at the door has to guess {{her}} medicines or when it started.
      done: Stroke team activated. CT room held.
      decides: The emergency doctor activates the stroke team.
      flow: agent:courier -> label:Emergency stroke team
      agent courier: Builds the packet from {{her}} shared record || Flags blood thinners, so the team knows what is safe || Sends it 17 minutes before arrival
      packet: Last known well — {{lkw}} (heart rate above 120 while still)
      packet: Symptoms — Speech check failed at {{chk}}
      packet: Blood thinners — None [ANTICOAG: Apixaban: clot-busting medicine not safe, consider clot retrieval]
      packet: Medicines — {{meds}}
      packet: History — {{hist}}
      packet: Family — {{f2s}} with {{herO}} · {{f1s}} informed
      packet: Sharing — Emergency rule: always share
      phone(info): On the way to {{hosp}} / The stroke team is ready for you.
      pipe: 4:packet built | 5:pre-alert sent
      fam(onEnter): Family: The hospital has {{n}}’s details. Ambulance arriving soon.
  [3] tl | mode=hosp | label="Treatment" | title="Emergency treatment" | at={"m":50}
      hold: Stroke team
      text: The hospital’s own notes flow back into {{her}} shared record as they happen.
      done: Treated within the hour.
      decides: Clinicians lead. The doctor decides on scans and medicine.
      flow: label:Stroke team -> agent:courier -> agent:voice -> label:Family
      agent courier: Files the hospital’s notes into {{her}} record as they happen
      agent voice: Tells {{f1s}} and {{f2s}} in plain words: “Treated, improving”
      item +0: Arrival · NIHSS 6 — Right arm weakness, slurred speech. BP 168/96, glucose {{glu}}.
      item +7: CT head and CT angiogram — No bleeding. Left M2 occlusion.
      item +28: Tenecteplase — Clot-busting medicine, the doctor’s decision. Door to needle 28 min.  [ANTICOAG: {"at":25,"title":"Clot retrieval (thrombectomy)","detail":"On apixaban, so no clot-busting medicine. The interventional team removes the clot. The doctor’s decision."}]
      item +76: NIHSS 3 — The stroke score improved. Noa Voice tells the family.
      phone(info): Stroke unit / Noa keeps {{f1s}} and {{f2s}} updated.
      pipe: 5:stroke team
      fam(onDone): Family: Treated and improving. Stroke unit.
      back: true
  [4] tl | mode=hosp | label="Screening" | title="Hospital screening" | at={"d":0,"h":"09:10"}
      hold: Stroke unit + Insight
      text: The hospital screens for the cause and for what comes next, including the family.
      done: Cause found and treated.
      decides: The doctor makes the diagnosis.
      flow: label:Stroke unit -> agent:courier -> agent:insight -> label:Family screening
      agent courier: Files each result into {{her}} record
      agent insight: Links the results with {{her}} home history || Prepares a screening offer for {{her}} family (with consent)
      item +0: Swallow screen — Passed: safe for a normal diet.
      item +600: Heart monitoring — Paroxysmal atrial fibrillation found. Stroke-risk score (CHA₂DS₂-VASc) {{chads}}.  [ANTICOAG: {"detail":"Known atrial fibrillation; apixaban levels checked."}]
      item +1440: MRI brain and heart ultrasound — Small infarct. Heart pumping normally.
      item +1450: Family screening — Noa Insight offers {{f1s}} a blood pressure and rhythm check in his own app.
      phone(info): Stroke unit / Noa keeps your family updated.
      pipe: 5:stroke unit results | 4:record updated
  [5] teach | mode=ind | label="Discharge" | title="Home with a plan" | at={"d":2,"h":"10:45"}
      hold: Coach → {{n}}
      text: New medicines: apixaban 5 mg twice a day, perindopril 4 mg, atorvastatin 40 mg. Physio, speech therapy ×6, stroke clinic in 6 weeks.
      decides: The doctor chose the medicines. {{n}} decides who sees {{her}} plan.
      flow: label:Hospital -> agent:courier -> agent:coach -> label:{{n}}
      agent courier: Turns the discharge summary into a plan in {{her}} app
      agent coach: Explains the blood thinner out loud, in Arabic or English || Checks {{she}} understood; simpler words if needed
      phone(amber): Noa Coach / 
      pipe: 4:plan → app | 3:routine: clinic + family | 1:plan received
  [6] daily | mode=ind | label="Monitor" | title="Recovery at home" | at={"d":13,"h":"08:10"}
      hold: Navigator → clinic
      text: Day 11 at home. Enter today’s reading yourself and see what Noa Navigator does with it.
      decides: Navigator sends evidence. It never changes medicines.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Stroke clinic
      agent guardian: Reads {{her}} BP cuff and pill box every morning
      agent voice: Runs the daily speech check, the same test that caught the stroke
      agent navigator: Compares the reading with {{her}} target || Routes it to the clinic only if it needs a doctor
      pipe: 0:BP cuff, pill box | 1:speech check | 4:reading checked
  [7] accept | mode=hosp | label="Hospital" | title="Hospital acts" | at={"d":13,"h":"09:30"}
      hold: Clinic → Coach
      decides: Dr Omar Haddad decides the new dose.
      flow: agent:navigator -> label:Stroke clinic -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the clinic worklist with the evidence
      agent coach: After the doctor’s change: tells {{n}} and checks {{she}} understood
      pipe: 5:clinic acts
  [8] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":16,"h":"09:00"}
      hold: Analyst → DoH
      decides: The hospital signs off the report before it is sent.
      flow: agent:analyst -> label:Hospital -> label:Department of Health
      agent analyst: Counts the pathway measures from the hospital’s records || Removes names: {{n}} is one anonymous case
      pipe: 5:monthly report | 6:report received

## fall_em name="Emergency: fall, can’t get up" rule=R7 report=fall teach=fall daily=fall nightUntil=3
  [1] tl | mode=ind | label="Help" | title="Noa calls for help" | at={"m":0}
      hold: Responder → 998
      text: {{n}} can’t get up. Every minute on the floor matters, so Noa Responder calls for help at once.
      done: Help is on the way.
      decides: The 998 operator sends the ambulance.
      flow: agent:responder -> label:998 operator -> label:{{f2s}} -> agent:courier
      agent responder: Runs the call list: {{f1s}}, then the nearest person with a key || Calls 998 with the fixed script; a human operator takes over
      agent voice: Stays with {{n}}: “Don’t try to get up. Stay warm.”
      item +0: Responder calls {{f1}} — No answer
      item +1: Responder calls {{f2}}, {{f2d}} away — Coming with the key
      item +2: Responder calls 998 · operator takes over — Ambulance dispatched
      item +2: Voice to {{n}} — “Don’t try to get up. {{f2s}} is coming. Stay warm.”
      phone(red): Help is coming / Don’t try to get up. {{f2s}} is coming.
      pipe: 3:emergency: always share | 4:call list run
      fam(onEnter): {{f2s}}: “Coming now, I have the key.”
  [2] btn | mode=hosp | label="Pre-arrival" | title="Packet sent ahead" | at={"m":25}
      hold: Courier → ED
      btn: Prepare a head CT and hip X-ray
      text: Noa Courier tells the hospital what matters before {{she}} arrives: the time of the fall, the time on the floor, and the blood thinner.
      done: Head CT and hip X-ray ready on arrival.
      decides: The emergency doctor orders the scans.
      flow: agent:courier -> label:Emergency team
      agent courier: Builds the packet from {{her}} record and tonight’s data || Flags the blood thinner: a head CT is needed after any fall
      packet: Fall — {{t0}}, detected by the watch
      packet: Time on the floor — {{floor}} min before Noa acted · {{f2s}} arrived 4 min later
      packet: Blood thinner — None [ANTICOAG: Apixaban: head CT needed]
      packet: Symptoms — Can’t get up, right hip pain
      packet: Speech check — {{speech}}
      packet: Medicines — {{meds}}
      packet: History — {{hist}}
      phone(info): On the way to {{hosp}} / The team knows about your fall.
      pipe: 4:packet built | 5:pre-alert sent
      fam(onEnter): Family: The hospital has {{n}}’s details.
  [3] tl | mode=hosp | label="Treatment" | title="Emergency treatment" | at={"m":45}
      hold: Emergency team
      text: The hospital’s notes flow back into {{her}} record.
      done: Hip fracture found; surgery planned.
      decides: The doctors decide on scans, pain relief and surgery.
      flow: label:Emergency team -> agent:courier -> agent:voice -> label:Family
      agent courier: Files the scan reports into {{her}} record
      agent voice: Tells {{f1s}} in plain words what was found
      item +0: Arrival — Right leg short and turned out. Pain 8 out of 10.
      item +20: CT head — No bleeding (important on a blood thinner).
      item +35: Hip X-ray — Fractured right hip.
      item +50: Pain relief and plan — Nerve block for pain. Surgery within 36 hours; the surgeon decides. Apixaban paused.
      phone(info): Orthopaedic ward / Noa keeps {{f1s}} updated.
      pipe: 5:ED results
      fam(onDone): Family: Broken hip. Surgery planned; no bleeding on the head scan.
      back: true
  [4] tl | mode=hosp | label="Screening" | title="Hospital screening" | at={"d":1,"h":"09:00"}
      hold: Ward + Insight
      text: The hospital looks for why {{she}} fell, so it doesn’t happen again.
      done: Cause found: blood pressure drops on standing.
      decides: The doctors decide the cause and treatment.
      flow: label:Ward -> agent:courier -> agent:insight -> label:Home safety
      agent courier: Files each result
      agent insight: Links the fall with home data: 3 bathroom trips a night this week (usual 1) || Suggests motion lights and a standing blood pressure check
      item +0: Hip surgery — Done on day 1. Walking with a frame on day 2.
      item +60: Confusion screen — Clear.
      item +120: Lying and standing blood pressure — Drops 24 mmHg on standing: the likely cause of the fall.
      item +180: Bone health and home — Osteoporosis treatment reviewed. Noa Insight books motion lights for the bathroom route.
      phone(info): Orthopaedic ward / Physio twice a day.
      pipe: 5:ward results | 4:record updated
  [5] teach | mode=ind | label="Discharge" | title="Home with a plan" | at={"d":5,"h":"11:00"}
      hold: Coach → {{n}}
      text: Home with a walking frame, physio at home 3 times a week, apixaban restarted, motion lights fitted.
      decides: The doctors chose the plan. {{n}} decides who sees it.
      flow: label:Hospital -> agent:courier -> agent:coach -> label:{{n}}
      agent courier: Turns the discharge summary into a plan in {{her}} app
      agent coach: Explains how to get up safely, out loud || Checks {{she}} understood
      phone(amber): Noa Coach / 
      pipe: 4:plan → app | 3:routine: clinic + family | 1:plan received
  [6] daily | mode=ind | label="Monitor" | title="Recovery at home" | at={"d":14,"h":"08:10"}
      hold: Navigator → doctor
      text: Two weeks at home. Enter today’s standing blood pressure drop and see what Noa does.
      decides: Navigator sends evidence. It never changes medicines.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Family doctor
      agent guardian: Watches movement and night bathroom trips
      agent voice: Runs the daily speech check
      agent navigator: Checks the standing blood pressure reading || Routes it only if it needs a doctor
      pipe: 0:BP cuff, motion sensors | 1:speech check | 4:reading checked
  [7] accept | mode=hosp | label="Doctor" | title="Doctor acts" | at={"d":14,"h":"10:00"}
      hold: Doctor → Coach
      decides: Dr Fatima Al Ali decides on the medicine.
      flow: agent:navigator -> label:Family doctor -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the family doctor’s worklist
      agent coach: Explains the change to {{n}} and checks {{she}} understood
      pipe: 5:doctor acts
  [8] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The hospital signs off the report.
      flow: agent:analyst -> label:Hospital -> label:Department of Health
      agent analyst: Counts the falls pathway measures || Removes names
      pipe: 5:monthly report | 6:report received

## fall_minor name="Fall, got up safely" rule=R11 report=fallm teach=null daily=fall nightUntil=1
  [1] tl | mode=ind | label="Guide" | title="Noa guides {{herO}} up" | at={"m":0}
      hold: Voice → {{n}}
      text: {{n}} can get up and {{her}} speech is normal, so Noa does not call 998. It guides {{herO}} instead.
      done: Safe, and nobody was woken needlessly.
      decides: No ambulance: {{n}} is up, talking clearly and has no pain.
      flow: agent:voice -> label:{{n}} -> agent:guardian
      agent voice: Talks {{herO}} through getting up safely || Repeats the speech check once {{she}} is sitting
      agent guardian: Watches movement closely for the rest of the night
      item +0: Voice guides {{n}} — “Roll onto your side, crawl to the chair, rest, then sit.”
      item +4: {{n}} is sitting — No pain. Speech check normal.
      item +5: {{f1s}} gets a note — Fell, got up with Noa’s help, fine. No need to come now.
      item +6: Guardian watches closely — Checks movement every 15 minutes until morning.
      phone(green): You’re safe / Noa is watching the rest of the night.
      pipe: 3:routine: family note | 4:guided at home
      fam(onEnter): {{f1s}}: Fell, got up with Noa’s help, fine.
  [2] btn | mode=hosp | label="Review" | title="Fall-risk review" | at={"d":1,"h":"09:00"}
      hold: Navigator → clinic
      btn: Book the fall-risk review
      text: Even without an injury, a fall is a warning. Noa makes sure someone looks into why.
      done: Review booked for next week.
      decides: The clinic decides what to change.
      flow: agent:navigator -> label:Falls clinic
      agent navigator: Books a fall-risk review within 7 days || Sends last night’s data: time on the floor, bathroom trips
      agent insight: Suggests a standing blood pressure check
      packet: Fall — {{t0}}, got up in 4 minutes
      packet: Blood thinner — None [ANTICOAG: Apixaban (no head symptoms, speech normal)]
      packet: Pattern — 3 bathroom trips a night this week (usual 1)
      packet: Request — Fall-risk review and standing blood pressure
      phone(info): Fall-risk review / Booked for next Tuesday, 10:00.
      pipe: 5:review booked
  [3] daily | mode=ind | label="Monitor" | title="At home" | at={"d":8,"h":"08:10"}
      hold: Navigator → doctor
      text: Enter today’s standing blood pressure drop and see what Noa does.
      decides: Navigator sends evidence. It never changes medicines.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Family doctor
      agent guardian: Watches night movement
      agent voice: Runs the daily speech check
      agent navigator: Checks the standing blood pressure reading
      pipe: 0:BP cuff | 1:speech check | 4:reading checked
  [4] accept | mode=hosp | label="Doctor" | title="Doctor acts" | at={"d":8,"h":"10:00"}
      hold: Doctor → Coach
      decides: The family doctor decides on the medicine.
      flow: agent:navigator -> label:Family doctor -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the family doctor’s worklist
      agent coach: Explains the change to {{n}}
      pipe: 5:doctor acts
  [5] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The health centre signs off the report.
      flow: agent:analyst -> label:Health centre -> label:Department of Health
      agent analyst: Counts falls managed at home || Removes names
      pipe: 5:monthly report | 6:report received

## hypo_home name="Low sugar, treated at home" rule=R9 report=hypo teach=hypo daily=hypo nightUntil=1
  [1] recheck | mode=ind | label="Treat" | title="Treat at home" | at={"m":0}
      hold: Coach → {{n}}
      text: {{n}} answered clearly, so Noa treats the low sugar at home first. You enter the glucose 15 minutes later.
      decides: {{n}} is answering clearly, so no ambulance yet. If two rechecks fail, Responder calls 998.
      flow: agent:coach -> label:{{n}} -> agent:guardian
      agent coach: Tells {{herO}} exactly what to take: 15 g of fast sugar || Rechecks after 15 minutes
      agent guardian: Watches the glucose sensor every minute
      agent responder: On standby: calls 998 if the sugar doesn’t come up after two tries
      phone(amber): Noa Coach / Drink the juice by your bed now. I’ll check again in 15 minutes.
      pipe: 4:treat at home
      fam(onEnter): {{f1s}}: Noa woke {{n}}: low sugar, drinking juice. Noa is watching.
  [2] btn | mode=hosp | label="Doctor" | title="Doctor reviews insulin" | at={"d":0,"h":"08:30"}
      hold: Navigator → doctor
      btn: Review the insulin dose
      text: A night hypo is a sign the dose is wrong. Noa makes sure a doctor sees it the same morning.
      done: Night insulin lowered from 24 to 20 units.
      decides: The doctor decides the new insulin dose.
      flow: agent:navigator -> label:Family doctor -> agent:coach
      agent navigator: Sends the night’s glucose curve to the family doctor before clinic opens
      agent insight: Points out that kidney function is reduced, so insulin lasts longer
      packet: Last night — Glucose {{glu}} at {{t0}}; recovered after fast sugar
      packet: Insulin — {{meds}}
      packet: Kidneys — eGFR 52: insulin lasts longer
      packet: Request — Review night insulin today
      phone(info): Your doctor has your readings / Expect a call this morning.
      pipe: 5:doctor reviews
  [3] teach | mode=ind | label="Explain" | title="Noa explains the change" | at={"d":0,"h":"11:00"}
      hold: Coach → {{n}}
      text: Night insulin glargine lowered to 20 units.
      decides: The doctor chose the dose. {{n}} decides who sees it.
      flow: label:Doctor -> agent:coach -> label:{{n}}
      agent coach: Explains the new dose and the warning signs, out loud || Checks {{he}} understood
      phone(amber): Noa Coach / 
      pipe: 1:plan received
  [4] daily | mode=ind | label="Monitor" | title="Nights at home" | at={"d":7,"h":"08:10"}
      hold: Navigator → clinic
      text: One week later. Enter the lowest night glucose and see whether Noa needs to act.
      decides: Navigator sends evidence. It never changes insulin.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Diabetes clinic
      agent guardian: Watches the glucose sensor every night
      agent voice: Runs the daily speech check
      agent navigator: Checks the lowest night glucose this week
      pipe: 0:glucose sensor | 1:speech check | 4:reading checked
  [5] accept | mode=hosp | label="Clinic" | title="Clinic acts" | at={"d":7,"h":"10:00"}
      hold: Clinic → Coach
      decides: The diabetes doctor decides the dose.
      flow: agent:navigator -> label:Diabetes clinic -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the diabetes clinic worklist
      agent coach: Explains any change to {{n}}
      pipe: 5:clinic acts
  [6] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The health centre signs off the report.
      flow: agent:analyst -> label:Health centre -> label:Department of Health
      agent analyst: Counts night hypos treated at home || Removes names
      pipe: 5:monthly report | 6:report received

## hypo_em name="Emergency: severe low sugar" rule=R6 report=hypoe teach=hypo daily=hypo nightUntil=3
  [1] tl | mode=ind | label="Help" | title="Noa calls for help" | at={"m":0}
      hold: Responder → 998
      text: Low sugar and no clear answer: this is an emergency. Noa wakes the person next door first.
      done: Glucagon given; ambulance on the way.
      decides: The 998 operator sends the ambulance. {{f1s}} gives the glucagon.
      flow: agent:responder -> label:{{f1s}} -> label:998 operator -> agent:courier
      agent responder: Wakes {{f1s}} with a loud alarm on her phone || Calls 998 with the fixed script; a human operator takes over
      agent coach: Guides {{f1s}} to use the glucagon pen in the drawer
      item +0: Responder wakes {{f1}} — “He won’t wake properly.”
      item +1: Coach guides {{f1s}} — “Don’t give food or drink if he can’t swallow. Use the glucagon pen in the drawer.”
      item +2: Responder calls 998 · operator takes over — Ambulance dispatched
      item +6: {{f1s}} gives glucagon — Noa logs the time for the paramedics.
      phone(red): Help is coming / {{f1s}} is with you.
      pipe: 3:emergency: always share | 4:call list run
      fam(onEnter): {{f2s}}: Noa: your father’s sugar is very low; ambulance called, your mother is with him.
  [2] btn | mode=hosp | label="Pre-arrival" | title="Packet sent ahead" | at={"m":20}
      hold: Courier → ED
      btn: Ready IV glucose
      text: The team knows the cause before {{he}} arrives, so nobody wastes time on a stroke work-up.
      done: IV glucose ready on arrival.
      decides: The emergency doctor decides treatment.
      flow: agent:courier -> label:Emergency team
      agent courier: Sends the glucose curve, the insulin dose and the glucagon time
      packet: Glucose — {{glu}} mmol/L at {{t0}}, falling for 3 hours
      packet: Glucagon — Given by {{f1s}}, 6 min after the alert
      packet: Insulin — {{meds}}
      packet: Kidneys — eGFR 52: insulin lasts longer
      packet: Speech check — {{speech}}
      phone(info): On the way to {{hosp}} / The team knows your sugar is low.
      pipe: 4:packet built | 5:pre-alert sent
  [3] tl | mode=hosp | label="Treatment" | title="Emergency treatment" | at={"m":35}
      hold: Emergency team
      text: The hospital’s notes flow back into {{her}} record.
      done: Recovered; insulin lowered.
      decides: The doctors decide treatment.
      flow: label:Emergency team -> agent:courier -> agent:voice -> label:Family
      agent courier: Files the hospital’s notes
      agent voice: Updates {{f1s}} and {{f2s}}
      item +0: Arrival — Glucose 3.4 after glucagon. Drowsy.
      item +10: IV glucose — Glucose 7.8. Awake and talking.
      item +40: Cause — Insulin dose too high for his kidney function.
      item +360: Observed for 6 hours — Stable. Night insulin lowered to 20 units by the doctor.
      phone(info): Emergency department / Your family has been updated.
      pipe: 5:ED results
      fam(onDone): Family: Awake and talking. Home later today.
      back: true
  [4] teach | mode=ind | label="Discharge" | title="Home with a plan" | at={"d":0,"h":"11:00"}
      hold: Coach → {{n}}
      text: Night insulin lowered to 20 units. Glucagon pen replaced.
      decides: The doctor chose the dose. {{n}} decides who sees it.
      flow: label:Hospital -> agent:courier -> agent:coach -> label:{{n}}
      agent courier: Turns the discharge letter into a plan in {{her}} app
      agent coach: Explains the new dose and the warning signs || Checks {{he}} understood
      phone(amber): Noa Coach / 
      pipe: 4:plan → app | 1:plan received
  [5] daily | mode=ind | label="Monitor" | title="Nights at home" | at={"d":7,"h":"08:10"}
      hold: Navigator → clinic
      text: Enter the lowest night glucose this week.
      decides: Navigator sends evidence. It never changes insulin.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Diabetes clinic
      agent guardian: Watches the glucose sensor every night
      agent voice: Runs the daily speech check
      agent navigator: Checks the lowest night glucose this week
      pipe: 0:glucose sensor | 1:speech check | 4:reading checked
  [6] accept | mode=hosp | label="Clinic" | title="Clinic acts" | at={"d":7,"h":"10:00"}
      hold: Clinic → Coach
      decides: The diabetes doctor decides the dose.
      flow: agent:navigator -> label:Diabetes clinic -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the diabetes clinic worklist
      agent coach: Explains any change to {{n}}
      pipe: 5:clinic acts
  [7] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The hospital signs off the report.
      flow: agent:analyst -> label:Hospital -> label:Department of Health
      agent analyst: Counts severe hypos and how they were handled || Removes names
      pipe: 5:monthly report | 6:report received

## hf_clinic name="Fluid build-up: same-day nurse" rule=R10 report=hf teach=hf daily=hf nightUntil=-1
  [1] btn | mode=hosp | label="Same day" | title="Same-day nurse" | at={"m":5}
      hold: Navigator → nurse
      btn: Accept the same-day slot
      text: Weight up and breathless only lying flat: an early warning. Treated today, it usually avoids a hospital stay.
      done: Seen at 11:30 today.
      decides: The nurse decides whether to change treatment.
      flow: agent:navigator -> agent:courier -> label:Heart failure nurse
      agent navigator: Books the heart failure nurse today, not 998
      agent courier: Sends 7 days of weight, oxygen and {{her}} answer
      packet: Weight — Up {{wt}} kg in 3 days
      packet: Oxygen — {{spo2}}%
      packet: {{n}} says — {{answer}}
      packet: Medicines — {{meds}}
      packet: History — {{hist}}
      phone(info): Nurse visit today / Rania will see you at 11:30.
      pipe: 3:routine: shared | 4:routed | 5:same-day slot
      fam(onEnter): {{f1s}}: Noa booked a nurse visit for {{n}} today at 11:30.
  [2] tl | mode=hosp | label="Treatment" | title="Seen the same day" | at={"d":0,"h":"11:30"}
      hold: Nurse
      text: The nurse’s notes flow back into {{her}} record.
      done: Treated at home.
      decides: The nurse and cardiologist decide the dose.
      flow: label:Heart failure nurse -> agent:courier -> agent:voice -> label:Family
      agent courier: Files the nurse’s notes
      agent voice: Tells {{f1s}} the plan in plain words
      item +0: Nurse visit — Swollen ankles, crackles at the lung bases, weight up {{wt}} kg.
      item +15: Plan with the cardiologist — Furosemide 40 → 80 mg for 3 days.
      item +20: Blood tests — Kidney function and potassium; recheck in 3 days.
      item +30: Home the same day — No hospital admission.
      phone(info): Seen today / Double water tablet for 3 days.
      pipe: 5:nurse notes
      fam(onDone): Family: Treated at home: extra water tablet for 3 days.
      back: true
  [3] teach | mode=ind | label="Explain" | title="Noa explains the plan" | at={"d":0,"h":"13:00"}
      hold: Coach → {{n}}
      text: Furosemide 80 mg for 3 days, then back to 40 mg. Weigh every morning.
      decides: The nurse chose the dose. {{n}} decides who sees it.
      flow: label:Nurse -> agent:coach -> label:{{n}}
      agent coach: Explains the double dose and daily weighing, out loud || Checks {{she}} understood
      phone(amber): Noa Coach / 
      pipe: 1:plan received
  [4] daily | mode=ind | label="Monitor" | title="Mornings at home" | at={"d":4,"h":"08:10"}
      hold: Navigator → nurse
      text: Four days later. Enter today’s weight compared with dry weight.
      decides: Navigator sends evidence. It never changes medicines.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Heart failure nurse
      agent guardian: Reads the scale and oxygen every morning
      agent voice: Runs the daily speech check
      agent navigator: Checks weight against dry weight
      pipe: 0:scale, oxygen | 1:speech check | 4:reading checked
  [5] accept | mode=hosp | label="Nurse" | title="Nurse acts" | at={"d":4,"h":"10:00"}
      hold: Nurse → Coach
      decides: The nurse decides the dose.
      flow: agent:navigator -> label:Heart failure nurse -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the nurse’s worklist
      agent coach: Explains any change to {{n}}
      pipe: 5:nurse acts
  [6] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The hospital signs off the report.
      flow: agent:analyst -> label:Hospital -> label:Department of Health
      agent analyst: Counts warnings seen the same day and admissions avoided || Removes names
      pipe: 5:monthly report | 6:report received

## hf_em name="Emergency: breathless at rest" rule=R8 report=hfe teach=hf daily=hf nightUntil=-1
  [1] tl | mode=ind | label="Help" | title="Noa calls for help" | at={"m":0}
      hold: Responder → 998
      text: Breathless at rest is an emergency. Noa calls 998 straight away.
      done: Help is on the way.
      decides: The 998 operator sends the ambulance.
      flow: agent:responder -> label:998 operator -> label:{{f1s}} -> agent:courier
      agent responder: Calls 998 with the fixed script; a human operator takes over || Calls {{f1s}}
      agent voice: “Sit upright with your feet down. Help is coming.”
      item +0: Voice to {{n}} — “Sit upright with your feet down. Help is coming.”
      item +1: Responder calls 998 · operator takes over — Ambulance dispatched
      item +2: Responder calls {{f1}} — On the way
      item +3: Courier prepares the packet — Weight up {{wt}} kg in 3 days, oxygen {{spo2}}%
      phone(red): Help is coming / Sit upright with your feet down.
      pipe: 3:emergency: always share | 4:call list run
      fam(onEnter): {{f1s}}: “On my way.”
  [2] btn | mode=hosp | label="Pre-arrival" | title="Packet sent ahead" | at={"m":15}
      hold: Courier → ED
      btn: Alert the cardiology team
      text: The team sees the fluid building up over 3 days before {{she}} arrives.
      done: Cardiology team alerted.
      decides: The emergency doctor decides treatment.
      flow: agent:courier -> label:Emergency team
      agent courier: Sends 7 days of weight and oxygen, medicines and history
      packet: Weight — Up {{wt}} kg in 3 days
      packet: Oxygen — {{spo2}}%
      packet: {{n}} says — {{answer}}
      packet: Medicines — {{meds}}
      packet: History — {{hist}}
      phone(info): On the way to {{hosp}} / The team knows you’re coming.
      pipe: 4:packet built | 5:pre-alert sent
  [3] tl | mode=hosp | label="Treatment" | title="Emergency treatment" | at={"m":30}
      hold: Emergency team
      text: The hospital’s notes flow back into {{her}} record.
      done: Treated and admitted.
      decides: The doctors decide treatment.
      flow: label:Emergency team -> agent:courier -> agent:voice -> label:Family
      agent courier: Files the hospital’s notes
      agent voice: Updates the family
      item +0: Arrival — Oxygen low, fluid on the lungs.
      item +10: Treatment — Oxygen and a water tablet through a drip. The doctor’s decision.
      item +40: Chest X-ray — Fluid on both lungs.
      item +120: Admitted — Cardiology ward for 3 days.
      phone(info): Cardiology ward / Your family has been updated.
      pipe: 5:ED results
      fam(onDone): Family: Admitted to cardiology for 3 days.
      back: true
  [4] teach | mode=ind | label="Discharge" | title="Home with a plan" | at={"d":3,"h":"11:00"}
      hold: Coach → {{n}}
      text: Water tablet adjusted, weigh every morning, nurse call in 48 hours.
      decides: The doctor chose the plan. {{n}} decides who sees it.
      flow: label:Hospital -> agent:courier -> agent:coach -> label:{{n}}
      agent courier: Turns the discharge letter into a plan in {{her}} app
      agent coach: Explains the dose and daily weighing || Checks {{she}} understood
      phone(amber): Noa Coach / 
      pipe: 4:plan → app | 1:plan received
  [5] daily | mode=ind | label="Monitor" | title="Mornings at home" | at={"d":7,"h":"08:10"}
      hold: Navigator → nurse
      text: Enter today’s weight compared with dry weight.
      decides: Navigator sends evidence. It never changes medicines.
      flow: agent:guardian -> agent:voice -> agent:navigator -> label:Heart failure nurse
      agent guardian: Reads the scale and oxygen every morning
      agent voice: Runs the daily speech check
      agent navigator: Checks weight against dry weight
      pipe: 0:scale, oxygen | 1:speech check | 4:reading checked
  [6] accept | mode=hosp | label="Nurse" | title="Nurse acts" | at={"d":7,"h":"10:00"}
      hold: Nurse → Coach
      decides: The nurse decides the dose.
      flow: agent:navigator -> label:Heart failure nurse -> agent:coach -> label:{{n}}
      agent navigator: Puts the alert on the nurse’s worklist
      agent coach: Explains any change to {{n}}
      pipe: 5:nurse acts
  [7] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":17,"h":"09:00"}
      hold: Analyst → DoH
      decides: The hospital signs off the report.
      flow: agent:analyst -> label:Hospital -> label:Department of Health
      agent analyst: Counts admissions and missed early warnings || Removes names
      pipe: 5:monthly report | 6:report received
```

<a id="pl-b"></a>
## Phụ lục B. Các bước của case gia đình

Dữ liệu tham chiếu: toàn văn các bước của case `family` (`data/family.ts` FAMILY_STEPS); dòng của bước 1 và bước 4 được dựng lúc chạy (`familySteps` trong `engine/family.ts`) từ các khối `family.visits.*` và `family.follow.*` in ở cuối phụ lục.

```text
  [0] famhub | mode=ind | label="Passport" | title="Family Health Passport" | at=null
      hold: Guardian + Forecast
      decides: Each adult decides for themselves; parents decide for the children. “Not now” is respected.
      flow: label:Signals -> agent:guardian -> agent:courier -> agent:forecast -> agent:insight -> agent:navigator -> label:Family
      agent courier: Brings records from 6 hospitals and clinics into one passport, with each adult’s consent
      agent guardian: Collects home signals: blood pressure, weight, heart rate, glucose || Watches what is due for all eight, from 18 months to 78 years
      agent forecast: Turns each adult’s signals into a 10-year heart risk and a 5-year what-if
      agent insight: Finds connections across the family: one person’s diagnosis changes another’s checks
      agent voice: Asks one question to find the barrier: Maitha by app, Sultan by short message, Moza by Arabic call
      agent navigator: Bundles checks into one family trip
  [1] tl | mode=hosp | label="Visits" | title="The family trip" | at={"d":4,"h":"09:00"}
      hold: Clinics
      text: One trip, several checks. The clinic already has each passport.
      done: Visits done.
      decides: The clinicians do the checks.
      flow: agent:courier -> label:Clinics -> agent:courier
      agent courier: Sends each passport, with the forecast and signals, to the clinic before the visit || Files every result back into the family passport
      phone(info): Saturday trip / Hind 09:00 · Maitha 09:15 · Khalid 09:30 · Amna 09:45
      pipe: 5:visits recorded
      fam(onDone): Family: Saturday trip done.
      back: true
  [2] famresult | mode=hosp | label="Results" | title="Results, risk and connections" | at={"d":5,"h":"12:00"}
      hold: Insight + Forecast → teams
      text: Enter the results yourself. Watch Noa Forecast recalculate Khalid’s heart risk with his real cholesterol, and the passport find new connections.
      decides: Clinicians confirm what each result means.
      flow: label:Clinics -> agent:insight -> agent:forecast -> agent:navigator -> label:Teams and family
      agent insight: Reads each result against its threshold || Looks for what one result means for the rest of the family
      agent forecast: Recalculates heart risk with the real cholesterol and blood pressure
      agent navigator: Routes each result to the right team within 2 weeks
      pipe: 4:results routed
  [3] teach | mode=ind | label="Explain" | title="Noa explains, to each person" | at={"d":6,"h":"18:00"}
      hold: Coach → Khalid
      text: Each person hears their own result their own way. The family plan is shared only with consent.
      decides: Khalid decides who in the family sees his result.
      flow: agent:coach -> label:Khalid -> agent:voice -> label:Sultan
      agent coach: Explains Khalid’s result and his heart forecast in Arabic or English || Checks he understood
      agent voice: Tells Sultan his result by short message, the way he prefers
      phone(amber): Noa Coach / 
      pipe: 1:explained
  [4] tl | mode=ind | label="Follow up" | title="Until every result reaches care" | at={"d":20,"h":"10:00"}
      hold: Navigator → family
      text: The loop closes for the whole family, not one person at a time.
      done: Every result reached care.
      decides: The family keeps control of every booking.
      flow: agent:navigator -> label:Teams -> agent:guardian -> agent:forecast -> label:Passport
      agent navigator: Follows every referral until it happens
      agent guardian: Keeps collecting home signals
      agent forecast: Updates each forecast as new readings arrive
      phone(green): Family passport / Everyone is booked, in care or up to date.
      pipe: 4:loops closed
  [5] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":25,"h":"09:00"}
      hold: Analyst → DoH
      decides: The health centres sign off the report.
      flow: agent:analyst -> label:Health centres -> label:Department of Health
      agent analyst: Counts family-level participation, connected screenings and forecasts acted on || Removes names: this family is one anonymous case
      pipe: 5:monthly report | 6:report received

# visit and follow-up rows (family.visits.*, family.follow.*)
family.visits.hind.0.title = Hind · {{visit}}
family.visits.hind.0.detail = Weighed, measured, vaccines given. The doctor records the words she says.
family.visits.hind.0.titleNone = Hind · visit
family.visits.maitha.0.title = Maitha · IFHAS
family.visits.maitha.0.detail = Blood pressure 114/72, HbA1c taken. Her mother’s diabetes in pregnancy noted for any future pregnancy.
family.visits.khalid.0.title = Khalid · IFHAS screening
family.visits.khalid.0.detail = Blood pressure taken. HbA1c and cholesterol (fasting). Bowel test kit given. Quit support offered. Family history recorded: mother’s stroke, father’s heart attack at 62.
family.visits.amna.0.title = Amna · HbA1c, 6 weeks early
family.visits.amna.0.detail = 5 minutes while the grandchildren wait with Khalid.
family.visits.saeed.0.title = Saeed · at his diabetes visit
family.visits.saeed.0.detail = Eye photos and a urine albumin test added. No extra trip.
family.visits.sultan.0.title = Sultan · Wednesday evening
family.visits.sultan.0.detail = Blood pressure, BMI, HbA1c. A young doctor talked with him about vaping; quit app set up.
family.visits.none.0.title = No visits booked
family.visits.none.0.detail = The family chose “not now” for everything. The passport keeps it all, with no reminders for 3 months.
family.follow.hind.0.title = Hind · hearing test
family.follow.hind.0.detail = Normal hearing; 6 speech therapy sessions on Saturdays near home.
family.follow.khalid.0.title = Khalid · doctor review
family.follow.khalid.0.detail = Dr Aisha Al Hosani reviews his HbA1c, cholesterol and heart risk; care plan agreed. The doctor decides the treatment.
family.follow.khalid_fc.0.title = Khalid · heart risk
family.follow.khalid_fc.0.detail = Forecast shared with Khalid: quitting medwakh and lower blood pressure bring his 5-year line down.
family.follow.amna.0.title = Amna · lifestyle programme
family.follow.amna.0.detail = Joins with Khalid: 8 weekly sessions, evenings.
family.follow.maitha.0.title = Maitha · lifestyle programme
family.follow.maitha.0.detail = Online sessions that fit her shifts.
family.follow.saeed.0.title = Saeed · kidney protection
family.follow.saeed.0.detail = His diabetes doctor adjusts his medicines; recheck in 3 months.
family.follow.sultan.0.title = Sultan · blood pressure
family.follow.sultan.0.detail = Home readings for 7 days, then a doctor review.
family.follow.C4.0.title = Maitha and Sultan · cholesterol
family.follow.C4.0.detail = Tests booked after their father’s very high result.
family.follow.C5.0.title = Family plan
family.follow.C5.0.detail = Week 1: Friday family walk, sugary drinks swapped at home. Hind and Hamdan’s growth watched.
family.follow.passport.0.title = Passport
family.follow.passport.0.detail = Next checks for all eight are in the passport, each with one reminder only. Noa Forecast recalculates when new readings arrive.
```

<a id="pl-c"></a>
## Phụ lục C. Các bước phòng ngừa và dữ liệu theo case

Dữ liệu tham chiếu: toàn văn 7 bước của hành trình phòng ngừa (`data/prevention.ts` PREVENTION_STEPS; đánh số 0–6 ở đây tương ứng bước 1–7 trên stepper) và các khóa riêng của từng case (`prevention.pv.<case>.*`: dòng khám, dòng theo dõi, dòng gia đình, slot theo rào cản, nhãn và câu luật của ô kết quả).

```text
  [0] btn | mode=ind | label="Book" | title="Booked in one tap" | at={"m":2}
      hold: Navigator → family
      btn: Book it
      text: Noa Voice: “{{voice}}”
      done: Booked: {{slot}}
      decides: {{addr}} chooses: book, change or say no.
      flow: agent:voice -> agent:navigator -> label:{{addr}}
      agent navigator: Finds the slot that removes the barrier || Adds it to the family calendar, with one reminder only
      agent voice: Says it in Arabic or English, the way the family prefers
      packet: For — {{n}} · {{item}}
      packet: Slot — {{slot}}
      packet: Support — {{enabler}}
      packet: Reminders — One, 3 days before
      phone(info): Booked / {{slot}}
      pipe: 3:family consent | 4:slot found | 5:booking sent
      fam(onEnter): {{f1s}}: Booked: {{slot}}
  [1] tl | mode=hosp | label="Visit" | title="The visit" | at={"d":4,"h":"09:00"}
      hold: Clinic
      text: The clinic already has {{poss}} passport and history, so the visit starts with what matters.
      done: Visit done.
      decides: The clinicians do the checks.
      flow: agent:courier -> label:Clinic team
      agent courier: Sent the passport and history before the visit || Files each result into the record
      phone(info): At {{hosp}} / Noa updates the passport as you go.
      pipe: 5:visit recorded
      fam(onEnter): {{f1s}}: At the clinic now.
      back: true
  [2] result | mode=hosp | label="Result" | title="Result routed" | at={"d":4,"h":"12:00"}
      hold: Insight → team
      text: Enter the result yourself and see where Noa Insight sends it.
      decides: A clinician confirms what the result means.
      flow: label:Clinic -> agent:insight -> label:Team or passport
      agent insight: Reads the result against the threshold || Routes it to the right team, or to the passport if all is well
      pipe: 4:result routed
  [3] refer | mode=hosp | label="Care" | title="From result to care" | at={"d":5,"h":"09:00"}
      hold: Navigator → team
      text: A result outside the healthy range only helps if it reaches care. Noa makes sure it does.
      textOk: Nothing to refer: the result is healthy.
      decides: The team decides the plan.
      flow: agent:navigator -> agent:courier -> label:{{team}}
      agent navigator: Puts the referral on the team’s worklist with the result
      agent courier: Sends the record
      pipe: 5:referral accepted
  [4] teach | mode=ind | label="Explain" | title="Noa explains" | at={"d":5,"h":"18:00"}
      hold: Coach → {{addr}}
      text: One thing at a time, in the family’s language.
      decides: {{addr}} decides who in the family sees it.
      flow: agent:coach -> label:{{addr}}
      agent coach: Explains the result out loud, in Arabic or English || Checks understanding; simpler words if needed
      phone(amber): Noa Coach / 
      pipe: 1:explained
  [5] tl | mode=ind | label="Follow up" | title="Until it’s done" | at={"d":12,"h":"10:00"}
      hold: Navigator → passport
      text: A screening loop is only closed when the care happens and the next check is in the passport.
      done: Loop closed. Next check in the passport.
      decides: The family keeps control of every booking.
      flow: agent:navigator -> agent:guardian -> label:Passport
      agent navigator: Follows up until the care is done || Adds the next due items to the passport
      agent guardian: Watches the passport for the next due date
      phone(green): All done / Next check is in your passport.
      pipe: 4:loop closed
  [6] report | mode=gov | label="Department" | title="Report to the Department" | at={"d":16,"h":"09:00"}
      hold: Analyst → DoH
      decides: The health centre signs off the report.
      flow: agent:analyst -> label:Health centre -> label:Department of Health
      agent analyst: Counts participation, barriers and reminders per visit || Removes names: this family is one anonymous case
      pipe: 5:monthly report | 6:report received

# per-case visit, follow-ok rows and why texts
prevention.pv.wellchild.visit.0.title = Check-in
prevention.pv.wellchild.visit.0.detail = Weighed and measured: growing on the 50th centile.
prevention.pv.wellchild.visit.1.title = Development check
prevention.pv.wellchild.visit.1.detail = Walking well. The doctor records the words she says.
prevention.pv.wellchild.visit.2.title = Vaccines
prevention.pv.wellchild.visit.2.detail = Given as per the schedule. No reaction after 15 minutes.
prevention.pv.wellchild.visit.3.title = Passport updated
prevention.pv.wellchild.visit.3.detail = Next: the 2-year visit.
prevention.pv.wellchild.follow.ok.0.title = Passport
prevention.pv.wellchild.follow.ok.0.detail = 2-year visit added for March; one reminder 3 days before.
prevention.pv.wellchild.follow.ok.1.title = Family
prevention.pv.wellchild.follow.ok.1.detail = Hamdan’s 6-year visit added to the same morning.
prevention.pv.ifhas.why = Your blood pressure has been creeping up on your cuff, you smoke, your mother had a stroke and your father a heart attack at 62. Noa Forecast puts your heart risk at about 1 in 5 over 10 years, rising if nothing changes. These checks find problems years before you feel anything. 15 minutes, right after Hind’s visit.
prevention.pv.ifhas.visit.0.title = Check-in
prevention.pv.ifhas.visit.0.detail = Blood pressure 138/86. Waist 104 cm.
prevention.pv.ifhas.visit.1.title = Blood tests
prevention.pv.ifhas.visit.1.detail = HbA1c and cholesterol (fasting).
prevention.pv.ifhas.visit.2.title = Bowel screening
prevention.pv.ifhas.visit.2.detail = Home test kit given, instructions in Arabic.
prevention.pv.ifhas.visit.3.title = Heart risk
prevention.pv.ifhas.visit.3.detail = Family history recorded: mother’s stroke, father’s heart attack at 62. Cholesterol goes to Noa Forecast.
prevention.pv.ifhas.follow.ok.0.title = Bowel test
prevention.pv.ifhas.follow.ok.0.detail = Kit returned: normal.
prevention.pv.ifhas.follow.ok.1.title = Passport
prevention.pv.ifhas.follow.ok.1.detail = Next IFHAS check in 3 years; one reminder before.
prevention.pv.expat.visit.0.title = Check-in
prevention.pv.expat.visit.0.detail = Weighed and measured.
prevention.pv.expat.visit.1.title = Check
prevention.pv.expat.visit.1.detail = Feeding well, smiling, holding his head up.
prevention.pv.expat.visit.2.title = Vaccines
prevention.pv.expat.visit.2.detail = 4-month vaccines given; records from India added to the passport.
prevention.pv.expat.visit.3.title = Passport
prevention.pv.expat.visit.3.detail = Next: the 6-month visit.
prevention.pv.expat.follow.ok.0.title = Passport
prevention.pv.expat.follow.ok.0.detail = 6-month visit booked; one reminder 3 days before.
prevention.pv.expat.follow.ok.1.title = Passport
prevention.pv.expat.follow.ok.1.detail = All 14 visits listed in English, with what each checks.
prevention.pv.bone.visit.0.title = Check-in
prevention.pv.bone.visit.0.detail = Blood pressure 142/84.
prevention.pv.bone.visit.1.title = Bone density scan
prevention.pv.bone.visit.1.detail = Hip and spine scanned.
prevention.pv.bone.visit.2.title = Memory check
prevention.pv.bone.visit.2.detail = Normal for his age.
prevention.pv.bone.visit.3.title = Blood tests
prevention.pv.bone.visit.3.detail = Kidney function, vitamin D, HbA1c.
prevention.pv.bone.follow.ok.0.title = Passport
prevention.pv.bone.follow.ok.0.detail = Next IFHAS check added; one reminder before.

# slots per barrier, family rows, results, follow-refer rows
prevention.pv.wellchild.family.0.name = Hamdan, 5
prevention.pv.wellchild.family.0.what = 5-year visit
prevention.pv.wellchild.family.0.state = done ✓
prevention.pv.wellchild.family.1.name = Maitha, 25 (mother)
prevention.pv.wellchild.family.1.what = IFHAS screening
prevention.pv.wellchild.family.1.state = due
prevention.pv.wellchild.family.2.name = Khalid, 47 (grandfather)
prevention.pv.wellchild.family.2.what = IFHAS screening
prevention.pv.wellchild.family.2.state = never done
prevention.pv.wellchild.family.3.name = Moza, 78
prevention.pv.wellchild.family.3.what = Outside the IFHAS age range; her stroke clinic follows her
prevention.pv.wellchild.family.3.state = —
prevention.pv.wellchild.slot.access = Saturday 09:00 at Al Khalidiya Family Health Centre, 2 km from home, with Maitha’s screening at 09:15 and grandfather Khalid’s at 09:30: one trip for the family
prevention.pv.wellchild.slot.awareness = Saturday 09:00 near home; Noa explains the 14 visits and what this one checks
prevention.pv.wellchild.slot.trust = Thursday 17:30 with a female doctor, Dr Aisha Al Hosani, in Arabic
prevention.pv.wellchild.slot.value = Saturday 09:00; this visit checks growth, speech and vaccines at an age when early help matters most
prevention.pv.wellchild.slot.forgot = Wednesday 16:00, the slot Maitha usually picks
prevention.pv.wellchild.result.label = Words besides “mama” and “dada”
prevention.pv.wellchild.result.unit = words
prevention.pv.wellchild.result.rule = At 18 months most children try to say 3 or more words besides mama or dada (demo threshold)
prevention.pv.wellchild.follow.refer.0.title = Hearing test
prevention.pv.wellchild.follow.refer.0.detail = Normal hearing.
prevention.pv.wellchild.follow.refer.1.title = Speech assessment
prevention.pv.wellchild.follow.refer.1.detail = Mild speech delay: 6 sessions of speech therapy on Saturdays near home.
prevention.pv.wellchild.follow.refer.2.title = Therapy
prevention.pv.wellchild.follow.refer.2.detail = 5 of 6 sessions attended. Hind now says 15 words.
prevention.pv.wellchild.follow.refer.3.title = Passport
prevention.pv.wellchild.follow.refer.3.detail = 2-year visit booked; one reminder 3 days before.
prevention.pv.ifhas.family.0.name = Hind, 18 months (granddaughter)
prevention.pv.ifhas.family.0.what = 18-month visit
prevention.pv.ifhas.family.0.state = booked Saturday ✓
prevention.pv.ifhas.family.1.name = Amna, 45
prevention.pv.ifhas.family.1.what = IFHAS screening
prevention.pv.ifhas.family.1.state = done Mar 2026 ✓
prevention.pv.ifhas.family.2.name = Moza, 78
prevention.pv.ifhas.family.2.what = Outside the IFHAS age range; her stroke clinic follows her
prevention.pv.ifhas.family.2.state = —
prevention.pv.ifhas.slot.value = Saturday 09:30 at Al Khalidiya Family Health Centre, right after Hind’s visit: 15 minutes, fasting blood test
prevention.pv.ifhas.slot.access = Saturday 07:30, before work, 10 minutes from home
prevention.pv.ifhas.slot.trust = Thursday 18:00 with Dr Omar, in Arabic
prevention.pv.ifhas.slot.awareness = Saturday 09:30; Noa lists which checks are due at 47 and why
prevention.pv.ifhas.slot.forgot = Saturday 09:30, after Hind’s visit
prevention.pv.ifhas.result.label = HbA1c
prevention.pv.ifhas.result.unit = %
prevention.pv.ifhas.result.rule = 6.5% or above is in the diabetes range (a second test confirms); 5.7–6.4% is prediabetes
prevention.pv.ifhas.follow.refer.0.title = Second HbA1c
prevention.pv.ifhas.follow.refer.0.detail = Confirmed by Dr Aisha Al Hosani; care plan agreed. The doctor decides the treatment.
prevention.pv.ifhas.follow.refer.1.title = Care plan
prevention.pv.ifhas.follow.refer.1.detail = Diet support in Arabic; eye and foot checks booked.
prevention.pv.ifhas.follow.refer.2.title = Bowel test
prevention.pv.ifhas.follow.refer.2.detail = Kit returned: normal.
prevention.pv.ifhas.follow.refer.3.title = 3 months
prevention.pv.ifhas.follow.refer.3.detail = HbA1c rechecked; next IFHAS items added to the passport.
prevention.pv.expat.family.0.name = Priya, 31
prevention.pv.expat.family.0.what = IFHAS is for Emiratis aged 18–75, so Noa does not nudge her
prevention.pv.expat.family.0.state = —
prevention.pv.expat.family.1.name = Vikram, 34
prevention.pv.expat.family.1.what = IFHAS is for Emiratis aged 18–75
prevention.pv.expat.family.1.state = —
prevention.pv.expat.slot.awareness = Tuesday 10:00 at Mussafah Family Health Centre, 1 km away; Noa explains the 14 visits in English
prevention.pv.expat.slot.access = Saturday 10:00, when Vikram is off work
prevention.pv.expat.slot.trust = Tuesday 10:00 with a female doctor; Priya can bring her own records from India
prevention.pv.expat.slot.value = Tuesday 10:00; this visit checks growth and gives the 4-month vaccines
prevention.pv.expat.slot.forgot = Tuesday 10:00
prevention.pv.expat.result.label = Weight-for-age centile
prevention.pv.expat.result.unit = centile
prevention.pv.expat.result.rule = Below the 2nd or above the 98th centile needs a feeding and growth review (demo threshold)
prevention.pv.expat.follow.refer.0.title = Feeding review
prevention.pv.expat.follow.refer.0.detail = Feeding plan agreed; weight check in 2 weeks.
prevention.pv.expat.follow.refer.1.title = Weight check
prevention.pv.expat.follow.refer.1.detail = Back on track.
prevention.pv.expat.follow.refer.2.title = Passport
prevention.pv.expat.follow.refer.2.detail = 6-month visit booked.
prevention.pv.bone.family.0.name = Moza, 78
prevention.pv.bone.family.0.what = Outside the IFHAS age range; her stroke clinic follows her
prevention.pv.bone.family.0.state = —
prevention.pv.bone.family.1.name = Khalid, 47
prevention.pv.bone.family.1.what = IFHAS screening
prevention.pv.bone.family.1.state = booked ✓
prevention.pv.bone.slot.access = Monday 10:00 at Al Bateen Family Health Centre; Noa books a taxi both ways and tells Khalid
prevention.pv.bone.slot.awareness = Monday 10:00; Noa explains the bone and memory checks at 74
prevention.pv.bone.slot.trust = Monday 10:00 with Dr Fatima Al Ali, whom he knows
prevention.pv.bone.slot.value = Monday 10:00: a bone scan can show weak bones before a fall breaks one
prevention.pv.bone.slot.forgot = Monday 10:00
prevention.pv.bone.result.label = Bone density T-score
prevention.pv.bone.result.rule = −2.5 or lower is osteoporosis; between −1 and −2.5 is low bone density (WHO definitions)
prevention.pv.bone.follow.refer.0.title = Doctor review
prevention.pv.bone.follow.refer.0.detail = Bone-strengthening treatment agreed. The doctor decides.
prevention.pv.bone.follow.refer.1.title = Home safety check
prevention.pv.bone.follow.refer.1.detail = Loose rug removed; grab rail fitted in the bathroom.
prevention.pv.bone.follow.refer.2.title = Daily walks
prevention.pv.bone.follow.refer.2.detail = Guardian sees his walks to the mosque continue.
prevention.pv.bone.follow.refer.3.title = Passport
prevention.pv.bone.follow.refer.3.detail = Next bone scan in 2 years.
```

<a id="pl-d"></a>
## Phụ lục D. Lần chạy tự động mặc định của 10 case (kết quả mong đợi)

Kết quả mong đợi cho người test: mỗi case chạy `Run it for me` với đầu vào mặc định trên engine thật; dòng đầu là tóm tắt (số tick, luật, tên, hành trình, bước cuối, số bước, why1, tTrig/tCheck/tAct, nhánh, bộ teach-back, điểm/mức giọng nói, câu trả lời, đồng hồ cuối), rồi kích thước 10 bảng DB, các dòng `Right action, right time?` (`checks`, ngăn bằng `|`), và log sự kiện **cũ nhất trước** (giao diện hiện mới nhất trước).

```text

# family: ticks=30 rule=undefined name="" path=fam step=5 steps=6 why1=null tTrig=null tCheck=null tAct=18:30 branch=null teach=prev_ref speech=undefined/undefined ans=null clock=14 Nov 09:00
  db {
  agents: 9,
  patients: 8,
  consents: 10,
  observations: 15,
  checkins: 0,
  alerts: 6,
  tasks: 15,
  encounters: 12,
  reports: 1,
  audit: 2
}
  famScore 91 up 8 status {"moza":"care","saeed":"care","khalid":"care","amna":"care","maitha":"ok","sultan":"ok","hind":"care","hamdan":"ok"} conn C1,C7,C2,C3,C6,C8,C5 badges hamdan,bp,trip,first,sultan,plan,hind8,heart routes hind:refer,maitha_a1c:ok,khalid_a1c:refer,khalid_tc:ok,khalid_hdl:ok,khalid_sbp:ok,amna_a1c:refer,saeed_acr:refer,sultan_sbp:ok khalidFc 25.5% high ha 77 alerts c5:done,fc_khalid:done,fc_saeed:done,r_saeed_acr:done,r_amna_a1c:done,r_khalid_a1c:done,r_hind:done,moza:done,hind:done,maitha:done,khalid:done,amna:done,saeed:done,sultan:done,hamdan:done
  log (oldest first):
     18:30 START Case loaded · Khalid Al Mansoori · The whole family
     18:35 ACCEPT Stroke clinic accepted Moza’s alert
     18:35 BADGE Family badge: Moza’s blood pressure plan updated
     18:35 SCORE Family passport 33% (+8)
     18:35 BOOK Noa Navigator · Hind booked: Saturday 09:00, Al Khalidiya Family Health Centre
     18:35 SCORE Family passport 42% (+9)
     18:35 BOOK Noa Navigator · Maitha booked: Saturday 09:15, same clinic
     18:35 BADGE Family badge: One trip, four checks
     18:35 SCORE Family passport 46% (+4)
     18:35 BOOK Noa Navigator · Khalid booked: Saturday 09:30, same clinic
     18:35 BADGE Family badge: Khalid’s first screening
     18:35 SCORE Family passport 54% (+8)
     18:35 BOOK Noa Navigator · Amna booked: Saturday 09:45, same clinic
     18:35 SCORE Family passport 58% (+4)
     18:35 BOOK Noa Navigator · Saeed booked: Tuesday 10:00, his diabetes clinic visit
     18:35 SCORE Family passport 67% (+9)
     18:35 BOOK Noa Navigator · Sultan booked: Wednesday 19:00, Al Khalidiya Family Health Centre, with quit support
     18:35 BADGE Family badge: Sultan’s first screening
     18:35 CONNECT Noa Insight · new family connection: father and son both smoke → quit support for both
     18:35 SCORE Family passport 76% (+9)
     09:00 RECORD Hind · 18-month visit · Weighed, measured, vaccines given. The doctor records the words she says.
     09:15 RECORD Maitha · IFHAS · Blood pressure 114/72, HbA1c taken. Her mother’s diabetes in pregnancy noted for any future pregnancy.
     09:30 RECORD Khalid · IFHAS screening · Blood pressure taken. HbA1c and cholesterol (fasting). Bowel test kit given. Quit support offered. Family history recorded: mother’s stroke, father’s heart attack at 62.
     09:45 RECORD Amna · HbA1c, 6 weeks early · 5 minutes while the grandchildren wait with Khalid.
     10:00 RECORD Saeed · at his diabetes visit · Eye photos and a urine albumin test added. No extra trip.
     19:00 RECORD Sultan · Wednesday evening · Blood pressure, BMI, HbA1c. A young doctor talked with him about vaping; quit app set up.
     12:00 ROUTE Noa Insight · Hind: words besides mama and dada 2 → Child speech and hearing clinic
     12:00 ROUTE Noa Insight · Maitha: HbA1c 5.4 → healthy · passport
     12:00 ROUTE Noa Insight · Khalid: HbA1c 6.1 → Healthy lifestyle programme
     12:00 ROUTE Noa Insight · Amna: HbA1c 6 → Healthy lifestyle programme
     12:00 ROUTE Noa Insight · Saeed: urine albumin (ACR) 4.2 → Diabetes clinic · Capital General Hospital
     12:00 ROUTE Noa Insight · Sultan: blood pressure (top number) 126 → healthy · passport
     12:00 FORECAST Noa Forecast · Khalid recalculated with cholesterol: 26% (high), heart age 77
     12:00 FORECAST Noa Forecast · Saeed: 10-year heart risk 40% (high) → routed to the family doctor
     12:00 FORECAST Noa Forecast · Khalid: 10-year heart risk 26% (high) → routed to the family doctor
     12:00 CONNECT Noa Insight · new family connection: Khalid’s result → family eating and activity plan
     12:00 BADGE Family badge: Family plan started
     12:00 BADGE Family badge: Hind: 8 of 14 visits
     12:00 BADGE Family badge: Every adult’s heart risk known
     18:00 CHECK Noa Coach · teach-back passed
     18:20 CONSENT Khalid chose who sees the plan: Amna, Moza
     10:00 STEP Hind · hearing test · Normal hearing; 6 speech therapy sessions on Saturdays near home.
     10:10 STEP Khalid · doctor review · Dr Aisha Al Hosani reviews his HbA1c, cholesterol and heart risk; care plan agreed. The doctor decides the treatment.
     10:12 STEP Khalid · heart risk · Forecast shared with Khalid: quitting medwakh and lower blood pressure bring his 5-year line down.
     10:20 STEP Amna · lifestyle programme · Joins with Khalid: 8 weekly sessions, evenings.
     10:30 STEP Saeed · kidney protection · His diabetes doctor adjusts his medicines; recheck in 3 months.
     10:50 STEP Family plan · Week 1: Friday family walk, sugary drinks swapped at home. Hind and Hamdan’s growth watched.
     11:00 STEP Passport · Next checks for all eight are in the passport, each with one reminder only. Noa Forecast recalculates when new readings arrive.
     09:00 POST Noa Analyst drafted, hospital signed off · Family Health Passport report → Department of Health

# wellchild: ticks=24 rule=P4 name="Easy access and booking" path=prev step=7 steps=8 why1=null tTrig=null tCheck=null tAct=18:33 branch=refer teach=child_speech speech=undefined/undefined ans=null clock=5 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 0,
  alerts: 2,
  tasks: 6,
  encounters: 5,
  reports: 1,
  audit: 4
}
  checks: Asked about the barrier after 3 reminders instead of sending reminder 4 | Matched the support to the barrier: Easy access and booking | Booking offered in one tap, near home | Choice preserved: Maitha can change or cancel | One trip for the family: Khalid’s overdue screening booked 30 minutes later
  log (oldest first):
     18:30 START Case loaded · Hind Al Mansoori · Well-child visit overdue
     18:30 PASSPORT Noa Guardian · 18-month visit (8 of 14), overdue 3 weeks · 3 reminders already sent
     18:30 ASK Noa Voice → Maitha: one question to find the barrier, instead of reminder 4
     18:33 ANSWER Maitha: “The times or the travel don’t work for us”
     18:33 DECIDE Noa agents decide · P4 → Easy access and booking (not another reminder)
     18:35 ACT Book it · Booked: Saturday 09:00 at Al Khalidiya Family Health Centre, 2 km from home, with Maitha’s screening at 09:15 and grandfather Khalid’s at 09:30: one trip for the family
     09:00 RECORD Check-in · Weighed and measured: growing on the 50th centile.
     09:10 RECORD Development check · Walking well. The doctor records the words she says.
     09:20 RECORD Vaccines · Given as per the schedule. No reaction after 15 minutes.
     09:25 RECORD Passport updated · Next: the 2-year visit.
     12:00 ROUTE Noa Insight · Words besides “mama” and “dada” 2 → Child speech and hearing clinic
     09:00 ACCEPT Child speech and hearing clinic accepted · Hearing test booked for next week; speech assessment after.
     18:00 CHECK Noa Coach · teach-back passed
     18:20 CONSENT Hind chose who sees the plan: Maitha, Amna
     10:00 STEP Hearing test · Normal hearing.
     10:00 STEP Speech assessment · Mild speech delay: 6 sessions of speech therapy on Saturdays near home.
     10:00 STEP Therapy · 5 of 6 sessions attended. Hind now says 15 words.
     10:00 STEP Passport · 2-year visit booked; one reminder 3 days before.
     09:00 POST Noa Analyst drafted, hospital signed off · Well-child visits (1 month to 6 years) report → Department of Health

# ifhas: ticks=24 rule=P6 name="Personalised outreach" path=prev step=7 steps=8 why1=null tTrig=null tCheck=null tAct=18:33 branch=refer teach=dm speech=undefined/undefined ans=null clock=5 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 0,
  alerts: 2,
  tasks: 6,
  encounters: 5,
  reports: 1,
  audit: 4
}
  checks: Asked about the barrier after 2 reminders instead of sending reminder 3 | Matched the support to the barrier: Personalised outreach | Booking offered in one tap, near home | Choice preserved: Khalid can change or cancel
  log (oldest first):
     18:30 START Case loaded · Khalid Al Mansoori · Adult screening never done
     18:30 PASSPORT Noa Guardian · IFHAS screening (3 groups due) · 2 reminders already sent
     18:30 ASK Noa Voice → Khalid: one question to find the barrier, instead of reminder 3
     18:33 ANSWER Khalid: “I feel fine, so why test?”
     18:33 DECIDE Noa agents decide · P6 → Personalised outreach (not another reminder)
     18:35 ACT Book it · Booked: Saturday 09:30 at Al Khalidiya Family Health Centre, right after Hind’s visit: 15 minutes, fasting blood test
     09:00 RECORD Check-in · Blood pressure 138/86. Waist 104 cm.
     09:10 RECORD Blood tests · HbA1c and cholesterol (fasting).
     09:15 RECORD Bowel screening · Home test kit given, instructions in Arabic.
     09:20 RECORD Heart risk · Family history recorded: mother’s stroke, father’s heart attack at 62. Cholesterol goes to Noa Forecast.
     12:00 ROUTE Noa Insight · HbA1c 7.4 → Family doctor · Dr Aisha Al Hosani
     09:00 ACCEPT Family doctor · Dr Aisha Al Hosani accepted · Second HbA1c and doctor review booked in 2 weeks.
     18:00 CHECK Noa Coach · teach-back passed
     18:20 CONSENT Khalid chose who sees the plan: Amna, Moza
     10:00 STEP Second HbA1c · Confirmed by Dr Aisha Al Hosani; care plan agreed. The doctor decides the treatment.
     10:30 STEP Care plan · Diet support in Arabic; eye and foot checks booked.
     10:00 STEP Bowel test · Kit returned: normal.
     10:00 STEP 3 months · HbA1c rechecked; next IFHAS items added to the passport.
     09:00 POST Noa Analyst drafted, hospital signed off · IFHAS screening (Emiratis 18–75) report → Department of Health

# expat: ticks=21 rule=P3 name="Know what is due" path=prev step=7 steps=8 why1=null tTrig=null tCheck=null tAct=18:33 branch=ok teach=prev_ok speech=undefined/undefined ans=null clock=5 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 0,
  alerts: 1,
  tasks: 3,
  encounters: 5,
  reports: 1,
  audit: 4
}
  checks: Asked about the barrier before any reminder | Matched the support to the barrier: Know what is due | Booking offered in one tap, near home | Choice preserved: Priya can change or cancel | Did not nudge Priya or Vikram for IFHAS: it is for Emiratis aged 18–75
  log (oldest first):
     18:30 START Case loaded · Arjun Nair · New to Abu Dhabi
     18:30 PASSPORT Noa Guardian · 4-month visit (3 of 14) · 0 reminders already sent
     18:30 ASK Noa Voice → Priya: one question to find the barrier, instead of reminder 1
     18:33 ANSWER Priya: “I didn’t know it was due”
     18:33 DECIDE Noa agents decide · P3 → Know what is due (not another reminder)
     18:35 ACT Book it · Booked: Tuesday 10:00 at Mussafah Family Health Centre, 1 km away; Noa explains the 14 visits in English
     09:00 RECORD Check-in · Weighed and measured.
     09:10 RECORD Check · Feeding well, smiling, holding his head up.
     09:20 RECORD Vaccines · 4-month vaccines given; records from India added to the passport.
     09:25 RECORD Passport · Next: the 6-month visit.
     12:00 ROUTE Noa Insight · Weight-for-age centile 40 → healthy · passport: the 6-month visit
     18:00 CHECK Noa Coach · teach-back passed
     18:20 CONSENT Arjun chose who sees the plan: Priya, Vikram
     10:00 STEP Passport · 6-month visit booked; one reminder 3 days before.
     10:05 STEP Passport · All 14 visits listed in English, with what each checks.
     09:00 POST Noa Analyst drafted, hospital signed off · Well-child visits (1 month to 6 years) report → Department of Health

# bone: ticks=24 rule=P4 name="Easy access and booking" path=prev step=7 steps=8 why1=null tTrig=null tCheck=null tAct=18:33 branch=refer teach=bone speech=undefined/undefined ans=null clock=5 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 0,
  alerts: 2,
  tasks: 6,
  encounters: 5,
  reports: 1,
  audit: 4
}
  checks: Asked about the barrier after 3 reminders instead of sending reminder 4 | Matched the support to the barrier: Easy access and booking | Booking offered in one tap, near home | Choice preserved: Hamad can change or cancel
  log (oldest first):
     18:30 START Case loaded · Hamad Al Hammadi · Bone and memory check
     18:30 PASSPORT Noa Guardian · IFHAS screening (5 groups due) · 3 reminders already sent
     18:30 ASK Noa Voice → Hamad: one question to find the barrier, instead of reminder 4
     18:33 ANSWER Hamad: “The times or the travel don’t work for us”
     18:33 DECIDE Noa agents decide · P4 → Easy access and booking (not another reminder)
     18:35 ACT Book it · Booked: Monday 10:00 at Al Bateen Family Health Centre; Noa books a taxi both ways and tells Khalid
     09:00 RECORD Check-in · Blood pressure 142/84.
     09:15 RECORD Bone density scan · Hip and spine scanned.
     09:30 RECORD Memory check · Normal for his age.
     09:40 RECORD Blood tests · Kidney function, vitamin D, HbA1c.
     12:00 ROUTE Noa Insight · Bone density T-score -2.7 → Family doctor · Dr Fatima Al Ali
     09:00 ACCEPT Family doctor · Dr Fatima Al Ali accepted · Doctor review booked this week; home safety check arranged.
     18:00 CHECK Noa Coach · teach-back passed
     18:20 CONSENT Hamad chose who sees the plan: Khalid, Moza
     10:00 STEP Doctor review · Bone-strengthening treatment agreed. The doctor decides.
     10:00 STEP Home safety check · Loose rug removed; grab rail fitted in the bathroom.
     10:00 STEP Daily walks · Guardian sees his walks to the mosque continue.
     10:00 STEP Passport · Next bone scan in 2 years.
     09:00 POST Noa Analyst drafted, hospital signed off · IFHAS screening (Emiratis 18–75) report → Department of Health

# stroke: ticks=31 rule=R5 name="Emergency: possible stroke" path=stroke_em step=8 steps=9 why1=R1 tTrig=01:31 tCheck=01:32 tAct=01:34 branch=null teach=stroke speech=0.33/red ans=fine clock=31 Oct 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 2,
  alerts: 2,
  tasks: 6,
  encounters: 9,
  reports: 1,
  audit: 6
}
  checks: Rule R1 met at 01:31; Noa Voice checked at 01:32 (1 min, target ≤ 1) | Waited for the full 10 minutes before waking Moza, so a short spike wakes nobody | 998 called at 01:36, 4 min after the check (target ≤ 3) | Last known well 01:22 sent ahead for the stroke team
  log (oldest first):
     01:12 START Case loaded · Moza Al Hammadi · Stroke at night
     01:12 WATCH Noa Guardian · watching Moza from 01:12
     01:32 DETECT Noa Guardian · rule R1 met: heart rate above 120 for 10 min while still → hand-off to Noa Voice
     01:32 ALERT Noa Guardian → Khalid and Hamad: “Noa is checking on Moza.”
     01:32 ASK Noa Voice calls Moza: “Moza, are you all right? I noticed your heart racing.”
     01:32 CHECK Noa Voice · speech check: clearly changed (score 0.33)
     01:34 DECIDE Noa agents decide · R5 → Emergency: possible stroke
     01:34 STEP Responder calls Khalid (son, Al Ain) · No answer
     01:35 STEP Responder calls Hamad (brother), 450 m away · On the way
     01:36 STEP Responder calls 998 · operator takes over · Ambulance dispatched
     01:36 STEP Voice to Moza · “Help is coming. Stay seated. Don’t eat or drink.”
     02:07 ACT Activate the stroke team · Stroke team activated. CT room held.
     02:24 RECORD Arrival · NIHSS 6 · Right arm weakness, slurred speech. BP 168/96, glucose 6.4.
     02:31 RECORD CT head and CT angiogram · No bleeding. Left M2 occlusion.
     02:52 RECORD Tenecteplase · Clot-busting medicine, the doctor’s decision. Door to needle 28 min.
     03:40 RECORD NIHSS 3 · The stroke score improved. Noa Voice tells the family.
     09:10 RECORD Swallow screen · Passed: safe for a normal diet.
     19:10 RECORD Heart monitoring · Paroxysmal atrial fibrillation found. Stroke-risk score (CHA₂DS₂-VASc) 6.
     09:10 RECORD MRI brain and heart ultrasound · Small infarct. Heart pumping normally.
     09:20 RECORD Family screening · Noa Insight offers Khalid a blood pressure and rhythm check in his own app.
     10:45 CHECK Noa Coach · teach-back passed
     11:05 CONSENT Moza chose who sees the plan: Khalid, Hamad
     08:10 CHECK Noa Voice · speech check: as usual (score 1.00)
     08:10 ROUTE Noa Navigator · Blood pressure above target for 5 days: average 146 mmHg, with every dose taken → Stroke clinic · Dr Omar Haddad
     09:30 ACCEPT Stroke clinic · Dr Omar Haddad accepted the alert · Review the perindopril dose
     09:00 POST Noa Analyst drafted, hospital signed off · Stroke pathway report → Department of Health

# fall: ticks=31 rule=R7 name="Emergency: fall, can’t get up" path=fall_em step=8 steps=9 why1=R2 tTrig=03:17 tCheck=03:18 tAct=03:20 branch=null teach=fall speech=1/green ans=cant clock=1 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 2,
  alerts: 2,
  tasks: 6,
  encounters: 9,
  reports: 1,
  audit: 6
}
  checks: Rule R2 met at 03:17; Noa Voice checked at 03:18 (1 min, target ≤ 1) | 998 called at 03:22, 4 min after the check (target ≤ 3) | On a blood thinner: head CT flagged before arrival
  log (oldest first):
     03:05 START Case loaded · Hessa Al Ketbi · Fall in the night
     03:05 WATCH Noa Guardian · watching Hessa from 03:05
     03:18 DETECT Noa Guardian · rule R2 met: fall detected, still on the floor after 2 min → hand-off to Noa Voice
     03:18 ALERT Noa Guardian → Saif and Noura: “Noa is checking on Hessa.”
     03:18 ASK Noa Voice calls Hessa: “Hessa, I felt a hard fall. Can you get up on your own?”
     03:18 CHECK Noa Voice · speech check: as usual (score 1.00)
     03:20 DECIDE Noa agents decide · R7 → Emergency: fall, can’t get up
     03:20 STEP Responder calls Saif (son, night shifts) · No answer
     03:21 STEP Responder calls Noura (neighbour, has a key), 60 m away · Coming with the key
     03:22 STEP Responder calls 998 · operator takes over · Ambulance dispatched
     03:22 STEP Voice to Hessa · “Don’t try to get up. Noura is coming. Stay warm.”
     03:45 ACT Prepare a head CT and hip X-ray · Head CT and hip X-ray ready on arrival.
     04:05 RECORD Arrival · Right leg short and turned out. Pain 8 out of 10.
     04:25 RECORD CT head · No bleeding (important on a blood thinner).
     04:40 RECORD Hip X-ray · Fractured right hip.
     04:55 RECORD Pain relief and plan · Nerve block for pain. Surgery within 36 hours; the surgeon decides. Apixaban paused.
     09:00 RECORD Hip surgery · Done on day 1. Walking with a frame on day 2.
     10:00 RECORD Confusion screen · Clear.
     11:00 RECORD Lying and standing blood pressure · Drops 24 mmHg on standing: the likely cause of the fall.
     12:00 RECORD Bone health and home · Osteoporosis treatment reviewed. Noa Insight books motion lights for the bathroom route.
     11:00 CHECK Noa Coach · teach-back passed
     11:20 CONSENT Hessa chose who sees the plan: Saif, Noura
     08:10 CHECK Noa Voice · speech check: as usual (score 1.00)
     08:10 ROUTE Noa Navigator · Blood pressure drops 22 mmHg when she stands, still the likely cause of falls → Family doctor · Dr Fatima Al Ali
     10:00 ACCEPT Family doctor · Dr Fatima Al Ali accepted the alert · Review amlodipine (may stop it)
     09:00 POST Noa Analyst drafted, hospital signed off · Falls pathway report → Department of Health

# hypo: ticks=17 rule=R9 name="Low sugar, treated at home" path=hypo_home step=6 steps=7 why1=R3 tTrig=02:50 tCheck=02:51 tAct=02:53 branch=null teach=hypo speech=1/green ans=drink clock=1 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 3,
  checkins: 2,
  alerts: 1,
  tasks: 1,
  encounters: 1,
  reports: 1,
  audit: 5
}
  checks: Rule R3 met at 02:50; Noa Voice checked at 02:51 (1 min, target ≤ 1) | Answering clearly, so no ambulance: fast sugar now, recheck at 03:08
  log (oldest first):
     02:40 START Case loaded · Saeed Al Nuaimi · Low sugar at night
     02:40 WATCH Noa Guardian · watching Saeed from 02:40
     02:51 DETECT Noa Guardian · rule R3 met: glucose 2.7 mmol/L → hand-off to Noa Voice
     02:51 ALERT Noa Guardian → Shamsa and Rashid: “Noa is checking on Saeed.”
     02:51 ASK Noa Voice calls Saeed: “Saeed, your sugar is low. Can you drink the juice by your bed?”
     02:51 CHECK Noa Voice · speech check: as usual (score 1.00)
     02:53 DECIDE Noa agents decide · R9 → Low sugar, treated at home
     03:08 CHECK Noa Coach · recheck 5.1 mmol/L → recovered; snack now; doctor in the morning
     08:30 ACT Review the insulin dose · Night insulin lowered from 24 to 20 units.
     11:00 CHECK Noa Coach · teach-back passed
     11:20 CONSENT Saeed chose who sees the plan: Shamsa, Rashid
     08:10 CHECK Noa Voice · speech check: as usual (score 1.00)
     08:10 CHECK Noa Navigator · Lowest night glucose, last 7 nights 4.6 mmol/L is on target (4.0 or above) → no alert
     09:00 POST Noa Analyst drafted, hospital signed off · Diabetes: night hypoglycaemia report → Department of Health

# hf: ticks=20 rule=R10 name="Fluid build-up: same-day nurse" path=hf_clinic step=6 steps=7 why1=R4 tTrig=08:20 tCheck=08:21 tAct=08:23 branch=null teach=hf speech=1/green ans=pillows clock=1 Nov 09:00
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 2,
  checkins: 2,
  alerts: 1,
  tasks: 1,
  encounters: 5,
  reports: 1,
  audit: 5
}
  checks: Rule R4 met at 08:20; Noa Voice checked at 08:21 (1 min, target ≤ 1) | Breathless only lying flat: same-day nurse, not 998
  log (oldest first):
     08:10 START Case loaded · Mariam Al Shamsi · Fluid build-up
     08:10 WATCH Noa Guardian · watching Mariam from 08:10
     08:21 DETECT Noa Guardian · rule R4 met: weight up 2.4 kg / oxygen 93% → hand-off to Noa Voice
     08:21 ASK Noa Voice calls Mariam: “Mariam, your weight is up. Are you more breathless than usual?”
     08:21 CHECK Noa Voice · speech check: as usual (score 1.00)
     08:23 DECIDE Noa agents decide · R10 → Fluid build-up: same-day nurse
     08:28 ACT Accept the same-day slot · Seen at 11:30 today.
     11:30 RECORD Nurse visit · Swollen ankles, crackles at the lung bases, weight up 2.4 kg.
     11:45 RECORD Plan with the cardiologist · Furosemide 40 → 80 mg for 3 days.
     11:50 RECORD Blood tests · Kidney function and potassium; recheck in 3 days.
     12:00 RECORD Home the same day · No hospital admission.
     13:00 CHECK Noa Coach · teach-back passed
     13:20 CONSENT Mariam chose who sees the plan: Ahmed, Latifa
     08:10 CHECK Noa Voice · speech check: as usual (score 1.00)
     08:10 CHECK Noa Navigator · Morning weight vs dry weight 0.4 kg is on target (up to +1.0) → no alert
     09:00 POST Noa Analyst drafted, hospital signed off · Heart failure report → Department of Health

# own: ticks=2 rule=R12 name="No action" path=null step=0 steps=1 why1=null tTrig=null tCheck=null tAct=null branch=null teach=null speech=undefined/undefined ans=null clock=15 Oct 01:28
  db {
  agents: 9,
  patients: 1,
  consents: 4,
  observations: 0,
  checkins: 0,
  alerts: 0,
  tasks: 0,
  encounters: 0,
  reports: 0,
  audit: 2
}
  checks: No rule met, so nobody was woken at night
  log (oldest first):
     01:12 START Case loaded · Moza Al Hammadi · Enter your own
     01:12 WATCH Noa Guardian · watching Moza from 01:12
     01:28 WATCH Noa Guardian · no rule met · All readings are within her normal range. No rule met, so nobody is woken.
```
