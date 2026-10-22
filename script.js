// 在页面渲染前立即执行，避免闪烁
(function setRandomSceneColor() {
  // 1. 随机色相（0 到 360 度）
  const randomHue = Math.floor(Math.random() * 360);

  // 2. 保持饱和度 80% 和亮度 55%，确保颜色明亮饱满
  const randomColor = `hsl(${randomHue}, 80%, 55%)`;

  // 3. 将生成的随机色赋给根节点的 CSS 变量 --scene-color
  document.documentElement.style.setProperty("--scene-color", randomColor);
})();

// 监听添加轨道按钮的点击事件，切换右侧播放区域的显示状态
const addTrackBtn = document.querySelector(".add-track-button");
const playBoxRight = document.querySelector(".track-card__secondary");
const addTrackHint = document.querySelector(".add-track-hint");

if (addTrackBtn) {
  addTrackBtn.addEventListener("click", () => {
    // 展开或收起时立即隐藏并禁用控件，等待展开完成后再启用。
    playBoxRight?.classList.remove("controls-ready");
    playBoxRight?.classList.toggle("active");
    addTrackHint?.classList.add("dismissed");
  });
}

// 监听实际的 CSS 过渡结束事件，避免用固定计时器猜测展开时间。
playBoxRight?.addEventListener("transitionend", (event) => {
  // 只处理第二栏自身的移动，忽略子元素和其他属性的过渡。
  if (event.target === playBoxRight && event.propertyName === "margin-right") {
    // 第二个参数为 true 时添加类，为 false 时移除；收起结束后仍保持禁用。
    playBoxRight.classList.toggle(
      "controls-ready",
      playBoxRight.classList.contains("active"),
    );
  }
});
