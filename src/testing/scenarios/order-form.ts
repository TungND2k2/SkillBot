import type { TestScenario } from "../types.js";

const scenario: TestScenario = {
  name: "Điền Form Đơn Hàng PE",
  description: "SaleBot đóng vai nhân viên sale điền form đơn hàng PE từ đầu đến cuối",
  tenantId: "69d346f7682cc9e3f837f72b",

  // ── SaleBot persona ─────────────────────────────────────────
  saleRole: "sale",
  saleInstructions:
    "Bạn cần điền form đơn hàng PE mới cho khách hàng. " +
    "Hãy bắt đầu bằng cách yêu cầu bot mở form đơn hàng PE, " +
    "sau đó trả lời từng câu hỏi của bot theo dữ liệu mẫu bên dưới. " +
    "Khi bot xác nhận đơn hàng đã hoàn thành hoặc đã lưu xong, kết thúc.",
  saleData: {
    "Tên khách":        "Nguyen Van A",
    "SDT":              "0901234567",
    "Email":            "nguyenvana@gmail.com",
    "Link Facebook":    "https://facebook.com/nguyenvana",
    "Link hóa đơn":     "https://drive.google.com/invoice_test",
    "Link đề bài":      "https://drive.google.com/brief_test",
    "Tổng giá trị":     "500 USD",
    "Đặt cọc":          "200 USD",
    "Phí ship":         "20 USD",
    "Trọng lượng dự kiến": "2 kg",
    "Thời gian trả hàng":  "30/04/2026",
    "Số lượng":         "50 pcs",
    "Địa chỉ":          "12 Lê Lợi, Quận 1, TP.HCM",
  },

  // ── SkillBot side ────────────────────────────────────────────
  userName: "Test Sale",
  userRole: "sale",

  // ── Termination ──────────────────────────────────────────────
  maxTurns: 50,
  doneWhen:
    "Bot xác nhận form đơn hàng đã được lưu hoàn chỉnh / hoàn thành tất cả các trường, " +
    "hoặc bot nói đơn hàng đã được tạo thành công",

  cleanupAfter: false, // giữ session để xem kết quả trong DB
};

export default scenario;
