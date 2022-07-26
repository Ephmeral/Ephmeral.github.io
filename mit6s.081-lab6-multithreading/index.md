# MIT6S.081-Lab6: Multithreading


## Uthread: switching between threads
这个实验主要是让我们了解线程上下文切换需要做的哪些内容

大部分内容都可以参照内核态的进程进行上下文切换时保存的寄存器

首先在 `uthread.c` 中定义用户态线程的上下文（参考`proc.h`）

```c
struct context {
  uint64 ra;
  uint64 sp;

  // callee-saved
  uint64 s0;
  uint64 s1;
  uint64 s2;
  uint64 s3;
  uint64 s4;
  uint64 s5;
  uint64 s6;
  uint64 s7;
  uint64 s8;
  uint64 s9;
  uint64 s10;
  uint64 s11;
};
```

然后补充用户态线程 `thread` 的上下文内容

```c
struct thread {
  char       stack[STACK_SIZE]; /* the thread's stack */
  int        state;             /* FREE, RUNNING, RUNNABLE */
  struct     context ucontext;  /* ucontext */
};
```

`user/uthread_switch.S`中的 thread_switch 函数和 `kernel/swtch.S` 内容一致

```c
/* YOUR CODE HERE */
	sd ra, 0(a0)
	sd sp, 8(a0)
	sd s0, 16(a0)
	sd s1, 24(a0)
	sd s2, 32(a0)
	sd s3, 40(a0)
	sd s4, 48(a0)
	sd s5, 56(a0)
	sd s6, 64(a0)
	sd s7, 72(a0)
	sd s8, 80(a0)
	sd s9, 88(a0)
	sd s10, 96(a0)
	sd s11, 104(a0)

	ld ra, 0(a1)
	ld sp, 8(a1)
	ld s0, 16(a1)
	ld s1, 24(a1)
	ld s2, 32(a1)
	ld s3, 40(a1)
	ld s4, 48(a1)
	ld s5, 56(a1)
	ld s6, 64(a1)
	ld s7, 72(a1)
	ld s8, 80(a1)
	ld s9, 88(a1)
	ld s10, 96(a1)
	ld s11, 104(a1)
	ret    /* return to ra */
```

然后补充 `thread_schedule` 函数中保存被切换线程寄存器的内容

```c
/* YOUR CODE HERE
 * Invoke thread_switch to switch from t to next_thread:
 * thread_switch(??, ??);
 */
thread_switch(&t->ucontext, &next_thread->ucontext);
```

注意我的 `thread_switch` 定义如下，不是原来的 `uint64`
```c
extern void thread_switch(struct context*, struct context*);
```

最后就是创建一个线程的时候，在 `thread_create` 中要保存函数的返回地址和栈指针的内容即可

```c
// YOUR CODE HERE
t->ucontext.ra = (uint64)func; // 保存函数返回地址
t->ucontext.sp = (uint64)t->stack + STACK_SIZE;  // 保存栈指针
```

为什么两个线程都丢失了键，而不是一个线程？确定可能导致键丢失的具有2个线程的事件序列。在**_answers-thread.txt_**中提交您的序列和简短解释。

我的理解，两个线程同时插入的时候，insert 使用头插法，如果第一个线程还没返回，第二个线程就插入会导致第一个线程的数据丢失

## Barrier
主要理解提示的意思：

>你必须处理一系列的`barrier`调用，我们称每一连串的调用为一轮（round）。`bstate.round`记录当前轮数。每次当所有线程都到达屏障时，都应增加`bstate.round`。

这样的话相对于每次当 `bstate.nthread` 等于 nthread 的时候一轮结束，然后 `bstate.round++`，否则的话进行等待

>您必须处理这样的情况：一个线程在其他线程退出`barrier`之前进入了下一轮循环。特别是，您在前后两轮中重复使用`bstate.nthread`变量。确保在前一轮仍在使用`bstate.nthread`时，离开`barrier`并循环运行的线程不会增加`bstate.nthread`。

这里意思对 `bstate.nthread` 的操作需要是原子的，所以需要在改变的时候上锁，这里直接使用 `bstate` 自带的互斥锁 `barrier_mutex` 

```c
static void 
barrier()
{
  // YOUR CODE HERE
  //
  // Block until all threads have called barrier() and
  // then increment bstate.round.
  //
  
  pthread_mutex_lock(&bstate.barrier_mutex); // acquire lock
  
  ++bstate.nthread;
  if (bstate.nthread == nthread) {
    // 所有线程已到达
    bstate.round++;
    bstate.nthread = 0;
    pthread_cond_broadcast(&bstate.barrier_cond);
  } else {
    pthread_cond_wait(&bstate.barrier_cond, &bstate.barrier_mutex);
  }
  
  pthread_mutex_unlock(&bstate.barrier_mutex);  // release lock
}
```

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220724172906.png)

感觉这个实验不是特别的难，代码量也不多，最主要是让我们理解多线程中需要进行加锁等操作

