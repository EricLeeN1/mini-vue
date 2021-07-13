import miniVue from './miniVue.js';

const app = new miniVue({
  el: "#app",
  data: {
    msg: "Hello,mini vue js",
    count: 666,
  },
  method: {
    increase() {
      this.count++;
    },
    changeMessage() {
      console.log(111)
      this.msg = "hello,eveningwater!";
    },
    recoverMessage() {
      console.log(2222)
      this.msg = "hello,mini vue.js";
    },
  },
});
