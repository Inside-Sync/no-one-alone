# Thêm AI cho demo: những việc khả thi ngay (nhờ team AI xem)

> Ngày 20/11/2026. Từ team web gửi team AI. Mục tiêu: khi demo, **giám khảo thấy AI làm việc**, không chỉ engine luật. Chỉ gồm những việc nhỏ: mỗi việc dùng **một `callId` / `qid`** và đi đúng đường đã có (`/noa/say`, validator, chữ soạn sẵn khi lỗi).
>
> Giữ nguyên nguyên tắc: **luật quyết, AI chỉ viết và đọc chữ**. Không chẩn đoán, không liều thuốc; câu cấp cứu luôn là kịch bản cố định.
>
> Đọc kèm: [BAN_GIAO_UXUI_MOI_CHO_TEAM_AI.md](BAN_GIAO_UXUI_MOI_CHO_TEAM_AI.md), mục 13c.

## 1. Sửa trước khi demo (từ lần chạy AI thật hôm nay)

**Cách chạy:** web local bật `VITE_NOA_AI=on`, gọi respond-agent trên production. Playwright chạy 10 quick test case, mỗi case chạy hai lần: có AI và không AI.

**Kết quả tốt:**
- Nhánh rẽ và kết quả cuối **giống hệt** khi không có AI ở các case đã so. AI không làm thay đổi quyết định nào.
- Cấp cứu (s2) vẫn là **Fixed script**.
- Độ trễ trung bình: Guardian và Voice khoảng 1,5 giây; các agent khác khoảng 2–4 giây.

**Cần sửa:**
| # | Vấn đề | Số liệu | Đề xuất |
|---|---|---|---|
| 1 | **Tin bị chặn vì quá dài** (`guardrail: length`): mỗi case có 1–2 tin "Guardrail" xen giữa "Live AI" | `detect.forecast` 8/10 lần, `pathway.navigator.offer` 4/9 | Nâng giới hạn của hai `callId` này lên khoảng 80 chữ, hoặc nhắc giới hạn rõ hơn trong prompt |
| 2 | **503 (mô hình trả rỗng)** | `detect.forecast` 1 lần, `pathway.navigator.offer` 2 lần | Xem log `noa_call` kết quả `failed` |
| 3 | **core-api trên production chưa có `/api/noa/*`** (trả 404) | Deploy của PR #78 bị bỏ qua khi CI bị hủy; các lần deploy sau chỉ tính file đổi ở commit cuối | Deploy tay `gh workflow run Deploy --ref dev -f target=core-api`. Sau đó sửa `deploy.yml` để so với lần deploy thành công gần nhất |

## 2. Ba việc thêm AI (đều nhỏ)

### 2.1 Detect lúc mở trang dùng AI thật
- **Vì sao:** hiện lần tự chạy khi mở trang dùng chữ soạn sẵn, nên **ấn tượng đầu tiên của giám khảo là "Prepared"**.
- **Làm gì:** chỉ 2 lượt của Detect (`detect.guardian`, `detect.forecast`) dùng AI thật khi mở trang; các bước sau vẫn chờ người dùng bấm.
- **Team AI:** không cần `callId` mới. Chỉ cần đồng ý chi phí: 2 lượt mỗi lần có người mở trang. Có thể đưa `detect.forecast` về mô hình nhanh.
- **Team web:** sửa một chỗ trong engine (`quiet` không áp dụng cho 2 lượt Detect).

### 2.2 Tin nhắn gửi gia đình do AI viết
- **Vì sao:** khung "Noa · family messages" là chỗ giám khảo dễ thấy nhất, nhưng hiện toàn chữ soạn sẵn.
- **Làm gì:** khi engine gửi thông báo cho một người trong gia đình (đặt lịch xong, kết quả cần chú ý…), AI viết lại câu cho đúng người: Moza nhận lời ấm áp bằng tiếng Ả Rập, Khalid nhận tin ngắn. Tin gắn nhãn "Live AI".
- **Team AI:** `callId` mới `family.notify`:
  - `params`: `{ to, relation, event, urgency, lang }`;
  - mô hình nhanh, tối đa khoảng 30 chữ;
  - validator như các `callId` khác.

  Thông báo khẩn **không** đi qua AI.
- **Team web:** gọi `say` tại hàm `notify` của engine; lỗi thì giữ chữ soạn sẵn.

### 2.3 Đoạn "Tuần này" trên trang Government (Analyst)
- **Vì sao:** giám khảo xem trang Sở Y tế sẽ thấy AI tóm tắt số liệu cho người quản lý, đúng vai Analyst trong kiến trúc.
- **Làm gì:** đầu phần "Prevention and screening", AI viết 2–3 câu từ các số tổng hợp có sẵn, ví dụ: "Uptake thấp nhất ở nam người nước ngoài 40–59 (36%)…". Có nhãn "Live AI · aggregates only".
- **Team AI:** `callId` mới `analyst.weekly`:
  - `params` chỉ là số tổng hợp đã ẩn nhóm dưới 10;
  - validator: con số phải có trong `params`, không có tên người;
  - mô hình nhanh.
- **Team web:** một ô chữ trên trang Government, gọi một lần khi mở trang, lỗi thì hiện câu soạn sẵn.

## 3. Nhờ team AI trả lời

| # | Câu hỏi |
|---|---|
| 1 | Mục 1, dòng 1–2: sửa giới hạn chữ và 503 thế nào? |
| 2 | Mục 1, dòng 3: ai deploy core-api? |
| 3 | 2.1: đồng ý chi phí 2 lượt mỗi lần mở trang không? |
| 4 | 2.2 và 2.3: làm được `family.notify` và `analyst.weekly` không, khi nào? |

Trả lời ghi thẳng vào file này hoặc tạo file mới trong `handover/`. Team web làm phần giao diện ngay khi có `callId`.

## 4. Team AI trả lời (câu 1, 2, 4)

**Câu 1. Giới hạn chữ và 503.**
- PR #83 nâng giới hạn của `detect.forecast` và `pathway.navigator.offer` lên 80 chữ.
- Các lần 503 là do mô hình Opus hết thời gian chờ, không phải mô hình trả rỗng. Web vẫn hiện chữ soạn sẵn như cũ.

**Câu 2. Ai deploy core-api.**
- Team AI đã deploy core-api bằng tay, nên `/api/noa/*` đã có trên production.
- PR #84 nâng giới hạn số lượt gọi `say` và `understand` trên core-api.

**Câu 4. `family.notify` và `analyst.weekly`.** Làm được. Dùng được khi PR C đã merge và deploy cả respond-agent lẫn core-api.

`family.notify` (mô hình nhanh, tối đa 30 chữ):
- `params`: `audience`, `to`, `relation` (mỗi trường tối đa 120 ký tự), `event` (tối đa 300 ký tự), `urgency` (`"routine"` hoặc `"soon"`).
- `lang` không nằm trong `params`. Nó là trường `lang` của request như mọi `callId` khác.
- `audience` bắt buộc. `RemoteAi` đã tự thêm trường này.
- `urgency: "urgent"` bị từ chối. Thông báo khẩn không bao giờ gọi `say`, web giữ chữ cố định.
- Server không chặn theo từ cấp cứu trong `event`, vì `event` là chữ của engine.
- Kết quả là guardrail (bất kỳ lý do nào) thì web giữ chữ soạn sẵn.

`analyst.weekly` (mô hình nhanh, tối đa 60 chữ):
- `params`: `audience`, `period` (tối đa 120 ký tự), `groups` (1 đến 12 nhóm).
- Mỗi nhóm: `segment` (tối đa 120 ký tự), `recommended` (số nguyên 10 đến 1.000.000), `uptake_pct` (số nguyên 0 đến 100).
- Nhóm có `recommended` dưới 10 làm cả request bị từ chối. Web phải bỏ các nhóm này trước khi gửi.
- Mọi con số trong câu trả lời phải có trong `params`, nếu không là guardrail `number`.
- `params` chỉ có số tổng hợp, không có tên người. Prompt cũng dặn không ghi tên.

Lỗi `params` (sai trường, quá dài, `urgent`, nhóm dưới 10) trả 502 `AGENT_FAILED` qua core-api.

Câu 3 (chi phí của 2.1) chờ chủ dự án trả lời.
