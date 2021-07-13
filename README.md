# mini-vue
一个简易版vue，帮助了解部分原理
mini版本的vue.js2.X版本框架

模板代码

首先我们看一下我们要实现的模板代码:
```
<div id="app">
    <h3>{{ msg }}</h3>
    <p>{{ count }}</p>
    <h1>v-text</h1>
    <p v-text="msg"></p>
    <input type="text" v-model="count">
    <button type="button" v-on:click="increase">add+</button>
    <button type="button" v-on:click="changeMessage">change message!</button>
    <button type="button" v-on:click="recoverMessage">recoverMessage!</button>
</div>
```
逻辑代码

然后就是我们要编写的javascript代码。
```
const app = new miniVue({
    el:"#app",
    data:{
        msg:"hello,mini vue.js",
        count:666
    },
    methods:{
        increase(){
            this.count++;
        },
        changeMessage(){
            this.msg = "hello,eveningwater!";
        },
        recoverMessage(){
            console.log(this)
            this.msg = "hello,mini vue.js";
        }
    }
});
```
运行效果

我们来看一下实际运行效果如下所示:

图片
思考一下，我们要实现如上的功能应该怎么做呢?你也可以单独打开以上示例:

miniVue类

首先，不管三七二十一，既然是实例化一个mini-vue，那么我们先定义一个类,并且它的参数一定是一个属性配置对象。如下:
 
 ```
 class miniVue {
     constructor(options = {}){
         //后续要做的事情
     }
 }
 ```
 
现在，让我们先初始化一些属性，比如data,methods,options等等。
//在miniVue构造函数的内部
//保存根元素,能简便就尽量简便，不考虑数组情况

```
this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el;
this.$methods = options.methods;
this.$data = options.data;
this.$options = options;
```

初始化完了之后，我们再来思考一个问题，我们是不是可以通过在vue内部使用this访问到vue定义的数据对象呢？那么我们应该如何实现这一个功能呢？这个功能有一个专业的名词，叫做代理(proxy)。
代理数据

因此我们来实现一下这个功能，很明显在这个miniVue类的内部定义一个proxy方法。如下:
```
//this.$data.xxx -> this.xxx;
//proxy代理实例上的data对象
proxy(data){
    //后续代码
}
```

接下来，我们需要知道一个api,即Object.defineProperty，通过这个方法来完成这个代理方法。如下:
//proxy方法内部
// 因为我们是代理每一个属性，所以我们需要将所有属性拿到

```
Object.keys(data).forEach(key => {
    Object.defineProperty(this,key,{
        enumerable:true,
        configurable:true,
        get:() => {
            return data[key];
        },
        set:(newValue){
            //这里我们需要判断一下如果值没有做改变就不用赋值，需要排除NaN的情况
            if(newValue === data[key] || _isNaN(newValue,data[key]))return;
            data[key] = newValue;
        }
    })
})
```

接下来，我们来看一下这个_isNaN工具方法的实现，如下:

```
function _isNaN(a,b){
    return Number.isNaN(a) && Number.isNaN(b);
}
```

定义好了之后，我们只需要在miniVue类的构造函数中调用一次即可。如下:

```
// 构造函数内部
this.proxy(this.$data);
```

代理就这样完成了，让我们继续下一步。
数据响应式观察者observer类

我们需要对数据的每一个属性都定义一个响应式对象，用来监听数据的改变，所以我们需要一个类来管理它，我们就给它取个名字叫Observer。如下:

```
class Observer {
    constructor(data){
        //后续实现
    }
}
```

我们需要给每一个数据都添加响应式对象，并且转换成getter和setter函数，这里我们又用到了Object.defineProperty方法，我们需要在getter函数中收集依赖，在setter函数中发送通知，用来通知依赖进行更新。我们用一个方法来专门去执行定义响应式对象的方法，叫walk，如下:
//再次申明，不考虑数组,只考虑对象

```
walk(data){
    if(typeof data !== 'object' || !data)return;
    // 数据的每一个属性都调用定义响应式对象的方法
    Object.keys(data).forEach(key => this.defineReactive(data,key,data[key]));
}
```

接下来我们来看defineReactive方法的实现，同样也是使用Object.defineProperty方法来定义响应式对象，如下所示:

```
defineReactive(data,key,value){
    // 获取当前this，以避免后续用vm的时候，this指向不对
    const vm = this;
    // 递归调用walk方法，因为对象里面还有可能是对象
    this.walk(value);
    //实例化收集依赖的类
    let dep = new Dep();
    Object.defineProperty(data,key,{
        enumerable:true,
        configurable:true,
        get(){
            // 收集依赖,依赖存在Dep类上
            Dep.target && Dep.add(Dep.target);
            return value;
        },
        set(newValue){
            // 这里也判断一下
            if(newValue === value || __isNaN(value,newValue))return;
            // 否则改变值
            value = newValue;
            // newValue也有可能是对象，所以递归
            vm.walk(newValue);
            // 通知Dep类
            dep.notify();
        }
    })
}
```

Observer类完成了之后，我们需要在miniVue类的构造函数中实例化一下它,如下:

```
//在miniVue构造函数内部
new Observer(this.$data);
```

好的，让我们继续下一步。
依赖类

defineReactive方法内部用到了Dep类，接下来，我们来定义这个类。如下:

```
class Dep {
    constructor(){
        //后续代码
    }
}
```

接下来，我们来思考一下，依赖类里面，我们需要做什么，首先根据defineReactive中，我们很明显就知道会有add方法和notify方法，并且我们需要一种数据结构来存储依赖，vue源码用的是队列，而在这里为了简单化，我们使用ES6的set数据结构。如下:

```
//构造函数内部
this.deps = new Set();
```

接下来，就需要实现add方法和notify方法,事实上这里还会有删除依赖的方法，但是这里为了最简便，我们只需要一个add和notify方法即可。如下:

```
add(dep){
    //判断dep是否存在并且是否存在update方法,然后添加到存储的依赖数据结构中
    if(dep && dep.update)this.deps.add(dep);
}
notify(){
    // 发布通知无非是遍历一道dep，然后调用每一个dep的update方法，使得每一个依赖都会进行更新
    this.deps.forEach(dep => dep.update())
}
```

Dep类算是完了，接下来我们就需要另一个类。
Watcher类

那就是为了管理每一个组件实例的类，确保每个组件实例可以由这个类来发送视图更新以及状态流转的操作。这个类，我们把它叫做Watcher。

```
class Watcher {
    //3个参数，当前组件实例vm,state也就是数据以及一个回调函数，或者叫处理器
    constructor(vm,key,cb){
        //后续代码
    }
}
```

再次思考一下，我们的Watcher类需要做哪些事情呢?我们先来思考一下Watcher的用法，我们是不是会像如下这样来写:
//3个参数，当前组件实例vm,state也就是数据以及一个回调函数，或者叫处理器
```
new Watcher(vm,key,cb);
```

ok,知道了使用方式之后，我们就可以在构造函数内部初始化一些东西了。如下:

```
//构造函数内部
this.vm = vm;
this.key = key;
this.cb = cb;
//依赖类
Dep.target = this;
// 我们用一个变量来存储旧值，也就是未变更之前的值
this.__old = vm[key];
Dep.target = null;
```

然后Watcher类就多了一个update方法，接下来让我们来看一下这个方法的实现吧。如下:

```
update(){
    //获取新的值
    let newValue = this.vm[this.key];
    //与旧值做比较，如果没有改变就无需执行下一步
    if(newValue === this.__old || __isNaN(newValue,this.__old))return;
    //把新的值回调出去
    this.cb(newValue);
    //执行完之后，需要更新一下旧值的存储
    this.__old = newValue;
}
```

编译类compiler类

初始化

到了这一步，我们就算是完全脱离vue源码了，因为vue源码的编译十分复杂，涉及到diff算法以及虚拟节点vNode，而我们这里致力于将其最简化，所以单独写一个Compiler类来编译。如下:

```
class Compiler {
    constructor(vm){
        //后续代码
    }
}
```

注意:这里的编译是我们自己根据流程来实现的，与vue源码并没有任何关联，vue也有compiler，但是与我们实现的完全不同。
定义好了之后，我们在miniVue类的构造函数中实例化一下这个编译类即可。如下:

```
//在miniVue构造函数内部
new Compiler(this);
```

好的，我们也看到了使用方式，所以接下来我们来完善这个编译类的构造函数内部的一些初始化操作。如下:

```
//编译类构造函数内部
//根元素
this.el = vm.$el;
//事件方法
this.methods = vm.$methods;
//当前组件实例
this.vm = vm;
//调用编译函数开始编译
this.compile(vm.$el);
```

compile方法

初始化操作算是完成了，接下来我们来看compile方法的内部。思考一下，在这个方法的内部，我们是不是需要拿到所有的节点，然后对比是文本还是元素节点去分别进行编译呢？如下:

```
compile(el){
    //拿到所有子节点（包含文本节点）
    let childNodes = el.childNodes;
    //转成数组
    Array.from(childNodes).forEach(node => {
        //判断是文本节点还是元素节点分别执行不同的编译方法
        if(this.isTextNode(node)){
            this.compileText(node);
        }else if(this.isElementNode(node)){
            this.compileElement(node);
        }
        //递归判断node下是否还含有子节点，如果有的话继续编译
        if(node.childNodes && node.childNodes.length)this.compile(node);
    })
}
```

这里，我们需要2个辅助方法，判断是文本节点还是元素节点，其实我们可以使用节点的nodeType属性来进行判断,由于文本节点的nodeType值为3，而元素节点的nodeType值为1。所以这2个辅助方法我们就可以实现如下:

```
isTextNode(node){
    return node.nodeType === 3;
}
isElementNode(node){
    return node.nodeType === 3;
}
```

编译文本节点

接下来，我们下来看compileText编译文本节点的方法。如下:

```
//{{ count }}数据结构是类似如此的
compileText(node){
    //后续代码
}
```

接下来，让我们思考一下，我们编译文本节点，无非就是把文本节点中的{{ count }}映射成为0,而文本节点不就是node.textContent属性吗？所以此时我们可以想到根据正则来匹配{{}}中的count值，然后对应替换成数据中的count值，然后我们再调用一次Watcher类，如果更新了，就再次更改这个node.textContent的值。如下:

```
compileText(node){
    //定义正则，匹配{{}}中的count
    let reg = /\{\{(.+?)\}\}/g;
    let value = node.textContent;
    //判断是否含有{{}}
    if(reg.test(value)){
        //拿到{{}}中的count,由于我们是匹配一个捕获组，所以我们可以根据RegExp类的$1属性来获取这个count
        let key = RegExp.$1.trim();
        node.textContent = value.replace(reg,this.vm[key]);
        //如果更新了值，还要做更改
        new Watcher(this.vm,key,newValue => {
            node.textContent = newValue;
        })
    }
}
```

编译文本节点到此为止了，接下来我们来看编译元素节点的方法。
编译元素节点

指令

首先，让我们想一下，我们编译元素节点无非是想要根据元素节点上的指令来分别执行不同的操作，所以我们编译元素节点就只需要判断是否含有相关指令即可，这里我们只考虑了v-text,v-model,v-on:click这三个指令。让我们来看看compileElement方法吧。

```
compileElement(node){
    //指令不就是一堆属性吗，所以我们只需要获取属性即可
    const attrs = node.attributes;
    if(attrs.length){
        Array.from(attrs).forEach(attr => {
            //这里由于我们拿到的attributes可能包含不是指令的属性，所以我们需要先做一次判断
            if(this.isDirective(attr)){
                //根据v-来截取一下后缀属性名,例如v-on:click,subStr(5)即可截取到click,v-text与v-model则subStr(2)截取到text和model即可
                let attrName = attr.indexOf(':') > -1 ? attr.subStr(5) : attr.subStr(2);
                let key = attr.value;
                //单独定义一个update方法来区分这些
                this.update(node,attrName,key,this.vm[key]);
            }
        })
    }
}
```

这里又涉及到了一个isDirective辅助方法，我们可以使用startsWith方法，判断是否含有v-值即可认定这个属性就是一个指令。如下:

```
isDirective(dir){
    return dir.startsWith('v-');
}
```

接下来，我们来看最后的update方法。如下:

```
update(node,attrName,key,value){
    //后续代码
}
```

最后，让我们来思考一下，我们update里面需要做什么。很显然，我们是不是需要判断是哪种指令来执行不同的操作？如下:

```
//update函数内部
if(attrName === 'text'){
    //执行v-text的操作
}else if(attrName === 'model'){
    //执行v-model的操作
}else if(attrName === 'click'){
    //执行v-on:click的操作
}
```

v-text指令

好的，我们知道，根据前面的编译文本元素节点的方法，我们就知道这个指令的用法同前面编译文本元素节点。所以这个判断里面就好写了，如下:

```
//attrName === 'text'内部
node.textContent = value;
new Watcher(this.vm,key,newValue => {
    node.textContent = newValue;
})
```

v-model指令

v-model指令实现的是双向绑定，我们都知道双向绑定是更改输入框的value值，并且通过监听input事件来实现。所以这个判断，我们也很好写了，如下:

```
//attrName === 'model'内部
node.value = value;
new Watcher(this.vm,key,newValue => {
    node.value = newValue;
});
node.addEventListener('input',(e) => {
    this.vm[key] = node.value;
})
```

v-on:click指令

v-on:click指令就是将事件绑定到methods内定义的函数，为了确保this指向当前组件实例，我们需要通过bind方法改变一下this指向。如下:

```
//attrName === 'click'内部
node.addEventListener(attrName,this.methods[key].bind(this.vm));
```

到此为止，我们一个mini版本的vue2.x就算是实现了
