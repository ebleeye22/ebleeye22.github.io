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
const aboutMessage = `欢迎来到阳光奶牛的录音库，这里有一些田野录音。
Welcome to SunshineCow's Soundscape Library, here you'll find a selection of recordings.
希望这些录音能带来一段平静的时光，希望你能喜欢 ♥
We hope these recordings bring you a moment of peace, enjoy! ♥`;
const contactMessage = `在录音和网站开发领域我都是一个业余者，如果收到改进意见我会很高兴。
In the fields of both audio recording and website development, We're amateur, we’d be happy to receive suggestions for improvement.
Xiaohongshu: 1521947519
Email: ebleeye33@qq.com`;
let popupMessage = aboutMessage;
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
  aboutButton?.setAttribute(
    "aria-expanded",
    String(shouldOpen && message === aboutMessage),
  );
  contactButton?.setAttribute(
    "aria-expanded",
    String(shouldOpen && message === contactMessage),
  );
  aboutPopup.setAttribute("aria-hidden", String(!shouldOpen));
  aboutPopup.setAttribute("aria-busy", "false");

  if (!shouldOpen) return;
  if (!wasOpen) {
    aboutPopup.textContent = message;
    return;
  }

  aboutPopup.setAttribute("aria-busy", "true");
  let oldText = aboutPopup.textContent;
  let typedLength = 0;

  function renderMessage() {
    aboutPopup.textContent = oldText + (oldText ? "\n" : "") + message.slice(0, typedLength);
  }

  function deleteOldCharacter() {
    if (version !== typingVersion) return;
    oldText = oldText.slice(0, -1);
    renderMessage();
    if (!oldText.length) {
      aboutPopup.setAttribute("aria-busy", "false");
      return;
    }
    const delay = /\p{Script=Han}/u.test(oldText.slice(-1)) ? 60 : 30;
    typingTimer = setTimeout(deleteOldCharacter, delay);
  }

  function typeNextCharacter() {
    if (version !== typingVersion) return;
    typedLength += 1;
    renderMessage();
    if (typedLength === message.length) {
      const delay = /\p{Script=Han}/u.test(oldText.slice(-1)) ? 60 : 30;
      typingTimer = setTimeout(deleteOldCharacter, delay);
      return;
    }
    const delay = /\p{Script=Han}/u.test(message.charAt(typedLength)) ? 60 : 30;
    typingTimer = setTimeout(typeNextCharacter, delay);
  }
  typeNextCharacter();
}

aboutButton?.addEventListener("click", () => selectPopupMessage(aboutMessage));
contactButton?.addEventListener("click", () =>
  selectPopupMessage(contactMessage),
);

// 监听添加轨道按钮的点击事件，切换右侧播放区域的显示状态
const addTrackBtn = document.querySelector(".add-track-button");
const playBoxRight = document.querySelector(".track-card__secondary");
const addTrackHint = document.querySelector(".add-track-hint");

if (addTrackBtn) {
  addTrackBtn.addEventListener("click", (event) => {
    // 鼠标点击后释放焦点，避免随后按空格时显示按钮的键盘焦点轮廓。
    // 键盘激活的 detail 为 0，保留焦点以支持 Tab / Enter 操作。
    if (event.detail > 0) addTrackBtn.blur();
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
  panel.style.setProperty(
    "--volume-center",
    `${footerRect.left + footerRect.width / 2}px`,
  );
  const squareRect = square.getBoundingClientRect();
  const buttons = controls.querySelectorAll(".control-button");
  const first = buttons[0]?.getBoundingClientRect();
  const last = buttons[buttons.length - 1]?.getBoundingClientRect();
  const gap = Math.max(0, footerRect.top - squareRect.bottom) / 10;
  panel.style.setProperty(
    "--volume-bottom",
    `${window.innerHeight - footerRect.top - 10}px`,
  );
  panel.style.setProperty("--volume-gap", `${gap}px`);
  if (first && last)
    panel.style.setProperty("--volume-width", `${last.right - first.left}px`);
}

const volumeLayoutObserver = new ResizeObserver(updateVolumeLayout);
[
  document.querySelector(".left-footer"),
  document.querySelector("section:first-child .square"),
]
  .filter(Boolean)
  .forEach((element) => volumeLayoutObserver.observe(element));
window.addEventListener("resize", updateVolumeLayout);
updateVolumeLayout();

function updateVolumeFill(volume) {
  const fill = `${Math.max(0, Math.min(1, volume)) * 100}%`;
  volumeSlider?.style.setProperty("--volume-fill", fill);
  // The SVG viewBox is -960..0, but the painted shape spans -831..-131.
  // Map the volume to that painted range rather than the surrounding whitespace.
  const level = Math.max(0, Math.min(1, volume));
  const maskFill = `${((131 + level * 700) / 960) * 100}%`;
  document
    .querySelectorAll(".volume-svg-mask, .control-svg-mask")
    .forEach((mask) => {
      mask.style.setProperty("--volume-fill", maskFill);
    });
}
updateVolumeFill(Number(volumeSlider?.value ?? 0.75));
const volumeFigure = document.querySelector(".control-figure-volume");
const volumeMask = volumeFigure?.querySelector(".volume-svg-mask");
let volumeDrag = null;

volumeFigure?.addEventListener("pointerdown", (event) => {
  if (
    !volumeSlider ||
    event.target !== volumeMask ||
    event.button !== 0 ||
    volumeDrag
  )
    return;
  event.preventDefault();
  volumeDrag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startVolume: Number(volumeSlider.value),
    height: Math.max(
      1,
      (volumeMask.getBoundingClientRect().height * 700) / 960,
    ),
  };
  volumeFigure.setPointerCapture(event.pointerId);
  volumeFigure.classList.add("is-dragging");
});

volumeFigure?.addEventListener("pointermove", (event) => {
  if (!volumeDrag || event.pointerId !== volumeDrag.pointerId) return;
  const next =
    volumeDrag.startVolume +
    (volumeDrag.startY - event.clientY) / volumeDrag.height;
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
  const gap =
    Math.max(0, rect.top - square.getBoundingClientRect().bottom) / 10;
  panel.style.setProperty("--pan-center", `${rect.left + rect.width / 2}px`);
  panel.style.setProperty(
    "--pan-bottom",
    `${window.innerHeight - rect.top - 10}px`,
  );
  panel.style.setProperty("--pan-gap", `${gap}px`);
}
const panLayoutObserver = new ResizeObserver(updatePanLayout);
[
  document.querySelector(".right-footer"),
  document.querySelector(".track-card__secondary .square"),
]
  .filter(Boolean)
  .forEach((element) => panLayoutObserver.observe(element));
window.addEventListener("resize", updatePanLayout);
playBoxRight?.addEventListener("transitionend", updatePanLayout);
updatePanLayout();

const panSlider = document.getElementById("pan");
function updatePanFill() {
  panSlider?.style.setProperty(
    "--volume-fill",
    `${Number(panSlider.value) * 100}%`,
  );
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
    const otherLabels = document.querySelectorAll(
      selector === ".volume-readout" ? ".channel-readout" : ".volume-readout",
    );
    otherLabels.forEach((label) => label.classList.remove("is-visible"));
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

// 闲置三十秒后缓慢隐藏播放阴影，任何操作都会恢复显示。
let playShadowIdleTimer;
const activeShadowPointers = new Set();
function resetPlayShadowIdle() {
  clearTimeout(playShadowIdleTimer);
  document.documentElement.classList.remove("is-idle");
  if (activeShadowPointers.size) return;
  playShadowIdleTimer = setTimeout(() => {
    document.documentElement.classList.add("is-idle");
  }, 30000);
}
for (const event of ["pointermove", "keydown", "wheel", "input", "scroll"]) {
  window.addEventListener(event, resetPlayShadowIdle, {
    passive: true,
    capture: true,
  });
}
window.addEventListener(
  "pointerdown",
  (event) => {
    activeShadowPointers.add(event.pointerId);
    resetPlayShadowIdle();
  },
  { passive: true },
);
for (const event of ["pointerup", "pointercancel"]) {
  window.addEventListener(
    event,
    (event) => {
      activeShadowPointers.delete(event.pointerId);
      resetPlayShadowIdle();
    },
    { passive: true },
  );
}
window.addEventListener("blur", () => {
  activeShadowPointers.clear();
  resetPlayShadowIdle();
});
window.addEventListener("focus", resetPlayShadowIdle);
resetPlayShadowIdle();

// Scroll each caption only when its text exceeds the available width.
function refreshSceneCaption(label) {
  const text = label.firstElementChild;
  if (!text) return;
  const overflow = Math.max(0, text.scrollWidth - label.clientWidth);
  label.style.setProperty("--caption-start", `${label.clientWidth}px`);
  label.style.setProperty("--caption-end", `${-text.scrollWidth}px`);
  label.style.setProperty(
    "--caption-duration",
    `${(label.clientWidth + text.scrollWidth) / 25}s`,
  );
  label.classList.toggle("is-scrolling", overflow > 1);
}

function setSceneCaption(label, value) {
  const text = document.createElement("span");
  text.className = "scene-caption__text";
  text.textContent = value;
  label.classList.remove("is-scrolling");
  label.replaceChildren(text);
  label.title = value;
  refreshSceneCaption(label);
}

const sceneCaptionLabels = document.querySelectorAll(".scene-caption > span");
const sceneCaptionResizeObserver = new ResizeObserver((entries) => {
  entries.forEach(({ target }) => refreshSceneCaption(target));
});
sceneCaptionLabels.forEach((label) => {
  setSceneCaption(label, label.textContent);
  sceneCaptionResizeObserver.observe(label);
});
document.fonts.ready.then(() =>
  sceneCaptionLabels.forEach(refreshSceneCaption),
);
