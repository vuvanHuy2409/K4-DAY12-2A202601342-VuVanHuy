# Phiếu Phản Ánh — K4 Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: thay phần giữ chỗ dưới mỗi câu bằng câu trả lời.
> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Vũ Văn Huy  Mã học viên: 2A202601342

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `api_token` không có giá trị mặc định nên app chết ngay khi
khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà việc
"chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

> Khi deploy lên cloud mà quên đặt `API_TOKEN`, fail fast làm container dừng ngay
> và health check báo lỗi cấu hình. Nhờ vậy tôi phát hiện trước khi có traffic.
> Nếu dùng mặc định `"changeme"`, service vẫn báo khỏe và mọi người biết giá trị
> mặc định đều có thể gọi API, gây lộ dữ liệu và phát sinh chi phí.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/chat` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

> Một dòng log thực tế theo định dạng của service:
> `{"event":"chat_completed","severity":"INFO","ts":"2026-08-10T08:00:00+00:00","client_id":"sv01","usd_cost":0.0000195}`.
> Từ các trường JSON, hệ thống log có thể lọc/đếm số lần `chat_completed` theo
> `client_id`, đồng thời cộng `usd_cost` để cảnh báo chi phí. Một câu `print`
> chung chung không có trường dữ liệu ổn định để truy vấn hai việc này.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t chat:single .
docker build -t chat:multi .
docker images | grep chat
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu) | 1.7 GB |
| Multi-stage | 296 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

> Phần chênh lệch chủ yếu là base image Python đầy đủ, công cụ build/compiler,
> cache cài package và các tệp trung gian. Multi-stage chỉ chép dependency đã
> cài sang image runtime `slim`, nên không mang theo môi trường builder.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

> Khi chỉ sửa `app/main.py`, các layer base, `COPY requirements.txt` và
> `RUN pip install` vẫn lấy từ cache; layer `COPY app` và các layer sau nó phải
> tạo lại. Nếu đặt `COPY . .` trước `RUN pip install`, mọi thay đổi source làm
> mất cache của `COPY`, kéo theo cài lại toàn bộ dependency dù requirements
> không đổi, khiến build chậm hơn đáng kể.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

> Một lỗ hổng thực thi lệnh từ input có thể cho kẻ tấn công chạy mã trong
> container. Nếu process là root, mã đó có quyền sửa mọi tệp trong container;
> kết hợp một lỗi container runtime, mount nhạy cảm hoặc Docker socket bị mount,
> nó có thể tác động lên host với quyền cao. `USER appuser` cắt chuỗi ngay ở
> bước thực thi mã: process bị chiếm chỉ có UID thường và quyền tối thiểu. Đây
> là giảm thiểu thiệt hại, không thay thế việc vá lỗ hổng hay cấu hình mount an toàn.

---

### Câu 6 — Bearer token (CP3)

Vì sao 401 phải kèm header `WWW-Authenticate: Bearer`? Và vì sao ta trả **cùng
một** thông báo lỗi cho cả ba trường hợp (thiếu header, sai scheme, sai token)
thay vì nói rõ sai ở đâu cho người dùng dễ sửa?

> `WWW-Authenticate: Bearer` là challenge cho client biết endpoint dùng cơ chế
> Bearer và có thể thử xác thực lại đúng chuẩn. Trả cùng một lỗi cho thiếu header,
> sai scheme và sai token tránh tiết lộ chi tiết giúp kẻ tấn công phân biệt trạng
> thái hoặc dò credential; client hợp lệ vẫn có status 401 và header để sửa request.

---

### Câu 7 — Token bucket (CP3)

Với `capacity=10`, `refill_per_minute=10`: một client im lặng 10 phút rồi gửi
liên tiếp. Nó gửi được bao nhiêu request trước khi bị 429? Nếu bỏ đoạn
`min(capacity, ...)` trong `available()` thì con số đó thành bao nhiêu, và tại sao?

> Sau 10 phút im lặng, client vẫn chỉ gửi liên tiếp được 10 request trước khi
> request kế tiếp nhận 429, vì bucket bị chặn ở `capacity=10`. Nếu bỏ `min`, nó
> tích được 100 token trong 10 phút và burst được 100 request. Như vậy giới hạn
> không còn khống chế burst, chỉ còn khống chế tốc độ trung bình dài hạn.

---

### Câu 8 — Ngân sách theo ngày (CP3)

So sánh hạn mức $30/tháng với hạn mức $1/ngày cho cùng một client. Giả sử có sự
cố khiến một client gọi liên tục từ 2h sáng. Với mỗi cách, thiệt hại tối đa là
bao nhiêu và service tự hồi phục khi nào?

> Hạn mức 30 USD/tháng cho phép sự cố lúc 2 giờ sáng đốt gần 30 USD trước khi
> bị chặn và chỉ tự mở lại khi sang tháng mới. Hạn mức 1 USD/ngày giới hạn thiệt
> hại của ngày đó ở gần 1 USD và tự phục hồi khi khóa ngân sách chuyển sang ngày
> mới. Hạn mức ngày thu hẹp blast radius nhưng có thể làm gián đoạn khách dùng
> nhiều hợp lệ sớm hơn.

---

### Câu 9 — /healthz khác /readyz (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

> Nếu endpoint liveness cũng kiểm tra Redis, Redis mất 30 giây làm cả 3 container
> trả lỗi health check. Orchestrator coi chúng đã chết và lần lượt restart cả 3;
> container mới vẫn không nối Redis nên tiếp tục bị restart, tạo restart loop và
> làm mất cả khả năng phản hồi cơ bản. Tách endpoint thì `/healthz` vẫn 200 nên
> process không bị restart, còn `/readyz` lỗi để tạm rút cả 3 khỏi nhận traffic;
> Redis hồi phục thì readiness tự 200 và các container được đưa lại vào phục vụ.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

> Lần deploy đầu trên Railway dừng ở `Network > Healthcheck` với thông báo
> `Healthcheck failure` sau khoảng 30 giây. Tôi build và chạy đúng image ở local
> với `PORT=10000`, rồi gọi `/healthz` thành công, nên loại trừ lỗi endpoint và
> kiểm tra lại cấu hình Railway. Nguyên nhân là lệnh start tùy chỉnh can thiệp
> cách Dockerfile đọc `$PORT`, trong khi timeout health check quá ngắn. Tôi bỏ
> `startCommand` để dùng `CMD` của Dockerfile (`0.0.0.0` và `${PORT:-8000}`), đặt
> `healthcheckPath=/healthz`, tăng timeout lên 120 giây. Deployment sau đó Active;
> `/healthz`, `/readyz` và chat có token đều vượt qua kiểm thử CP5.
