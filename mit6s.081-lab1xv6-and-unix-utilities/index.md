# MIT6S.081-lab1:Xv6 and Unix utilities

## sleep
比较容易，主要是看系统调用的掌握，注意main函数传入的参数如何处理

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

int main(int argc, char *argv[]) {
    if (argc != 2) {
      printf("Usage: sleep time\n");
      exit(1);
    }
    sleep(atoi(argv[1])); //直接调用sleep
    exit(0);
}
```

## pingpong
这个考察管道和fork的应用，首先对于管道 pipe，它读入一个长度为2的数组，分别作为管道的读入端和写入端，p[0] 表示写入端，p[1]表示读入端，可以用一个宏来定义，避免01区分不清的情况

然后就是创建一个子进程，父进程向管道写入一个字节后，子进程打印输出`<pid>: received ping`，然后子进程向父进程写入一个字节，父进程打印输出`<pid>: received pong`，这里我用了 `wait`，表示父进程等待子进程结束之后再打印输出

```c
//user/pingpong.c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

#define WRITE 0
#define READ 1

int main(int argc, char *argv[]) {
    if (argc >= 2) {
      printf("Usage: pingpong\n");
      exit(1);
    }
    char buf[2];        //一个缓冲区原来读写
    int p[2];           //文件描述符
    pipe(p);            //创建一个管道
    int pid = fork();   //创建一个子进程
    if (pid == 0) {
      read(p[READ], buf, 1);//从管道读取一个字节
      close(p[READ]);       //关闭管道读端
      printf("%d: received ping\n", getpid());

      write(p[WRITE], buf, 1);//向管道写入一个字节
      close(p[WRITE]);        //关闭管道写端
    } else {
      write(p[WRITE], buf, 1);//向管道写入一个字节
      close(p[WRITE]);        //关闭管道写端

      wait(0); //这里是关键，要到达子进程结束后父进程才继续执行下去

      read(p[READ], buf, 1);  //从管道读取一个字节
      printf("%d: received pong\n", getpid());
      close(p[READ]);         //关闭管道写端
    }
    exit(0);
}
```

## Primes
相比前两个稍微复杂一点，重点是理解给的这张图：

![](https://swtch.com/~rsc/thread/sieve.gif)

这张图就是先创建一个主进程，然后将数字通过管道依次写入子进程中，由子进程读取来进行处理

子进程再创建一个新的进程，子进程处理时先读到的第一个数字first，然后将后续读到的数字是first倍数的都舍去，将不是first倍数的数字都写入管道中，由子子进程进行递归处理

值得注意的是递归终止的情况，详细见代码，理解了上面的过程就比较好解决了

```c
//user/primes.c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

#define WRITE 1
#define READ 0

void primes(int p[]) {
    close(p[WRITE]);  //关闭原管道的写端

    int np[2]; 
    pipe(np);         //创建一个新的管道

    //两个数分别表示从管道读取的第一个数字，以及接下来的数字
    int first = 1, next = 0;
    //如果此时已经读取不到数字了，关闭管道并且退出
    if (read(p[READ], &first, 4) == 0) {
        close(p[READ]);
        exit(0);
    }
    //如果能读取到数字，打印输出
    printf("prime %d\n", first);
    
    int pid = fork();     //创建一个子进程
    if (pid == 0) {   
        close(np[WRITE]); //关闭新管道的写端
        primes(np);       //进入下一层递归调用
        close(np[READ]);  //关闭新管道的读端
    } else {
        close(np[READ]);  //关闭新管道的读端
        //从原管道中读取数字，read返回为0，表示已经读取完了
        while (read(p[READ], &next, 4) != 0) {
            //如果读取的数字不能整除读取第一个数字，写入下一层管道
            if (next % first != 0) { 
                write(np[WRITE], &next, 4);
            }
        }
        close(p[READ]);  //关闭原管道的读端
        close(np[WRITE]);//关闭新管道的写端
        wait((int*)0);   //等待子进程结束
    }
    exit(0);
}

int main(int argc, char *argv[]) {
    //参数不符合情况时候返回报错
    if (argc >= 2) {
      printf("Usage: primes\n");
      exit(1);
    }
    
    int p[2];
    pipe(p);            //创建一个管道

    int pid = fork();   //创建一个子进程
    if (pid == 0) {
        close(p[WRITE]);//关闭管道的写端
        primes(p);      //进行递归调用
    } else {
        close(p[READ]);//关闭管道的读端
        //依次将2-35写入到管道中，由子进程进行进一步处理
        for (int i = 2; i <= 35; ++i) {
            write(p[WRITE], &i, 4);
        }
        close(p[WRITE]);//关闭管道的写端
        wait((int*)0);  //等待子进程结束
    }
    exit(0);
}
```

## find
基本上就是在 `user/ls.c` 基础上改过来的，要理解其中 `char* fmtname(char *path)` 函数的作用，它传入一个文件名（包括前面的目录），然后取最后一个 `/` 之后的文件名，例如`a/b/c` 最后取出来的是 `c` 

```c
//user/find.c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"
#include "kernel/fs.h"

char*
fmtname(char *path)
{
  char *p;

  // Find first character after last slash.
  for(p=path+strlen(path); p >= path && *p != '/'; p--)
    ;
  p++;

  return p; //直接返回/下一个字符，ls中在结尾添加了空格，这里不需要
}

void
find(char *path, char *filename)
{
  char buf[512], *p;
  int fd;
  struct dirent de;
  struct stat st;
  //打开文件，如果失败直接报错
  if((fd = open(path, 0)) < 0){
    fprintf(2, "find: cannot open %s\n", path);
    return;
  }
  //查看文件的信息，失败则报错
  if(fstat(fd, &st) < 0){
    fprintf(2, "find: cannot stat %s\n", path);
    close(fd);
    return;
  }
  //st.type为此时文件的类型
  switch(st.type){
  //当fd指向的是文件类型，进行比较
  case T_FILE:
	//如果比较发现是要查找的文件名，打印输出
    if (strcmp(fmtname(path), filename) == 0) {
      printf("%s\n", path);
    }
    break;
  //如果fd指向的是目录类型，需要进一步处理
  case T_DIR:
    if(strlen(path) + 1 + DIRSIZ + 1 > sizeof buf){
      printf("find: path too long\n");
      break;
    } 
    strcpy(buf, path);  //将此时路径拷贝到buf上
    p = buf+strlen(buf);//p指向buf结尾的位置
	*p++ = '/';         //在buf结尾加上/，并且p指向下一个位置，先*p = '/'，再p++
	//读取目录中的每一个文件
    while(read(fd, &de, sizeof(de)) == sizeof(de)){
      //de.inum是所有文件的根目录的情况，.是当前目录本身，..是当前目录的父目录，都需要特判
      if(de.inum == 0 || strcmp(de.name, ".") == 0 || strcmp(de.name, "..") == 0)
        continue;
      //将此时文件名拷贝到p指向的位置，也就是buf后面接上文件名
      memmove(p, de.name, DIRSIZ);
      p[DIRSIZ] = 0; //字符串加上末端的0
      //打开此时的绝对路径，如果失败则跳过
      if(stat(buf, &st) < 0){
        printf("find: cannot stat %s\n", buf);
        continue;
      }
      //将此时绝对路径buf，进入下一层递归查找
      find(buf, filename);
      // printf("%s\n", fmtname(buf));
    }
    break;
  }
  close(fd);
}

int
main(int argc, char *argv[])
{
  if(argc == 2) {
		find(".", argv[1]);
	} else if (argc == 3) {
		find(argv[1], argv[2]);
	} else {
    fprintf(2, "Usage: find path file\n");
    exit(1);
	}
  exit(0);
}
```

## xargs
这个命令在 Linux 详细用法参考[xargs 命令教程 - 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2019/08/xargs-tutorial.html)

这里不需要设置额外的参数，只需要将标准输入中的内容读取到参数列表的后面，然后创建一个子进程执行即可

```c
//user/xargs.c

#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"
#include "kernel/param.h"

int main(int argc, char *argv[]) {
    if (argc < 2) {
		fprintf(2, "Usage: xargs cmd...\n");
		exit(1);
	}

    char buf[1024];
    char *argvs[MAXARG]; 
    
    // memcpy(&argvs[0], &argv[1], sizeof(argv[0]) * (argc - 1));
    for (int i = 1; i < argc; ++i) {
		argvs[i - 1] = argv[i];
	}
    while (1) {
        int size = 0; //表示从标准输入中读取的字节数目
        //从标准输入中一个字节一个字节读取
        while (read(0, &buf[size], 1) != 0) {
            //遇见/n 跳出
            if (buf[size] == '\n') break;
            ++size;
        } 
        //如果一个字节都没读取到，说明标准输入内容已经读取完了
        if (size == 0) break;
        buf[size] = 0; //buf结尾置为0
        //将从标准输入读取的一行内容放入到argvs末尾中
        argvs[argc - 1] = buf;
        //创建一个子进程，利用exec执行
        if (fork() == 0) {
            exec(argv[1], argvs);
            exit(0);
        } 
        wait(0); //等待父进程结束
        memset(buf, 0, 1024); //将buf清空
    }
    exit(0);    
}
```

这应该是第三次做lab1了，前两次都止步于lab3，这次打算完成学（抄）一遍

完结证明：

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220717224903.png)

参考资料：
[MIT 6.S081 2020 LAB1记录 - 知乎](https://zhuanlan.zhihu.com/p/346495822)

