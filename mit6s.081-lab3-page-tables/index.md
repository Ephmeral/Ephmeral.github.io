# MIT6S.081-Lab3: page tables

## Speed up system calls
最开始参考实验部分的是[课程介绍 · 6.S081 All-In-One](http://xv6.dgs.zone/)，做完打印页表实验后发现没法通过，然后反应过来这个中文翻译是基于xv6-lab-2020的，而我用的代码框架是2021年的，就有一点出入，仔细看了官网的[Lab: page tables](https://pdos.csail.mit.edu/6.S081/2021/labs/pgtbl.html)发现第三个实验页表有点不一样（可能因为20年页表比较难，21年降低了难度）

回到这个实验，这里需要添加的功能是增加一个内核态和用户态共享的一段数据区域，来加快某些系统调用

具体实现是在创建每个进程后，在 USYSCALL（定义在kernel/memlayout.h 中）上映射一个只读页面。在此页面的开头，存储一个结构 usyscall（也在 memlayout.h 中定义），并对其进行初始化以存储当前进程的 PID

USYCALL 通过观察定义其实就是 `(1L << (9 + 9 + 9 + 12 - 1)) - 4096 - 4096 - 4096` ，相当于是在最大的地址空间往下分配的第三个大小为4096的页面，它和 TRAPFRAME 这块区域有很大共同之处

```c
//kernel/memlayout.h
// MAXVA = (1L << (9 + 9 + 9 + 12 - 1))
// PGSIZE = 4096
#define TRAMPOLINE (MAXVA - PGSIZE)
#define TRAPFRAME (TRAMPOLINE - PGSIZE)
#ifdef LAB_PGTBL
#define USYSCALL (TRAPFRAME - PGSIZE)

struct usyscall {
  int pid;  // Process ID
};
#endif
```

首先由于是创建每个进程都会映射这样的一个页面，所以此时需要在 proc 进程的结构体上定义一个这样的指针，类似于`trapframe` 结构体

```c
//kernel/proc.h

struct proc {
  struct spinlock lock;

//这里用了宏，因为usycall结构体定义的时候就在宏内部
//这里保持一致，下同
#ifdef LAB_PGTBL
  struct usyscall *usyscall;
#endif
  
  pagetable_t pagetable;       // User page table
  struct trapframe *trapframe; // data page for trampoline.S
  //...
};
```

然后就是在创建进程的时候需要分配这个页面，提示信息也给了：需要在 `proc_pagetable()` 中执行映射，这里需要用 `mappages` 来映射这个界面，通过观察函数原型可以发现，mappages 传入参数分别为 页表、起始的虚拟地址、大小、物理地址和标志位

```c
int
mappages(pagetable_t pagetable, uint64 va, uint64 size, uint64 pa, int perm);
```

页表和大小不用多说，就是上面已经定义的 pagetable 和 PGSIZE (4096)，对于起始的虚拟地址，由于是在 USYCALL 这里分配的4096个字节的页面，所以就是 USYCALL，物理地址则是进程中的 usyscall 结构体指针对于的地址（可以参照上面的写法），而标志位由于是只读的需要设为 PTE_R ，同时这里是用户态和内核态共享的页面需要设为 PTE_U，最后不难写出如下代码：

```c
//kernel/proc.c
pagetable_t
proc_pagetable(struct proc *p)
{
	//...
	
#ifdef LAB_PGTBL
  //分配一个用户态和内核态之间的可读区，加速系统调用
  if(mappages(pagetable, USYSCALL, PGSIZE,
              (uint64)(p->usyscall), PTE_R | PTE_U) < 0){
    //下面是分配失败的同时释放已经分配过的页面
    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
    uvmunmap(pagetable, TRAPFRAME, 1, 0);
    uvmfree(pagetable, 0);
    return 0;
  }
#endif

  return pagetable;
}
```

执行映射创建好了就是需要到 `allocproc()` 中进行初始化和分配页面，主要是仿照上面给 trapframe 初始化和分配的写法，注意需要同时将进程 id 初始化

```c
static struct proc*
allocproc(void)
{
	//...
	
  // Allocate a trapframe page.
  if((p->trapframe = (struct trapframe *)kalloc()) == 0){
    freeproc(p);
    release(&p->lock);
    return 0;
  }

#ifdef LAB_PGTBL
  // 分配一个加速系统调用页
  if((p->usyscall = (struct usyscall *)kalloc()) == 0){
    freeproc(p);
    release(&p->lock);
    return 0;
  }
  //进程id初始化
  p->usyscall->pid = p->pid;
#endif

  //...
  return p;
}
```

既有初始化和分配，肯定也需要释放，在 `freeproc()` 中执行释放页面操作，仿写即可

```c
static void
freeproc(struct proc *p)
{
  if(p->trapframe)
    kfree((void*)p->trapframe);
  p->trapframe = 0;

//释放加速系统调用页
#ifdef LAB_PGTBL
  if(p->usyscall)
    kfree((void*)p->usyscall);
  p->usyscall = 0;
#endif
  //...
}
```

最后需要在 `proc_freepagetable` 释放进程的页表和已经映射的页面，不然会报 `panic: freewalk: leaf` 的错误

```c
void
proc_freepagetable(pagetable_t pagetable, uint64 sz)
{
  uvmunmap(pagetable, TRAMPOLINE, 1, 0);
  uvmunmap(pagetable, TRAPFRAME, 1, 0);
#ifdef LAB_PGTBL
  uvmunmap(pagetable, USYSCALL, 1, 0);
#endif
  uvmfree(pagetable, sz);
}
```

## Print a page table
这个实验是需要添加一个打印页表的功能，参考 `freewalk` 首先枚举512个页表项，对于每一项看是否有效，如果有效进行打印输出，同时判断是否为叶子节点（也就是判断PTE_R|PTE_W|PTE_X 是否都为0），然后就是需要一些递归深度的处理，这里用一个变量，比较容易想到

```c
//kernel//vm.c

void _vmprint(pagetable_t pagetable, int level) {
  // there are 2^9 = 512 PTEs in a page table.
  for(int i = 0; i < 512; i++) {
    pte_t pte = pagetable[i];
    if((pte & PTE_V)) {
      // this PTE points to a lower-level page table.
      for (int j = 0; j < level; j++) {
        if (j == 0) {
          printf("..");
        } else {
          printf(" ..");
        }
      }
      uint64 child = PTE2PA(pte);
      printf("%d: pte %p pa %p\n", i, pte, child);
      if ((pte & (PTE_R|PTE_W|PTE_X)) == 0)
        _vmprint((pagetable_t)child, level + 1);
    } 
  }
}


void vmprint(pagetable_t pagetable) {
  printf("page table %p\n", pagetable);
  _vmprint(pagetable, 1);
}
```

## Detecting which pages have been accessed
这个实验是检测进程对应的页表是否已经访问过，首先需要我们自己设置 PTE_A 位，通过查看xv6 book 可以发现，页表 A 位在第6号位，所以 PTE_A 就是 1L << 6 

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220720003255.png)

然后就是 sys_paaccess 系统调用的实现，首先根据提示获得三个参数，第一个参数为用户页表的起始地址，第二个参数为需要检查的页表数目，第三个参数为用户地址（用来返回数据信息的）

根据提示和之前的实验，可以知道通过 argaddr 能够获取地址，argint 能够获取整数变量，注意传入的参数要与之对应

然后就是根据 walk 函数来查找对应的页表，因为有了用户页表的起始地址，再加上每次循环的个数，就能够得到对应页表的地址，根据这个地址来判断 PET_ A 为是否为1，为1的话将掩码对应的位置置为1，最后根据 copyout 写回用户态即可

```c
#ifdef LAB_PGTBL
int
sys_pgaccess(void)
{
  // lab pgtbl: your code here.
  uint64 va;
  int n;
  uint64 addr; // user address
  if(argaddr(0, &va) < 0)
    return -1;

  if(argint(1, &n) < 0)
    return -1;

  if(argaddr(2, &addr) < 0)
    return -1;

  if(va >= MAXVA)
    panic("walk");
  
  struct proc *p = myproc();
  if (p == 0) return 1;
  pagetable_t pagetable = p->pagetable;
  uint64 mask = 0;
  for(int i = 0; i < n; i++) {
    pte_t *pte = walk(pagetable, (uint64)va + (uint64)PGSIZE * i, 0);
    if((pte != 0) && ((*pte) & PTE_A)) {
      mask |= 1 << i;
      //清空 PTE_A 位
      *pte &= ~PTE_A;
    } 
  }

  if (copyout(pagetable, addr, (char *)&mask, sizeof(mask)) < 0) {
    return -1;
  }
  return 0;
}
#endif
```

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220720004055.png)

lab3 让我对页表机制重新复习了一遍，之前做过南大的PA，页表这方面内容有所接触，不过感觉20年的lab3难一点，有时间可以做一下

参考资料：
[MIT 6.S081 2020 LAB3记录 - 知乎](https://zhuanlan.zhihu.com/p/347172409)

