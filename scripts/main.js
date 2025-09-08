// 选择页面元素
const myImage = document.querySelector("#switchable-img");
//设置id为switchable-img的图片为可切换图片
const myHtml = document.querySelector("html");
let myHeading = document.querySelector("h1");
let myButton = document.querySelector("button");

// 设置用户名函数
function setUserName() {
  const myName = prompt("请输入你的名字。");
  if (!myName) {
    setUserName();
  } else {
    localStorage.setItem("name", myName);
    myHeading.textContent = `Hello，${myName}! 欢迎！`;
  }
}

// 初始化用户名显示
if (!localStorage.getItem("name")) {
  setUserName();
} else {
  const storedName = localStorage.getItem("name");
  myHeading.textContent = `Hello，${storedName}! 欢迎！`;
}

// 按钮点击事件，重新设置用户名
myButton.onclick = function () {
  setUserName();
};
//这里的=是赋值符号，表示把右边的函数赋值给左边的变量myButton.onclick
//function() {} 是函数的简写形式,函数是一段可重复使用的代码块

// 图片点击事件，切换图片
myImage.onclick = () => {
  //=>是箭头函数的简写形式，相当于 function() {}
  const mySrc = myImage.getAttribute("src");
  if (mySrc === "images/my-test-image2.png") {
    myImage.setAttribute("src", "images/my-test-image.png");
  } else {
    myImage.setAttribute("src", "images/my-test-image2.png");
  }
};

/*
  这里的所有内容都是注释。
  let 是声明变量的关键字
  const 是声明常量的关键字
  var 是旧版的声明变量的关键字，不推荐使用
  "" 是字符串的开始和结束符号。
  `` 是模板字符串的开始和结束符号，可以包含占位符 ${}。
  模板字符串是 ES6 引入的新特性，允许在字符串中嵌入表达式。
  alert(`你好，${myName}！`) 不显示，因为 myName 变量在这个作用域中未定义。
  作用域是指变量和函数的可访问范围。分割线是大括号 {}。
*/

// HTML 点击事件，改变背景色并弹窗
myHtml.addEventListener("click", function (event) {
  // 如果点击的是图片、按钮或链接，则不弹窗
  if (
    event.target.tagName === "IMG" ||
    event.target.tagName === "BUTTON" ||
    event.target.tagName === "A"
  ) {
    return;
  }
  //myHtml.style.backgroundColor = "lightblue";
  alert("你好！");
});
//addEventListener() 方法为指定元素添加事件监听器。()中的内容是事件类型和事件处理函数

myHtml.onclick = function (event) {
  if (myHtml.style.backgroundColor === "lightblue") {
    myHtml.style.backgroundColor = "#ff9500";
  } else {
    myHtml.style.backgroundColor = "lightblue";
  }
};

//myHtml.onclick和myHtml.addEventListener()的区别
//myHtml.onclick = function (event) {} 这种方式只能绑定一个事件处理函数，如果多次赋值，后面的会覆盖前面的。
//myHtml.addEventListener("click", function(event) {}) 这种方式可以绑定多个事件处理函数，互不影响。
//事件处理函数是当事件发生时执行的代码块。
