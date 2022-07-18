# MIT6S.081-Lab2: system calls

## System call tracing
trace 的功能就是根据提供的掩码 mask，来跟踪后续执行的系统调用情况，用户级的 trace 将传入的一个数字通过内核态的系统调用 sys_trace 来设置进程的掩码 mask，然后通过 exec 来执行后续的系统调用，通过对提供的 mask 进行判断，如果系统调用是需要跟踪的，则打印输出相关信息

首先根据提示添加系统调用 trace，这个不难

然后根据提示在`kernel/sysproc.c`中添加一个`sys_trace()`函数，这个函数将用户态传入的参数保存到 `proc` 结构体中，所以需要在 `kernel/proc.h` 中添加一个 int 型变量 `mask`，然后修改`kernel/proc.c` 中的 `fork()` 函数，将父进程的 `mask` 也拷贝到子进程中，对应代码如下：
```c
//kernel/proc.c 中的fork()函数
np->mask = p->mask; 
```

接下来就是内核态的 `sys_trace` 的实现，通过观察其他函数，可以发现 `argint()` 这个函数的作用就是将用户态传入的参数拿到内核态来使用，不难写出 `sys_trace` 的实现，如下：

```c
uint64 sys_trace(void) {
  int n;

  if(argint(0, &n) < 0)
    return -1;
  myproc()->mask = n;
  return 0;
}
```

最后修改 `kernel/syscall.c` 中的`syscall()`函数，从这里可以看出根据这个系统调用的过程是根据提供的数字编号来通过查找`static uint64 (*syscalls[])(void)` 这个函数指针表来执行相应的系统调用，那么我们只需要在执行完看 num 这个数字对应的系统调用是否是我们需要追踪的即可，由于总共系统调用数量不超过32个，所以可以用一个 int 型变量 mask 来表示需要追踪的系统调用，代码如下

```c
//系统调用名称数组
char *syscall_name[] = {
    "",     //注意fork是从1开始的
    "fork",
    "exit",
    "wait",
    "pipe",
    "read",
    "kill",
    "exec",
    "fstat",
    "chdir",
    "dup",
    "getpid",
    "sbrk",
    "sleep",
    "uptime",
    "open",
    "write",
    "mknod",
    "unlink",
    "link",
    "mkdir",
    "close",
    "trace",
};

void
syscall(void)
{
  int num;
  struct proc *p = myproc();

  num = p->trapframe->a7;
  if(num > 0 && num < NELEM(syscalls) && syscalls[num]) {
    p->trapframe->a0 = syscalls[num]();
    //打印输出syscall情况
    if ((p->mask >> num) & 1) {
      printf("%d: syscall %s -> %d\n", p->pid, syscall_name[num], p->trapframe->a0);
    }
  } else {
    printf("%d %s: unknown sys call %d\n",
            p->pid, p->name, num);
    p->trapframe->a0 = -1;
  }
}
```

## Sysinfo
这个系统调用是将系统运行的信息返回给用户，前面的添加系统调用函数等等和上面类似

主要来看一下`kenel/sysproc.c` 中的 `sys_sysinfo` 这个函数的实现，根据提示先观察`kenel/sysfile.c` 中的 `sys_fstat` 这个函数，`fstat` 是将文件的信息从内核态返回给用户态，`sysinfo` 基本可以仿照 `fstat` 来完成

fstat 通过调用 argfd 和 argaddr 函数来初始化结构体 file 也就是文件描述符相关信息，st指的是用户态的指向struct stat的地址，这里用的是64位无符号数表示， argfd 和 argaddr 这两个函数根据提供的参数位置，从寄存器中得到相应的信息

通过观察系统调用`int fstat(int fd, struct stat*);` 可以发现第一个参数为文件描述符，第二个为 stat 结构体，所以对应 sys_fstat 中 argfd 第一个参数传入的为0，表示从第a0寄存器中获取值然后赋给f，同样的对于argaddr 第一个参数传入1，表示从第a1寄存器中获取值然后赋给st

当得到从用户态传入的参数数据之后，再调用 filestat 来拷贝信息，并且通过 copyout 传回用户态

```c
//kernel/sysfile.c
uint64
sys_fstat(void)
{
  struct file *f;
  uint64 st; // user pointer to struct stat

  if(argfd(0, 0, &f) < 0 || argaddr(1, &st) < 0)
    return -1;
  return filestat(f, st);
}

//kernel/file.c
// Get metadata about file f.
// addr is a user virtual address, pointing to a struct stat.
int
filestat(struct file *f, uint64 addr)
{
  struct proc *p = myproc();
  struct stat st;
  
  if(f->type == FD_INODE || f->type == FD_DEVICE){
    ilock(f->ip);
    stati(f->ip, &st);
    iunlock(f->ip);
    if(copyout(p->pagetable, addr, (char *)&st, sizeof(st)) < 0)
      return -1;
    return 0;
  }
  return -1;
}
```

所以对于 `sysinfo` 也是采取类似的操作，首先是初始化从用户态得到的参数信息，接着通过 `getFreeMem` 和 `getEmptyProc` 得到空闲内存的字节数和 `state` 字段不为 `UNUSED` 的进程数，最后利用 `copyout` 函数将获取的信息传回用户态中

```c
uint64 sys_sysinfo(void) {
  struct sysinfo info;
  struct proc *p = myproc();
  uint64 addr; //addr 表示从用户态传入的struct sysinfo结构体的地址

  if(argaddr(0, &addr) < 0)
    return -1;
    
  info.freemem = getFreeMem();
  info.nproc = getEmptyProc();
  if(copyout(p->pagetable, addr, (char *)&info, sizeof(info)) < 0)
      return -1;

  return 0;
}
```

其中 `getFreeMem` 和 `getEmptyProc` 需要我们自己实现，通过观察对应文件其他函数，不难实现，代码如下：

```c
//kernel/proc.c
uint64 getEmptyProc(void) {
  uint64 cnt = 0; //计数
  struct proc *p; //指向proc进程的指针

  //从第一个进程开始，到所有进程表结束，记录不为UNUSED的进程个数
  for(p = proc; p < &proc[NPROC]; p++) {
    if(p->state != UNUSED) {
      cnt++;
    } 
  }
  return cnt;
}

//kernel/kalloc.c
uint64 getFreeMem(void) {
    struct run *r;
	uint64 cnt = 0; //记录空闲链表的个数
	
	r = kmem.freelist; //空闲链表的起始地址
	//依次遍历空闲链表
	while(r) {
		r = r->next;
		cnt++;
	}
	
	return cnt * PGSIZE; //每个链表的大小为PGSIZE个字节
}
```

完结证明：

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220718143302.png)

lab2 让我对xv6中系统调用的过程更加熟悉，包括如何从用户态读取参数，如何将内核态的信息传回给用户态中，通过读源码的方式能够有效的理解其中的过程，继续加油

