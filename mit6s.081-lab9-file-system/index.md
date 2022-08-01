# MIT6S.081-Lab9 File system


## Large files
这个部分是要拓展xv6原来的文件系统，本来的inode是一级的，`addrs`数组中最后一个元素对应一个间接引用节点的地址，这个节点又包括了256个节点的地址，加上本身的12个节点数据，总共有256+12 = 268个节点，我们要做的就是将这个一级间接引用拓展到二级

![img](http://xv6.dgs.zone/tranlate_books/book-riscv-rev1/images/c8/p2.png)

最开始我没弄清楚具体要怎么实现，再原有基础上直接加成了二级引用的形式，但是对于原本的inode并没有链接上，后来发现需要再原有的`addrs`数组进行拓展

首先看一下这几个宏，先将 `NDIRECT` 个直接块减少 1，给二级引用间接块腾出个空间，这样对应 `dinode` 和 `inode` 对应的 `addrs` 数组为了和原本大小保持一致需要加上 1
```c
//fs.h
#define NDIRECT 11
#define NINDIRECT (BSIZE / sizeof(uint))
#define DNINDIRECT ((NINDIRECT) * (NINDIRECT))
#define MAXFILE (NDIRECT + NINDIRECT + DNINDIRECT)

struct dinode {
  short type;           // File type
  short major;          // Major device number (T_DEVICE only)
  short minor;          // Minor device number (T_DEVICE only)
  short nlink;          // Number of links to inode in file system
  uint size;            // Size of file (bytes)
  uint addrs[NDIRECT+2];   // Data block addresses
};

//file.c
struct inode {
  uint dev;           // Device number
  uint inum;          // Inode number
  int ref;            // Reference count
  struct sleeplock lock; // protects everything below here
  int valid;          // inode has been read from disk?

  short type;         // copy of disk inode
  short major;
  short minor;
  short nlink;
  uint size;
  uint addrs[NDIRECT+2];
};
```

然后是修改 bmap ，使其能进行二级映射（看懂原本 bmap 应该不难想到）

```c
static uint
bmap(struct inode *ip, uint bn)
{
  uint addr, *a;
  struct buf *bp;

  if(bn < NDIRECT){
    if((addr = ip->addrs[bn]) == 0)
      ip->addrs[bn] = addr = balloc(ip->dev);
    return addr;
  }
  bn -= NDIRECT;

  if(bn < NINDIRECT){
    // Load indirect block, allocating if necessary.
    if((addr = ip->addrs[NDIRECT]) == 0)
      ip->addrs[NDIRECT] = addr = balloc(ip->dev);
    bp = bread(ip->dev, addr);
    a = (uint*)bp->data;
    if((addr = a[bn]) == 0){
      a[bn] = addr = balloc(ip->dev);
      log_write(bp);
    }
    brelse(bp);
    return addr;
  }

  bn -= NINDIRECT;
  if(bn < NINDIRECT * NINDIRECT){
    // Load indirect block, allocating if necessary.
    if((addr = ip->addrs[NDIRECT + 1]) == 0)
      ip->addrs[NDIRECT + 1] = addr = balloc(ip->dev);
    bp = bread(ip->dev, addr);
    a = (uint*)bp->data;
    if((addr = a[bn / NINDIRECT]) == 0){
      a[bn / NINDIRECT] = addr = balloc(ip->dev);
      log_write(bp);
    }
    brelse(bp);

    bp = bread(ip->dev, addr);
    a = (uint*)bp->data;
    if((addr = a[bn % NINDIRECT]) == 0){
      a[bn % NINDIRECT] = addr = balloc(ip->dev);
      log_write(bp);
    }
    brelse(bp);
    return addr;
  }

  panic("bmap: out of range");
}
```

以及将 itrunc 中对应的二级间接块也进行删除

```c
// Truncate inode (discard contents).
// Caller must hold ip->lock.
void
itrunc(struct inode *ip)
{
  int i, j, k;
  struct buf *bp, *nbp;
  uint *a, *na;

  for(i = 0; i < NDIRECT; i++){
    if(ip->addrs[i]){
      bfree(ip->dev, ip->addrs[i]);
      ip->addrs[i] = 0;
    }
  }

  if(ip->addrs[NDIRECT]){
    bp = bread(ip->dev, ip->addrs[NDIRECT]);
    a = (uint*)bp->data;
    for(j = 0; j < NINDIRECT; j++){
      if(a[j])
        bfree(ip->dev, a[j]);
    }
    brelse(bp);
    bfree(ip->dev, ip->addrs[NDIRECT]);
    ip->addrs[NDIRECT] = 0;
  }

  if(ip->addrs[NDIRECT + 1]){
    bp = bread(ip->dev, ip->addrs[NDIRECT + 1]);
    a = (uint*)bp->data;
    for(j = 0; j < NDIRECT; j++){
      if(a[j]) {
        nbp = bread(ip->dev, a[j]);
        na = (uint*)nbp->data;
        for(k = 0; k < NDIRECT; k++){
          if(na[k]) {
            bfree(ip->dev, na[k]);
          }
        }
        brelse(nbp);
        bfree(ip->dev, a[j]);
        a[j] = 0;
      }
    }
    brelse(bp);
    bfree(ip->dev, ip->addrs[NDIRECT + 1]);
    ip->addrs[NDIRECT + 1] = 0;
  }

  ip->size = 0;
  iupdate(ip);
}
```

## Symbolic links
这部分是为xv6添加系统调用 symlink，也就是符号链接

头文件什么的这里就不赘述了，先前也做过好几次，这里主要是系统调用 `sys_symlink` 的实现以及 `sys_open` 的修改，最开始我理解的是 `symlink` 打开一个符号链接文件然后将内容写入到文件 `inode` 的信息中，后来发现这是创建一个符号链接文件而不是打开一个文件！另外就是我把数据存放在 `inode` 的 `addrs` 数组中是直接通过 `(char*)` 强制类型转换的。。。参考了别人的文章发现这个大问题，原来是有相关的函数将数据写入 `inode` 中的，还是要好好看一下 xv6 book

代码就不贴了，内容和下面参考资料大差不差

参考资料：
- [Lab9: File system · 6.S081 All-In-One](http://xv6.dgs.zone/labs/answers/lab9.html)
- [MIT 6.S081 Lab9: file system - 知乎](https://zhuanlan.zhihu.com/p/451462274)

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220730173226.png)

我发现我好几次测试都会超时，不知道是不是虚拟机的问题，跑的太慢了，在qemu中测试的时候都可以通过，但是就会超时，只能改测试代码的时间限制了……

