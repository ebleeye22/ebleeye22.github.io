function playPauseSound() {
  var audio = document.getElementById("myAudio");
  var playButton = document.getElementById("playButton");

  if (audio.paused) {
    audio.play();
    playButton.innerHTML =
      '<span class="material-symbols-outlined">pause</span>';
  } else {
    audio.pause();
    playButton.innerHTML =
      '<span class="material-symbols-outlined">play_arrow</span>';
  }
}
