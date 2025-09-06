const myImage = document.querySelector("img");

myImage.onclick = () => {
  const mySrc = myImage.getAttribute("src");
  if (mySrc === "images/my-test-image2.png") {
    myImage.setAttribute("src", "images/my-test-image.png");
  } else {
    myImage.setAttribute("src", "images/my-test-image2.png");
  }
};

/*
这里的所有内容都是注释。
*/
// 这是注释。

document.querySelector("html").addEventListener("click", function () {
  alert("你好！");
});
