function _isNaN(a, b) {
  return Number.isNaN(a) && Number.isNaN(b);
}

class Dep {
  constructor() {
    //构造函数内部
    this.deps = new Set();
  }

  add(dep) {
    //判断dep是否存在并且是否存在update方法,然后添加到存储的依赖数据结构中
    if (dep && dep.update) this.deps.add(dep);
  }
  notify() {
    // 发布通知无非是遍历一道dep，然后调用每一个dep的update方法，使得每一个依赖都会进行更新
    this.deps.forEach((dep) => dep.update());
  }
}

class Watcher {
  //3个参数，当前组件实例vm,state也就是数据以及一个回调函数，或者叫处理器
  constructor(vm, key, cb) {
    //后续代码
    //构造函数内部
    this.vm = vm;
    this.key = key;
    this.cb = cb;
    //依赖类
    Dep.target = this;
    // 我们用一个变量来存储旧值，也就是未变更之前的值
    this.__old = vm[key];
    Dep.target = null;
  }

  update() {
    //获取新的值
    let newValue = this.vm[this.key];
    //与旧值做比较，如果没有改变就无需执行下一步
    if (newValue === this.__old || __isNaN(newValue, this.__old)) return;
    //把新的值回调出去
    this.cb(newValue);
    //执行完之后，需要更新一下旧值的存储
    this.__old = newValue;
  }
}

class Compiler {
  constructor(vm) {
    //编译类构造函数内部
    //根元素
    this.el = vm.$el;
    //事件方法
    this.methods = vm.$methods;
    //当前组件实例
    this.vm = vm;
    //调用编译函数开始编译
    this.compile(vm.$el);
  }

  compile(el) {
    //拿到所有子节点（包含文本节点）
    let childNodes = el.childNodes;
    //转成数组
    Array.from(childNodes).forEach((node) => {
      //判断是文本节点还是元素节点分别执行不同的编译方法
      if (this.isTextNode(node)) {
        this.compileText(node);
      } else if (this.isElementNode(node)) {
        this.compileElement(node);
      }
      //递归判断node下是否还含有子节点，如果有的话继续编译
      if (node.childNodes && node.childNodes.length) this.compile(node);
    });
  }

  isTextNode(node) {
    return node.nodeType === 3;
  }
  isElementNode(node) {
    return node.nodeType === 1;
  }

  //{{ count }}数据结构是类似如此的
  compileText(node) {
    //定义正则，匹配{{}}中的count
    let reg = /\{\{(.+?)\}\}/g;
    let value = node.textContent;
    //判断是否含有{{}}
    if (reg.test(value)) {
      //拿到{{}}中的count,由于我们是匹配一个捕获组，所以我们可以根据RegExp类的$1属性来获取这个count
      let key = RegExp.$1.trim();
      node.textContent = value.replace(reg, this.vm[key]);
      //如果更新了值，还要做更改
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue;
      });
    }
  }

  compileElement(node) {
    //指令不就是一堆属性吗，所以我们只需要获取属性即可
    const attrs = node.attributes;
    if (attrs.length) {
      Array.from(attrs).forEach((attr) => {
        //这里由于我们拿到的attributes可能包含不是指令的属性，所以我们需要先做一次判断
        let attrName = attr.name;
        if (this.isDirective(attrName)) {
          //根据v-来截取一下后缀属性名,例如v-on:click,subStr(5)即可截取到click,v-text与v-model则subStr(2)截取到text和model即可
          attrName =
            attr.indexOf(":") > -1 ? attr.subStr(5) : attr.subStr(2);
          let key = attr.value;
          //单独定义一个update方法来区分这些
          console.log(attrName);
          this.update(node, attrName, key, this.vm[key]);
        }
      });
    }
  }

  isDirective(dir){
    return dir.startsWith('v-');
}

  update(node, attrName, key, value) {
    //update函数内部
    if (attrName === "text") {
      //执行v-text的操作
      //attrName === 'text'内部
      node.textContent = value;
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue;
      });
    } else if (attrName === "model") {
      //执行v-model的操作
      //attrName === 'model'内部
      node.value = value;
      new Watcher(this.vm, key, (newValue) => {
        node.value = newValue;
      });
      node.addEventListener("input", (e) => {
        this.vm[key] = node.value;
      });
    } else if (attrName === "click") {
      //执行v-on:click的操作
      //attrName === 'click'内部
      node.addEventListener(attrName, this.methods[key].bind(this.vm));
    }
  }
}

class Observer {
  constructor(data) {
    this.walk(data);
  }

  defineReactive(data, key, value) {
    // 获取当前this，以避免后续用vm的时候，this指向不对
    const vm = this;
    // 递归调用walk方法，因为对象里面还有可能是对象
    this.walk(value);
    //实例化收集依赖的类
    let dep = new Dep();
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖,依赖存在Dep类上
        Dep.target && dep.add(Dep.target);
        return value;
      },
      set(newValue) {
        // 这里也判断一下
        if (newValue === value || __isNaN(value, newValue)) return;
        // 否则改变值
        value = newValue;
        // newValue也有可能是对象，所以递归
        vm.walk(newValue);
        // 通知Dep类
        dep.notify();
      },
    });
  }

  //再次申明，不考虑数组,只考虑对象
  walk(data) {
    if (typeof data !== "object" || !data) return;
    // 数据的每一个属性都调用定义响应式对象的方法
    Object.keys(data).forEach((key) =>
      this.defineReactive(data, key, data[key])
    );
  }
}

class miniVue {
  constructor(options = {}) {
    // TODO、
    //保存根元素,能简便就尽量简便，不考虑数组情况
    this.$el =
      typeof options.el === "string"
        ? document.querySelector(options.el)
        : options.el;
    this.$methods = options.methods;
    this.$data = options.data;
    this.$options = options;
    this.proxy(this.$data);
    new Observer(this.$data);
    //在miniVue构造函数内部
    new Compiler(this);
  }

  // 代理,this.$data.xxx -> this.xxx
  proxy(data) {
    //proxy方法内部
    // 因为我们是代理每一个属性，所以我们需要将所有属性拿到
    Object.keys(data).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: () => {
          return data[key];
        },
        set: (newValue) => {
          // NaN !== NaN
          //这里我们需要判断一下如果值没有做改变就不用赋值，需要排除NaN的情况
          if (newValue === data[key] || _isNaN(newValue, data[key])) return;
          data[key] = newValue;
        },
      });
    });
  }
}


export default miniVue