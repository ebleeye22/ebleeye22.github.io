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
