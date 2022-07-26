# MIT6S.081-Lab4: traps


## RISC-V assembly
1. 哪些寄存器保存函数的参数？例如，在`main`对`printf`的调用中，哪个寄存器保存13？
   `a0-a7` 中存放参数，`a2` 保存了 13
2. `main`的汇编代码中对函数`f`的调用在哪里？对`g`的调用在哪里(提示：编译器可能会将函数内联）

如果观看汇编的话，发现好像没有直接调用函数 `f` ，应该是做了内联优化操作

```c
000000000000001c <main>:

void main(void) {
  1c:	1141                	addi	sp,sp,-16
  1e:	e406                	sd	ra,8(sp)
  20:	e022                	sd	s0,0(sp)
  22:	0800                	addi	s0,sp,16
  printf("%d %d\n", f(8)+1, 13);
  24:	4635                	li	a2,13
  26:	45b1                	li	a1,12 //这里直接输出12了
  28:	00000517          	    auipc	a0,0x0
  2c:	7b050513          	    addi	a0,a0,1968 # 7d8 <malloc+0xea>
  30:	00000097          	    auipc	ra,0x0
  34:	600080e7          	    jalr	1536(ra) # 630 <printf>
  exit(0);
  38:	4501                	li	a0,0
  3a:	00000097          	    auipc	ra,0x0
  3e:	27e080e7          	    jalr	638(ra) # 2b8 <exit>
```
   
3. `printf`函数位于哪个地址？ `0x0000000000000630`
4. 在`main`中`printf`的`jalr`之后的寄存器`ra`中有什么值？
	`ra` 中为0x30，因为 1536 写成16进制为 0x600，而 `printf` 的地址为 0x630，所以 ra 的值为 0x30

5. 运行以下代码。

```c
unsigned int i = 0x00646c72;
printf("H%x Wo%s", 57616, &i);
```

程序的输出是什么？这是将字节映射到字符的[ASCII码表](http://web.cs.mun.ca/~michael/c/ascii-table.html)。

>输出为 `He110 World` -> 注意中间是数字`110` 不是字母 `llo`

输出取决于RISC-V小端存储的事实。如果RISC-V是大端存储，为了得到相同的输出，你会把`i`设置成什么？是否需要将`57616`更改为其他值？

>`i` 需要设置为 `0x726c6400`，`57616` 不需要更改
>
 这里为什么输出是这样，首先对与%x 是输出 16 进制 `57616` 对应的16进制就是 `0x110` 也就不需要修改
>
 而对于 i = 0x00646c72，如果将它根据ascii码表转化一下就是 `\0dlr `，`\0`表示字符串的结尾，由于小端存储，最低有效位放在低地址上，读取的时候从低地址依次往高地址读，依次得到`rld\0`，也就是输出 World 这个单词，如果是大端存储就需要反过来了

6. 在下面的代码中，“`y=`”之后将打印什么(注：答案不是一个特定的值）？为什么会发生这种情况？

```c
printf("x=%d y=%d", 3);
```

>我个人的理解：因为调用`printf`的时候只传入一个参数，另外一个参数没有设置，而调用的过程中会将寄存器的内容设置到对应的参数，因为少传入一个参数，但是在使用的过程中还是使用了两个寄存器，这就导致另外一个寄存器的值没有经过初始化，可能是在程序其他地方执行过程中保存在寄存器的一个值，所以最后打印输出的是一个不确定的值

## Backtrace
这个实验是需要打印函数调用栈帧的情况，最主要是需要理解给的笔记上的那张栈帧布局图

![img](http://xv6.dgs.zone/labs/requirements/images/p2.png)

根据提示：
- 返回地址位于栈帧帧指针的固定偏移(-8)位置
- 并且保存的帧指针位于帧指针的固定偏移(-16)位置
- XV6在内核中以页面对齐的地址为每个栈分配一个页面
- 可以利用`PGROUNDDOWN(fp)`和`PGROUNDUP(fp)`（参见`kernel/riscv.h`）来计算栈页面的顶部和底部地址
依次根据栈帧地址，找到并打印输出返回地址，然后找到保存的栈指针地址进行继续循环判断

```c
//kernel/printf.c
void backtrace() {
  printf("backtrace:\n");
  uint64 fp = r_fp();
  uint64 up = PGROUNDUP(fp);
  while (fp != up) {
    printf("%p\n", *(uint64*)(fp - 8));
    fp = *(uint64*)(fp - 16);
  }
}
```

## Alarm
这个实验是要添加一个根据时间周期，CPU 进行中断的功能

### test0: invoke handler
test0是根据进程滴答数达到间隔之后，产生中断

首先需要在 `proc.h` 中给进程定义报警间隔，报警之后处理程序的函数指针和距离上次报警已经经过了多少滴答数
```c
//kernel/proc.h
// Per-process state
struct proc {
  int ticks;                   // 报警间隔
  void (*handler) ();          // 处理程序函数指针
  int tick_cnt;                // 据上一次报警已经经过了多少滴答
  //...
}
```

然后最主要就是在 `trap` 里面根据进程的报警滴答数来执行相应的中断操作，观察 `usertrap` 函数可以发现 `p->trapframe->epc` 保存的是用户的程序计数器，当产生报警的时候，将指令转移到报警处理函数，也就是将报警处理函数的地址设置到 `epc` 即可

```c
//kernel/trap.c 
void
usertrap(void)
{
  //...
  // give up the CPU if this is a timer interrupt.
  if(which_dev == 2) {
    p->tick_cnt++;
    if (p->tick_cnt == p->ticks && p->ticks != 0 ) {
      p->trapframe->epc = (uint64)p->handler;
      p->tick_cnt = 0;
    }
    yield();
  }
  //...
}
```

### test1/test2(): resume interrupted code
test1和test2需要恢复中断之前的代码，这里中断产生警告之后需要返回到原来警告的地方，也就是需要恢复寄存器的内容，但是可以通过保存原陷入帧的内容，警告之后再恢复，就可以继续运行下去

首先在 proc 结构体中定义额外的 `trapframe` 和一个标记是否正在报警的变量，在一个变量报警处理程序返回之前，不应该重复调用

```c
struct trapframe alarm_trapframe; // 报警后保存的陷阱帧
int is_alarming;                 // 是否正在报警
```

注意需要在 `allocproc` 和 `freeproc` 中将对应进程的类型初始化和清空

```c
//allocproc
  p->tick_cnt = 0;
  p->interval = 0;
  p->handler = 0;
  //p->is_signal = 0;
  memset(&p->alarm_trapframe, 0, sizeof(p->alarm_trapframe));

//freeproc
  p->interval = 0;
  p->tick_cnt = 0;
  p->handler = 0;
  //p->is_signal = 0;
  memset(&p->alarm_trapframe, 0, sizeof(p->alarm_trapframe));
```

然后是 `sys_sigalarm` 和 `sys_sigreturn` 函数的实现，这里注意`sys_sigreturn` 在警告处理函数执行完成之后将保存的陷入帧的内容都恢复

```c
//kernel/sysproc.c
uint64 sys_sigalarm(void) {
  int ticks;  //报警间隔
  uint64 fp;  //函数指针的地址

  if(argint(0, &ticks) < 0)
    return -1;

  if (argaddr(1, &fp) < 0) {
    return -1;
  }
  struct proc *p = myproc();
  p->interval = ticks;
  p->handler = (void(*)())fp;
  //p->is_signal = 1;
  return 0;
}

uint64 sys_sigreturn(void) {
  struct proc *p = myproc();
  *(p->trapframe) = p->alarm_trapframe;
  p->tick_cnt = 0;
  return 0;
}
```
最后就是在 `trap` 中的实现，这里吧 `tick_cnt` 也用来判断处理程序是否返回，因为是在`sys_sigreturn` 里设置 ` ` 的，所以在返回之前 `tick_cnt` 的值会一直增加也就不会进行if分支当中又一次调用处理程序（这个思路参考来自这里[MIT 6.S081 Lab4: traps - 知乎](https://zhuanlan.zhihu.com/p/440454679)）
```c
  // give up the CPU if this is a timer interrupt.
  if(which_dev == 2) {
    if (p->interval != 0 ) {
      if (p->tick_cnt == p->interval) {
        p->alarm_trapframe = *(p->trapframe);
        p->trapframe->epc = (uint64)p->handler;
        // p->tick_cnt = 0;
        // p->is_alarming = 1;
      }
      p->tick_cnt++;
    }
    yield();
  }
```

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220721155819.png)

其实这里有一个问题，就是我的写的代码运行的很慢，我看了好几份其他人的代码，都尝试了下，不知道为什么就会一直超时（最后索性把测试用例时间改长了一点），包括这篇文章[MIT 6.S081 2020 LAB4记录 - 知乎](https://zhuanlan.zhihu.com/p/347945926)后面说的加上一个额外的变量来控制，也试了下还是超时，在 qemu 里面进行 usertests 都能通过，就不知道问题出在哪

