/* ==========================================================================
   FILE: js/den-keo-quan.js
   MÔ TẢ: Điều khiển Đèn kéo quân 3D (6 mặt Bài 17-22):
          - Tính bán kính lục giác đều theo công thức radius = width / (2 * tan(30deg))
          - Tự động quay tròn liên tục bằng requestAnimationFrame()
          - Rê chuột vào mặt đèn (mouseenter) -> tạm dừng ngay tại góc hiện tại
          - Rê chuột ra khỏi mặt đèn (mouseleave) -> quay tiếp từ đúng góc đã dừng
          - Tự động cập nhật kích thước khi thay đổi màn hình (resize)
   SINH VIÊN: Trần Thanh Phát - MSSV: 241A010063 - Đại học Văn Hiến
   ========================================================================== */

// Hàm xử lý khi ảnh mặt đèn hoặc ảnh bài tập chưa có trong thư mục img/
function handleFaceImageError(imgElement, titleText, filePath) {
    const parent = imgElement.parentElement;
    if (!parent) return;

    const fallback = document.createElement("div");
    fallback.className = "img-fallback-box";
    fallback.innerHTML =
        "<strong>" + titleText + "</strong>" +
        "<span>Chưa tìm thấy file: " + filePath + "</span>";

    parent.innerHTML = "";
    parent.appendChild(fallback);
}

// Chức năng chuyển đổi Dark Mode dùng chung toàn website
function initThemeToggle() {
    const toggleBtn = document.getElementById("themeToggleBtn");
    if (!toggleBtn) return;

    const savedTheme = localStorage.getItem("vhu_bt24_theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleBtn.textContent = "☀️ Sáng";
    }

    toggleBtn.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("vhu_bt24_theme", isDark ? "dark" : "light");
        toggleBtn.textContent = isDark ? "☀️ Sáng" : "🌙 Tối";
    });
}

// Khởi tạo Đèn kéo quân 3D (chỉ chạy trên trang den-keo-quan.html)
function initLantern3D() {
    const carousel = document.getElementById("lanternCarousel");
    const faces = document.querySelectorAll(".lantern-face");
    const statusBadge = document.getElementById("lanternStatusBadge");
    const angleText = document.getElementById("lanternAngleText");

    // Nếu không phải trang Đèn kéo quân thì chỉ chạy Dark Mode
    if (!carousel || faces.length === 0) return;

    // Các biến quản lý trạng thái quay của đèn
    let isPaused = false;          // Trạng thái tạm dừng hay đang quay
    let currentAngle = 0;          // Góc quay hiện tại (đơn vị: độ)
    const rotationSpeed = 25;      // Tốc độ quay: 25 độ/giây (nằm trong khoảng 20-30 độ/giây)
    let lastTimestamp = null;      // Mốc thời gian frame trước của requestAnimationFrame
    let currentRadius = 242.49;    // Bán kính từ tâm đèn đến mỗi mặt

    // Hàm tính bán kính lục giác đều và đặt vị trí 3D cho từng mặt đèn
    function updateLanternGeometry() {
        // Lấy chiều rộng thực tế của một mặt đèn (đã đáp ứng responsive qua CSS Variable)
        const faceWidth = faces[0].offsetWidth || 280;

        // Công thức bắt buộc: radius = width / (2 * tan(30deg))
        const thirtyDegInRad = (30 * Math.PI) / 180;
        currentRadius = faceWidth / (2 * Math.tan(thirtyDegInRad));

        // Cập nhật biến CSS --face-radius
        document.documentElement.style.setProperty("--face-radius", currentRadius.toFixed(2) + "px");

        // Bố trí 6 mặt xung quanh trục đứng, mỗi mặt cách nhau 60 độ (0, 60, 120, 180, 240, 300)
        faces.forEach(function (face, index) {
            const faceAngle = Number(face.getAttribute("data-angle")) || index * 60;
            const extraZ = face.classList.contains("is-hovered") ? 14 : 0;
            face.style.transform =
                "rotateY(" + faceAngle + "deg) translateZ(" + (currentRadius + extraZ).toFixed(2) + "px)";
        });
    }

    // Hàm cập nhật hiển thị trạng thái trên giao diện
    function updateStatusDisplay(hoveredTitle) {
        if (statusBadge) {
            if (isPaused) {
                statusBadge.textContent = hoveredTitle
                    ? "Đang tạm dừng tại: " + hoveredTitle
                    : "Đang tạm dừng";
                statusBadge.classList.add("paused");
            } else {
                statusBadge.textContent = "Đang quay tự động (25°/giây)";
                statusBadge.classList.remove("paused");
            }
        }
        if (angleText) {
            const normalizedAngle = ((Math.round(currentAngle) % 360) + 360) % 360;
            angleText.textContent = normalizedAngle + "°";
        }
    }

    // Gắn sự kiện mouseenter và mouseleave vào từng mặt đèn trong 6 mặt
    faces.forEach(function (face) {
        const title = face.getAttribute("data-title") || "Mặt đèn";

        // Khi đưa chuột vào một mặt bất kỳ -> tạm dừng ngay tại vị trí hiện tại
        face.addEventListener("mouseenter", function () {
            isPaused = true;
            face.classList.add("is-hovered");
            updateLanternGeometry();
            updateStatusDisplay(title);
        });

        // Khi rê chuột ra khỏi mặt đó -> tiếp tục quay từ đúng góc đã dừng
        face.addEventListener("mouseleave", function () {
            isPaused = false;
            face.classList.remove("is-hovered");
            // Đặt lại lastTimestamp = null để frame kế tiếp không bị nhảy góc
            lastTimestamp = null;
            updateLanternGeometry();
            updateStatusDisplay(null);
        });
    });

    // Vòng lặp hoạt hình mượt mà bằng requestAnimationFrame()
    function animateLantern(timestamp) {
        if (!isPaused) {
            if (lastTimestamp !== null) {
                // Tính khoảng thời gian trôi qua (giây), giới hạn tối đa 0.1s để tránh giật khi chuyển tab
                const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
                currentAngle = (currentAngle + rotationSpeed * deltaSeconds) % 360;
                carousel.style.transform = "rotateY(" + currentAngle.toFixed(3) + "deg)";
            }
            lastTimestamp = timestamp;
            updateStatusDisplay(null);
        } else {
            // Khi đang tạm dừng, giữ nguyên currentAngle và không tích lũy thời gian
            lastTimestamp = null;
        }

        requestAnimationFrame(animateLantern);
    }

    // Tính toán kích thước ban đầu và lắng nghe sự kiện resize màn hình
    updateLanternGeometry();
    window.addEventListener("resize", updateLanternGeometry);

    // Bắt đầu quay đèn vô hạn
    requestAnimationFrame(animateLantern);
}

// Chạy khởi tạo sau khi DOM tải xong
document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initLantern3D();
});
