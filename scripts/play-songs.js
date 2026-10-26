// 初始化全局音频播放实例
const audioPlayer = new Audio();
const audioContext =
  window.AudioContext || window.webkitAudioContext
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;
const masterGain = audioContext ? audioContext.createGain() : null;
const fadeGain = audioContext ? audioContext.createGain() : null;
const fadeDuration = 2;
const primaryBalance = createTrackBalance(fadeGain);

// 分别控制原始左右声道的增益；单声道输入先扩展为双声道。
function createTrackBalance(input) {
  if (!audioContext || !input) return null;
  const stereoInput = audioContext.createGain();
  stereoInput.channelCount = 2;
  stereoInput.channelCountMode = "explicit";
  stereoInput.channelInterpretation = "speakers";
  const splitter = audioContext.createChannelSplitter(2);
  const left = audioContext.createGain();
  const right = audioContext.createGain();
  const merger = audioContext.createChannelMerger(2);
  input.connect(stereoInput);
  stereoInput.connect(splitter);
  splitter.connect(left, 0);
  splitter.connect(right, 1);
  left.connect(merger, 0, 0);
  right.connect(merger, 0, 1);
  merger.connect(masterGain);
  return { left, right };
}

if (audioContext && masterGain) {
  const audioSource = audioContext.createMediaElementSource(audioPlayer);
  audioSource.connect(fadeGain);
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = 0.5;
  fadeGain.gain.value = 0;
}

// 2. 初始音量设为 50% (0.5)
audioPlayer.volume = 1;

// 左侧播放图形和播放按钮共用同一个播放入口。
const leftPlayFigure = document.querySelector(".control-figure-play");
const leftPlayButton = document.querySelector(".left-footer .play-button");
let isStartingPlayback = false;
let currentSongIndex = -1;
let primaryPlaybackIntent = false;
let primaryPlaybackVersion = 0;
const activeFades = new WeakMap();

// 音量与淡入淡出使用独立节点，拖动音量不会打断过渡。
function setOutputVolume(volume) {
  const level = Math.max(0, Math.min(1, volume));
  const readout = document.querySelector(".volume-readout");
  if (readout) readout.textContent = `V ${Math.round(level * 100)}%`;
  if (!masterGain) return;
  masterGain.gain.setTargetAtTime(
    level, audioContext.currentTime, 0.02,
  );
}
setOutputVolume(Number(document.getElementById("volume")?.value ?? 0.5));

function cancelPlaybackFade(node) {
  if (!node || !audioContext) return;
  const pending = activeFades.get(node);
  if (pending) {
    clearTimeout(pending.timer);
    pending.resolve();
    activeFades.delete(node);
  }
  const now = audioContext.currentTime;
  const gain = node.gain;
  if (typeof gain.cancelAndHoldAtTime === "function") {
    gain.cancelAndHoldAtTime(now);
  } else {
    const currentValue = gain.value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(currentValue, now);
  }
}

function fadePlaybackTo(value, node = fadeGain, duration = fadeDuration) {
  cancelPlaybackFade(node);
  const now = audioContext.currentTime;
  // 必须明确标记本次过渡的起点，避免沿用几分钟前的淡入结束时间。
  node.gain.setValueAtTime(node.gain.value, now);
  node.gain.linearRampToValueAtTime(value, now + duration);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      activeFades.delete(node);
      resolve();
    }, duration * 1000);
    activeFades.set(node, { timer, resolve });
  });
}

const sceneCoverRequests = new WeakMap();

async function transitionSceneCover(container, cover) {
  const image = new Image();
  image.className = "scene-cover";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  sceneCoverRequests.set(container, image);
  const loaded = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = cover;

  if (!await loaded || sceneCoverRequests.get(container) !== image) return;
  // 保留原封面，新封面从左侧滑入并覆盖它。
  container.append(image);
  image.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform" || sceneCoverRequests.get(container) !== image) return;
    container.querySelectorAll(".scene-cover").forEach((previous) => {
      if (previous !== image) previous.remove();
    });
  });
  image.getBoundingClientRect();
  requestAnimationFrame(() => {
    if (sceneCoverRequests.get(container) === image) image.classList.add("is-visible");
  });
}

function selectSong(index, updateSource = true) {
  currentSongIndex = index;
  const song = songs[index];
  audioPlayer.dispatchEvent(new CustomEvent("trackchange", { detail: song.audioFile }));
  if (updateSource) audioPlayer.src = song.audioFile;
  document.documentElement.style.setProperty("--scene-color", song.rgb);

  const leftSection = leftPlayButton.closest("section");
  const captions = leftSection.querySelectorAll(".scene-caption span");
  captions[0].textContent = song.time;
  captions[1].textContent = song.location;

  const sceneImage = leftSection.querySelector(".scene-image");
  transitionSceneCover(sceneImage, song.cover);
}

async function changePlayback(forceNext = false) {
  if ((forceNext || audioPlayer.paused) && !songs.length) return;
  const wasPlaying = isStartingPlayback ? primaryPlaybackIntent :
    !audioPlayer.paused && !audioPlayer.ended;
  const needsSong = (forceNext || !wasPlaying) && (forceNext || currentSongIndex < 0);
  const rightPlaying = !secondaryAudioPlayer.paused && !secondaryAudioPlayer.ended;
  const rightStarting = secondaryPlaybackPending && secondaryPlaybackIntent;
  const candidates = needsSong ? songs
    .map((song, index) => ({ song, index }))
    .filter(({ song, index }) =>
      (songs.length === 1 || index !== currentSongIndex) &&
      (!rightPlaying || song.audioFile !== secondaryAudioPlayer.getAttribute("src")) &&
      (!rightStarting || song.audioFile !== songs[secondarySongIndex]?.audioFile)) : [];
  // 没有符合条件的歌曲时，保留当前播放及过渡。
  if (needsSong && !candidates.length) return;
  const version = ++primaryPlaybackVersion;
  cancelPlaybackFade(fadeGain);
  isStartingPlayback = true;

  try {
    if (!audioContext) throw new Error("此浏览器不支持 Web Audio API");
    primaryPlaybackIntent = forceNext || !wasPlaying;
    let nextIndex = null;
    if (primaryPlaybackIntent && (forceNext || currentSongIndex < 0)) {
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)].index;
      // 先更新界面，旧歌曲淡出完成后再替换音源。
      selectSong(nextIndex, false);
    }
    updatePlaybackIcons();
    // 在用户点击后恢复 AudioContext，满足浏览器的自动播放限制。
    await audioContext.resume();
    if (version !== primaryPlaybackVersion) return;
    if (!primaryPlaybackIntent) {
      await fadePlaybackTo(0);
      if (version !== primaryPlaybackVersion) return;
      audioPlayer.pause();
      return;
    }
    const targetSource = songs[currentSongIndex].audioFile;
    if (audioPlayer.getAttribute("src") !== targetSource) {
      if (!audioPlayer.paused) {
        await fadePlaybackTo(0);
        if (version !== primaryPlaybackVersion) return;
        audioPlayer.pause();
      }
      audioPlayer.src = targetSource;
      fadeGain.gain.setValueAtTime(0, audioContext.currentTime);
    }
    if (audioPlayer.ended) audioPlayer.currentTime = 0;
    await audioPlayer.play();
    if (version !== primaryPlaybackVersion) return;
    await fadePlaybackTo(1);
  } catch (error) {
    if (version === primaryPlaybackVersion) console.error("歌曲播放失败：", error);
  } finally {
    if (version === primaryPlaybackVersion) {
      isStartingPlayback = false;
      updatePlaybackIcons();
    }
  }
}

function togglePlayback() {
  return changePlayback();
}

leftPlayFigure?.addEventListener("click", togglePlayback);
leftPlayButton?.addEventListener("click", togglePlayback);

function playNextSong() {
  return changePlayback(true);
}

document.querySelector(".control-figure-next")?.addEventListener("click", playNextSong);
document.querySelector(".left-footer .next-button")?.addEventListener("click", playNextSong);
audioPlayer.addEventListener("ended", playNextSong);

// 图形与阴影同步切换，避免暂停图形仍叠着播放三角形的阴影。
function updatePlaybackIcons() {
  const playing = isStartingPlayback ? primaryPlaybackIntent :
    !audioPlayer.paused && !audioPlayer.ended && !audioPlayer.error;
  const figurePath = playing
    ? "M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z"
    : "M320-200v-560l440 280-440 280Z";
  leftPlayFigure?.closest(".scene-image")
    .querySelectorAll(".control-figure-play path, .shadow-icon-play path")
    .forEach((path) => path.setAttribute("d", figurePath));
  leftPlayButton?.querySelector("path")?.setAttribute(
    "d",
    playing ? "M6 5h4v14H6ZM14 5h4v14h-4Z" : "m8 5 12 7-12 7V5Z",
  );
  leftPlayButton?.setAttribute("aria-label", playing ? "暂停" : "播放");
}

for (const eventName of ["play", "pause", "ended", "error"]) {
  audioPlayer.addEventListener(eventName, updatePlaybackIcons);
}
updatePlaybackIcons();

// 右侧轨道共享 AudioContext 和总音量，使用独立的播放器和淡入淡出节点。
const secondaryAudioPlayer = new Audio();
const secondaryFadeGain = audioContext ? audioContext.createGain() : null;
const secondaryBalance = createTrackBalance(secondaryFadeGain);
const secondarySection = document.querySelector(".track-card__secondary");
const secondaryPlayFigure = secondarySection?.querySelector(".control-figure-play-secondary");
const secondaryPlayButton = secondarySection?.querySelector(".play-button");
let secondarySongIndex = -1;
let secondaryPlaybackPending = false;
let secondaryPlaybackVersion = 0;
let secondaryPlaybackIntent = false;

if (audioContext && secondaryFadeGain) {
  const source = audioContext.createMediaElementSource(secondaryAudioPlayer);
  source.connect(secondaryFadeGain);
  secondaryFadeGain.gain.value = 0;
}

function getSecondaryCandidates(forceNext = false) {
  const leftAudioFile = songs[currentSongIndex]?.audioFile;
  const currentAudioFile = songs[secondarySongIndex]?.audioFile;
  return songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => song.audioFile !== leftAudioFile &&
      (!forceNext || song.audioFile !== currentAudioFile));
}

function selectSecondarySong(forceNext = false, updateSource = true) {
  const candidates = getSecondaryCandidates(forceNext);
  if (!candidates.length) return false;

  const { song, index } = candidates[Math.floor(Math.random() * candidates.length)];
  secondarySongIndex = index;
  secondaryAudioPlayer.dispatchEvent(new CustomEvent("trackchange", { detail: song.audioFile }));
  if (updateSource) secondaryAudioPlayer.src = song.audioFile;
  document.documentElement.style.setProperty("--scene-color", song.rgb);
  const captions = secondarySection.querySelectorAll(".scene-caption span");
  captions[0].textContent = song.time;
  captions[1].textContent = song.location;
  const image = secondarySection.querySelector(".scene-image");
  transitionSceneCover(image, song.cover);
  return true;
}

async function changeSecondaryPlayback(forceNext = false) {
  if (!secondarySection?.classList.contains("active")) return;
  if (forceNext && !getSecondaryCandidates(true).length) return;
  const wasPlaying = secondaryPlaybackPending ? secondaryPlaybackIntent :
    !secondaryAudioPlayer.paused && !secondaryAudioPlayer.ended;
  secondaryPlaybackPending = true;
  const version = ++secondaryPlaybackVersion;
  cancelPlaybackFade(secondaryFadeGain);
  try {
    if (!audioContext) throw new Error("此浏览器不支持 Web Audio API");
    secondaryPlaybackIntent = forceNext || !wasPlaying;
    if (secondaryPlaybackIntent && (forceNext || secondarySongIndex < 0 ||
        songs[secondarySongIndex]?.audioFile === songs[currentSongIndex]?.audioFile)) {
      if (!selectSecondarySong(forceNext, false)) return;
    }
    updateSecondaryPlaybackIcons();
    await audioContext.resume();
    if (version !== secondaryPlaybackVersion) return;
    if (!secondaryPlaybackIntent) {
      await fadePlaybackTo(0, secondaryFadeGain);
      if (version !== secondaryPlaybackVersion) return;
      secondaryAudioPlayer.pause();
      return;
    }
    const targetSource = songs[secondarySongIndex].audioFile;
    if (secondaryAudioPlayer.getAttribute("src") !== targetSource) {
      if (!secondaryAudioPlayer.paused) {
        await fadePlaybackTo(0, secondaryFadeGain);
        if (version !== secondaryPlaybackVersion) return;
        secondaryAudioPlayer.pause();
      }
      secondaryAudioPlayer.src = targetSource;
      secondaryFadeGain.gain.setValueAtTime(0, audioContext.currentTime);
    }
    if (secondaryAudioPlayer.ended) secondaryAudioPlayer.currentTime = 0;
    await secondaryAudioPlayer.play();
    if (version !== secondaryPlaybackVersion) return;
    await fadePlaybackTo(1, secondaryFadeGain);
  } catch (error) {
    if (version === secondaryPlaybackVersion) console.error("右侧歌曲播放失败：", error);
  } finally {
    if (version === secondaryPlaybackVersion) {
      secondaryPlaybackPending = false;
      updateSecondaryPlaybackIcons();
    }
  }
}

function toggleSecondaryPlayback() {
  return changeSecondaryPlayback();
}

secondarySection?.querySelector(".next-button")?.addEventListener("click", () => {
  changeSecondaryPlayback(true);
});
secondaryAudioPlayer.addEventListener("ended", () => {
  changeSecondaryPlayback(true);
});

async function pauseSecondaryOnClose() {
  // 使尚未完成的播放请求失效，避免关闭时重新淡入。
  const version = ++secondaryPlaybackVersion;
  cancelPlaybackFade(secondaryFadeGain);
  secondaryPlaybackPending = true;
  secondaryPlaybackIntent = false;
  updateSecondaryPlaybackIcons();
  try {
    if (audioContext && !secondaryAudioPlayer.paused) {
      await fadePlaybackTo(0, secondaryFadeGain);
    }
    if (version !== secondaryPlaybackVersion) return;
    secondaryAudioPlayer.pause();
  } finally {
    if (version === secondaryPlaybackVersion) {
      secondaryPlaybackPending = false;
      updateSecondaryPlaybackIcons();
    }
  }
}

if (secondarySection) {
  let wasOpen = secondarySection.classList.contains("active");
  const secondaryVisibilityObserver = new MutationObserver(() => {
    const isOpen = secondarySection.classList.contains("active");
    if (wasOpen && !isOpen) pauseSecondaryOnClose();
    wasOpen = isOpen;
  });
  secondaryVisibilityObserver.observe(secondarySection, {
    attributes: true, attributeFilter: ["class"],
  });
}

function updateSecondaryPlaybackIcons() {
  const playing = secondaryPlaybackPending ? secondaryPlaybackIntent :
    !secondaryAudioPlayer.paused && !secondaryAudioPlayer.ended && !secondaryAudioPlayer.error;
  secondarySection?.querySelectorAll(".control-figure-play-secondary path, .shadow-icon-play path")
    .forEach((path) => path.setAttribute("d", playing
      ? "M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z"
      : "M320-200v-560l440 280-440 280Z"));
  secondaryPlayButton?.querySelector("path")?.setAttribute("d", playing
    ? "M6 5h4v14H6ZM14 5h4v14h-4Z" : "m8 5 12 7-12 7V5Z");
  secondaryPlayButton?.setAttribute("aria-label", playing ? "暂停" : "播放");
}

secondaryPlayFigure?.addEventListener("click", toggleSecondaryPlayback);
secondaryPlayButton?.addEventListener("click", toggleSecondaryPlayback);
for (const eventName of ["play", "pause", "ended", "error"]) {
  secondaryAudioPlayer.addEventListener(eventName, updateSecondaryPlaybackIcons);
}
updateSecondaryPlaybackIcons();

let balanceReadoutFrame;
const balanceRamps = new WeakMap();

function getBalanceValue(node, now) {
  const ramp = balanceRamps.get(node);
  if (!ramp) return 1;
  const progress = Math.max(0, Math.min(1, (now - ramp.startTime) / 2));
  return ramp.startValue + (ramp.targetValue - ramp.startValue) * progress;
}

function rampBalanceTo(node, targetValue, now) {
  const startValue = getBalanceValue(node, now);
  // 显式锚定当前值，避免连续取消自动化时丢失线性过渡的起点。
  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(startValue, now);
  node.gain.linearRampToValueAtTime(targetValue, now + 2);
  balanceRamps.set(node, { startValue, targetValue, startTime: now });
}

function refreshChannelReadouts(until) {
  cancelAnimationFrame(balanceReadoutFrame);
  const entries = [
    [leftPlayButton?.closest("section"), primaryBalance],
    [secondarySection, secondaryBalance],
  ];
  for (const [section, balance] of entries) {
    const label = section?.querySelector(".channel-readout");
    if (label && balance) {
      const left = Math.round(getBalanceValue(balance.left, audioContext.currentTime) * 100);
      const right = Math.round(getBalanceValue(balance.right, audioContext.currentTime) * 100);
      label.textContent = `L ${left}% · R ${right}%`;
    }
  }
  if (audioContext && audioContext.state === "running" && audioContext.currentTime < until) {
    balanceReadoutFrame = requestAnimationFrame(() => refreshChannelReadouts(until));
  }
}

function updateTrackBalance() {
  if (!primaryBalance || !secondaryBalance) return;
  const bothPlaying = !audioPlayer.paused && !audioPlayer.ended && !audioPlayer.error &&
    !secondaryAudioPlayer.paused && !secondaryAudioPlayer.ended && !secondaryAudioPlayer.error;
  const now = audioContext.currentTime;
  // 滑轨 0：50/50，0.5：75/25，1：100/0；右轨反向分配。
  const separation = Math.max(0, Math.min(1,
    Number(document.getElementById("pan")?.value ?? 0.5)));
  const dominant = 0.5 + separation * 0.5;
  const opposite = 0.5 - separation * 0.5;
  // 单轨播放仍保留原始立体声音量。
  const levels = bothPlaying ? [dominant, opposite, opposite, dominant] : [1, 1, 1, 1];
  const channels = [primaryBalance.left, primaryBalance.right,
    secondaryBalance.left, secondaryBalance.right];
  channels.forEach((node, index) => {
    rampBalanceTo(node, levels[index], now);
  });
  refreshChannelReadouts(now + 2);
}

document.getElementById("pan")?.addEventListener("input", updateTrackBalance);

for (const player of [audioPlayer, secondaryAudioPlayer]) {
  for (const eventName of ["play", "playing", "pause", "ended", "emptied", "error"]) {
    player.addEventListener(eventName, updateTrackBalance);
  }
}
updateTrackBalance();

// 根据播放进度安排结尾淡出，暂停或切歌时取消旧的定时任务。
function enableEndingFade(player, node, wantsPlayback) {
  let timer;
  let fading = false;
  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }
  function schedule() {
    clearTimer();
    if (!audioContext || player.paused || player.ended || fading || !wantsPlayback() ||
        !Number.isFinite(player.duration) || player.playbackRate <= 0) return;
    const remaining = (player.duration - player.currentTime) / player.playbackRate;
    if (remaining <= 0) return;
    if (remaining <= fadeDuration) {
      fading = true;
      // 即使进度事件略有延迟，也确保在歌曲结束时降至静音。
      fadePlaybackTo(0, node, remaining);
    } else {
      timer = setTimeout(schedule, (remaining - fadeDuration) * 1000);
    }
  }
  for (const event of ["playing", "timeupdate", "durationchange", "ratechange"]) {
    player.addEventListener(event, schedule);
  }
  for (const event of ["pause", "ended", "emptied", "error", "waiting", "seeking"]) {
    player.addEventListener(event, () => {
      clearTimer();
      fading = false;
    });
  }
  player.addEventListener("seeked", schedule);
}

enableEndingFade(audioPlayer, fadeGain, () =>
  !isStartingPlayback || primaryPlaybackIntent);
enableEndingFade(secondaryAudioPlayer, secondaryFadeGain, () =>
  !secondaryPlaybackPending || secondaryPlaybackIntent);

function bindTrackProgress(player, section) {
  const progressLine = section?.querySelector(".track-progress");
  if (!progressLine) return;
  let frame;
  let resetTimer;
  let resetting = false;
  let pendingSource;
  function refresh() {
    cancelAnimationFrame(frame);
    if (pendingSource && player.getAttribute("src") === pendingSource) pendingSource = null;
    const progress = Number.isFinite(player.duration) && player.duration > 0
      ? Math.max(0, Math.min(1, player.currentTime / player.duration)) : 0;
    if (!resetting && !pendingSource) {
      progressLine.style.setProperty("--track-progress", `${progress * 100}%`);
    }
    if (!player.paused && !player.ended) frame = requestAnimationFrame(refresh);
  }
  player.addEventListener("trackchange", (event) => {
    clearTimeout(resetTimer);
    resetting = true;
    pendingSource = event.detail;
    progressLine.classList.add("is-resetting");
    progressLine.style.setProperty("--track-progress", "0%");
    resetTimer = setTimeout(() => {
      resetting = false;
      progressLine.classList.remove("is-resetting");
      refresh();
    }, 300);
  });
  for (const event of ["play", "pause", "ended", "emptied", "loadedmetadata",
    "durationchange", "timeupdate", "seeking", "seeked"]) {
    player.addEventListener(event, refresh);
  }
  refresh();
}

bindTrackProgress(audioPlayer, leftPlayButton?.closest("section"));
bindTrackProgress(secondaryAudioPlayer, secondarySection);
