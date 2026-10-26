// 在页面渲染前立即执行，避免闪烁
(function setRandomSceneColor() {
  // 1. 随机色相（0 到 360 度）
  const randomHue = Math.floor(Math.random() * 360);

  // 2. 保持饱和度 80% 和亮度 55%，确保颜色明亮饱满
  const randomColor = `hsl(${randomHue}, 80%, 55%)`;

  // 3. 将生成的随机色赋给根节点的 CSS 变量 --scene-color
  document.documentElement.style.setProperty("--scene-color", randomColor);
})();

const aboutButton = document.querySelector(".about-link");
const contactButton = document.querySelector(".contact-link");
const aboutPopup = document.querySelector(".bottom-popup");
let popupMessage = "Hello World!";
let typingTimer;
let typingVersion = 0;

function selectPopupMessage(message) {
  if (!aboutPopup) return;
  const wasOpen = aboutPopup.classList.contains("is-open");
  const shouldOpen = !wasOpen || popupMessage !== message;
  clearTimeout(typingTimer);
  const version = ++typingVersion;
  popupMessage = message;
  aboutPopup.classList.toggle("is-open", shouldOpen);
  aboutButton?.setAttribute("aria-expanded", String(shouldOpen && message === "Hello World!"));
  contactButton?.setAttribute("aria-expanded", String(shouldOpen && message === "Contact Me!"));
  aboutPopup.setAttribute("aria-hidden", String(!shouldOpen));
  aboutPopup.setAttribute("aria-busy", "false");

  if (!shouldOpen) return;
  if (!wasOpen) {
    aboutPopup.textContent = message;
    return;
  }

  aboutPopup.setAttribute("aria-busy", "true");
  let deleting = true;
  function typeNextCharacter() {
    if (version !== typingVersion) return;
    const current = aboutPopup.textContent;
    if (deleting && current.length) {
      aboutPopup.textContent = current.slice(0, -1);
    } else {
      deleting = false;
      aboutPopup.textContent = message.slice(0, current.length + 1);
      if (aboutPopup.textContent === message) {
        aboutPopup.setAttribute("aria-busy", "false");
        return;
      }
    }
    typingTimer = setTimeout(typeNextCharacter, deleting ? 110 : 180);
  }
  typeNextCharacter();
}

aboutButton?.addEventListener("click", () => selectPopupMessage("Hello World!"));
contactButton?.addEventListener("click", () => selectPopupMessage("Contact Me!"));

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

const volumeSlider = document.getElementById("volume");
volumeSlider?.addEventListener("input", () => {
  const volume = Number(volumeSlider.value);
  updateVolumeFill(volume);
  if (typeof setOutputVolume === "function") {
    setOutputVolume(volume);
  }
  document.querySelectorAll("audio, video").forEach((media) => {
    media.volume = volume;
  });
});

function updateVolumeLayout() {
  const footer = document.querySelector(".left-footer");
  const square = document.querySelector("section:first-child .square");
  const controls = footer?.querySelector(".controls");
  const panel = document.querySelector(".volume-panel");
  if (!footer || !square || !controls || !panel) return;
  const footerRect = footer.getBoundingClientRect();
  // 使用左栏页脚的视口中心，双栏过渡时由 ResizeObserver 持续同步。
  panel.style.setProperty("--volume-center", `${footerRect.left + footerRect.width / 2}px`);
  const squareRect = square.getBoundingClientRect();
  const buttons = controls.querySelectorAll(".control-button");
  const first = buttons[0]?.getBoundingClientRect();
  const last = buttons[buttons.length - 1]?.getBoundingClientRect();
  const gap = Math.max(0, footerRect.top - squareRect.bottom) / 10;
  panel.style.setProperty("--volume-bottom", `${window.innerHeight - footerRect.top - 10}px`);
  panel.style.setProperty("--volume-gap", `${gap}px`);
  if (first && last) panel.style.setProperty("--volume-width", `${last.right - first.left}px`);
}

const volumeLayoutObserver = new ResizeObserver(updateVolumeLayout);
[document.querySelector(".left-footer"), document.querySelector("section:first-child .square")]
  .filter(Boolean).forEach((element) => volumeLayoutObserver.observe(element));
window.addEventListener("resize", updateVolumeLayout);
updateVolumeLayout();

function updateVolumeFill(volume) {
  const fill = `${Math.max(0, Math.min(1, volume)) * 100}%`;
  volumeSlider?.style.setProperty("--volume-fill", fill);
  // The SVG viewBox is -960..0, but the painted shape spans -831..-131.
  // Map the volume to that painted range rather than the surrounding whitespace.
  const level = Math.max(0, Math.min(1, volume));
  const maskFill = `${((131 + level * 700) / 960) * 100}%`;
  document.querySelectorAll(".volume-svg-mask, .control-svg-mask").forEach((mask) => {
    mask.style.setProperty("--volume-fill", maskFill);
  });
}
updateVolumeFill(Number(volumeSlider?.value ?? 0.5));
const volumeFigure = document.querySelector(".control-figure-volume");
const volumeMask = volumeFigure?.querySelector(".volume-svg-mask");
let volumeDrag = null;

volumeFigure?.addEventListener("pointerdown", (event) => {
  if (!volumeSlider || event.target !== volumeMask || event.button !== 0 || volumeDrag) return;
  event.preventDefault();
  volumeDrag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startVolume: Number(volumeSlider.value),
    height: Math.max(1, volumeMask.getBoundingClientRect().height * 700 / 960),
  };
  volumeFigure.setPointerCapture(event.pointerId);
  volumeFigure.classList.add("is-dragging");
});

volumeFigure?.addEventListener("pointermove", (event) => {
  if (!volumeDrag || event.pointerId !== volumeDrag.pointerId) return;
  const next = volumeDrag.startVolume + (volumeDrag.startY - event.clientY) / volumeDrag.height;
  volumeSlider.value = String(Math.max(0, Math.min(1, next)));
  volumeSlider.dispatchEvent(new Event("input", { bubbles: true }));
});

function finishVolumeDrag(event) {
  if (!volumeDrag || event.pointerId !== volumeDrag.pointerId) return;
  volumeDrag = null;
  volumeFigure.classList.remove("is-dragging");
  if (volumeFigure.hasPointerCapture(event.pointerId)) {
    volumeFigure.releasePointerCapture(event.pointerId);
  }
}
volumeFigure?.addEventListener("pointerup", finishVolumeDrag);
volumeFigure?.addEventListener("pointercancel", finishVolumeDrag);
volumeFigure?.addEventListener("lostpointercapture", finishVolumeDrag);

// 将 PAN 面板定位到右栏中心，随双栏动画同步更新。
function updatePanLayout() {
  const footer = document.querySelector(".right-footer");
  const square = document.querySelector(".track-card__secondary .square");
  const panel = document.querySelector(".pan-panel");
  if (!footer || !square || !panel) return;
  const rect = footer.getBoundingClientRect();
  const gap = Math.max(0, rect.top - square.getBoundingClientRect().bottom) / 10;
  panel.style.setProperty("--pan-center", `${rect.left + rect.width / 2}px`);
  panel.style.setProperty("--pan-bottom", `${window.innerHeight - rect.top - 10}px`);
  panel.style.setProperty("--pan-gap", `${gap}px`);
}
const panLayoutObserver = new ResizeObserver(updatePanLayout);
[document.querySelector(".right-footer"), document.querySelector(".track-card__secondary .square")]
  .filter(Boolean).forEach((element) => panLayoutObserver.observe(element));
window.addEventListener("resize", updatePanLayout);
playBoxRight?.addEventListener("transitionend", updatePanLayout);
updatePanLayout();

const panSlider = document.getElementById("pan");
function updatePanFill() {
  panSlider?.style.setProperty("--volume-fill", `${Number(panSlider.value) * 100}%`);
}
panSlider?.addEventListener("input", updatePanFill);
updatePanFill();

// 调节时显示数据，停止操作两秒后淡出；按住拖动期间保持显示。
function bindReadoutFeedback(controls, selector) {
  const labels = document.querySelectorAll(selector);
  const pointers = new Set();
  let hideTimer;
  function show() {
    clearTimeout(hideTimer);
    labels.forEach((label) => label.classList.add("is-visible"));
  }
  function hideLater() {
    clearTimeout(hideTimer);
    if (pointers.size) return;
    hideTimer = setTimeout(() => {
      labels.forEach((label) => label.classList.remove("is-visible"));
    }, 2000);
  }
  controls.filter(Boolean).forEach((control) => {
    control.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pointers.add(event.pointerId);
      show();
    });
    control.addEventListener("input", () => {
      show();
      hideLater();
    });
  });
  function release(event) {
    if (!pointers.delete(event.pointerId)) return;
    hideLater();
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", () => {
    pointers.clear();
    hideLater();
  });
}

bindReadoutFeedback([volumeSlider, volumeMask], ".volume-readout");
bindReadoutFeedback([panSlider], ".channel-readout");
