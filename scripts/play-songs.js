// 初始化全局音频播放实例
const audioPlayer = new Audio();
const audioContext =
  window.AudioContext || window.webkitAudioContext
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;
const masterGain = audioContext ? audioContext.createGain() : null;

if (audioContext && masterGain) {
  const audioSource = audioContext.createMediaElementSource(audioPlayer);
  audioSource.connect(masterGain);
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = 0.5;
}

// 2. 初始音量设为 50% (0.5)
audioPlayer.volume = 1;

// 获取 DOM 元素
const playBtn = document.getElementById("playBtn");
const playSvg = document.getElementById("playFill");
const playShadow = document.getElementById("playShadow");
const nextBtn = document.getElementById("nextBtn");
const nextSvg = document.getElementById("nextSvg");
const coverContainerPrimary = document.getElementById("coverContainerPrimary");
const songTime = document.getElementById("songTime");
const songLocation = document.getElementById("songLocation");

// 记录上一首播放的索引（避免连续随到同一首）
let lastIndex = -1;
let selectedSong = songs[-1];

function setOutputVolume(targetVolume, duration = 0.2) {
  const safeVolume = Math.max(0, Math.min(1, Number(targetVolume) || 0));

  if (audioContext && masterGain) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(
      safeVolume,
      audioContext.currentTime,
      Math.max(duration / 3, 0.08),
    );
  }

  audioPlayer.volume = 1;
}

function loadRandomSong() {
  if (songs.length === 0) return;

  const isPlaying = !audioPlayer.paused && !!audioPlayer.currentSrc;

  // 1. 生成随机索引
  let randomIndex = Math.floor(Math.random() * songs.length);

  // 如果歌曲多于 1 首，确保不重复随到同一首
  if (songs.length > 1) {
    while (randomIndex === lastIndex) {
      randomIndex = Math.floor(Math.random() * songs.length);
    }
  }
  lastIndex = randomIndex;

  // 2. 获取随机选中的对象
  selectedSong = songs[randomIndex];

  // 4. 同步更新页面 UI
  coverContainerPrimary.style.backgroundImage = `url("${selectedSong.cover}")`;
  songTime.textContent = `${selectedSong.time}`;
  songLocation.textContent = `${selectedSong.location}`;

  if (isPlaying) {
    setOutputVolume(0, 0.35);

    setTimeout(() => {
      audioPlayer.src = selectedSong.audioFile;
      audioPlayer.currentTime = 0;
      playAudio();
    }, 380);
  }
}

async function playAudio() {
  if (audioContext && audioContext.state === "suspended") {
    await audioContext.resume();
  }

  audioPlayer.src = selectedSong.audioFile;

  const targetVolume = Number(document.getElementById("volume")?.value || 0.5);
  if (audioContext && masterGain) {
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  }

  audioPlayer
    .play()
    .then(() => {
      console.log(`正在播放: ${selectedSong.audioFile}`);
      playBtn.textContent = "pause";
      playSvg.setAttribute(
        "d",
        "M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z",
      );
      playShadow.setAttribute(
        "d",
        "M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z",
      );
      document.documentElement.style.setProperty(
        "--scene-color",
        selectedSong.rgb,
      );
      setOutputVolume(targetVolume, 0.45);
    })
    .catch((error) => {
      console.error("播放失败（可能受浏览器自动播放策略限制）:", error);
    });
}

// 暂停当前音频
function pauseAudio() {
  const targetVolume = 0;
  setOutputVolume(targetVolume, 0.35);

  setTimeout(() => {
    audioPlayer.pause();
    playBtn.textContent = "play_arrow";
    playSvg.setAttribute("d", "M320-200v-560l440 280-440 280Z");
    playShadow.setAttribute("d", "M320-200v-560l440 280-440 280Z");
  }, 360);
}

// 绑定点击事件
playBtn.addEventListener("click", () => {
  // 如果尚未加载过歌曲（第一次点击）
  if (lastIndex === -1) {
    loadRandomSong();
    playAudio();
    return;
  }

  // 根据当前播放器状态切换
  if (audioPlayer.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
});

playSvg.addEventListener("click", () => {
  // 如果尚未加载过歌曲（第一次点击）
  if (lastIndex === -1) {
    loadRandomSong();
    playAudio();
    return;
  }

  // 根据当前播放器状态切换
  if (audioPlayer.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
});

// 2. 下一首逻辑
nextBtn.addEventListener("click", () => {
  const wasPlaying = !audioPlayer.paused && !!audioPlayer.currentSrc;
  loadRandomSong();
  if (!wasPlaying) {
    playAudio();
  }
});

nextSvg.addEventListener("click", () => {
  const wasPlaying = !audioPlayer.paused && !!audioPlayer.currentSrc;
  loadRandomSong();
  if (!wasPlaying) {
    playAudio();
  }
});

// 3. 歌曲播放完毕后自动切下一首
audioPlayer.addEventListener("ended", () => {
  loadRandomSong();
  playAudio();
});
