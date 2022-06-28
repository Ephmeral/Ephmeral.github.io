# NJU-ICS2021 PA2-1实验小结

## 前言
PA2-1 需要实现每个指令的解码和执行，具体需要在项目根目录下先执行 make test_pa-2-1，查看当前缺少哪条指令，然后去实现对应指令即可，直到所有测试用例通过（除了最后一个test_float）

## 指令的查阅过程
下面是开始做实验时候，记录的查阅手册过程（仅供参考）

除了已经通过的 `mov` 测试用例，下一个 `mov-cmp` 的测试用例，`make_test-pa-2-1` 出现报错，然后定位到 `0x83 f8 01 cmp $0x1, %eax` 这条指令

下面查阅手册：
- 这条指令前面不是 `0x66` 说明 `0x83` 即为 `opcode`
- 查阅 i-386 手册附录 A，找到 `0x83` 对应的的指令为 `Grp1 Ev, Iv` 对应到 Nemu 中即为 `Grp1 Iv, Ev`
- 这里因为是一组`Grp1 Iv, Ev`，所以需要继续查表，先看一下下一位 `0xf8` 的寄存器对应的为111
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220621150355.png)
- 反过来查找Grp1对应的 111位置，发现为 `cmp` ，也符合反汇编的结果
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220621150540.png)

- `opcode` 后面跟着的是 `ModR/M` 字节，则这里 `0xf8` 即为 `ModR/M` 字节，查阅i386手册第17.2.1节。其解析方式对应Table 17-3 ，`0xf8`这个`ModR/M`字节的对应的是 `EAX/AX/AL` 这里应该对应 `%eax` 寄存器（反汇编结果显示的也比较清楚）
- 最后 `0x01` 是个立即数，最后对应 AT&T 格式为
```c
cmp %eax, $0x1
```

接着查阅 `cmp` 指令对应的功能，可以看见对于 83这条指令主要是将一个==8 位==立即数存入寄存器或者地址中

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220621150737.png)

这里强调一下 8 位立即数，因为在这里我弄错了，创建立即数时用的时全局的 `data_size`，导致卡了两三个小时一直没发现错误

此外我在返回长度的时候，返回的是 `len + data_size / 8`，也一直没发现问题，最开始给我报错的地方是将一个指令切分了，比如说这里报错的 `eip = 0x30053 `

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220621151256.png)

而这里根本不是对应一个指令地址的开始，而是 `0x30050` 中间的部分，如下图所示：（我还去查了以 `0x00` 为开始的指令，改了改 `add `这条命令，结果发现根本就是 `cmp `写错了，导致取地址的时候取的不是某条指令开头的位置！！！）

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220621151514.png)

发现问题后，很快就解决了，`cmp` 的实现，这里可以使用PA-1 中实现的 `alu_sub` 函数，手册上说了 `cmp` 将源操作数减去目的操作数，但是并不保留结果，只改变标志位（CF、OF这些）

最后返回长度的时候，注意要将 len + 1 (因为还有一个8位的立即数)

## 个人踩坑点

下面是遇见的一些坑：
1. 报错的地方在某条指令中间，很有可能是前面的指令返回地址没有写正确
2. 有一些需要进行符号拓展，例如 `cmp`、`sub`这些
3. `test` 指令最后的结果需要丢弃，而不是写入 `DEST` 中，这里详细看一下手册，如果没看下面文字部分的话，就会以为需要写入 `DEST` 中
4. 指令在实现的时候，尽可能的使用框架代码提供的宏，出错的概率会小很多，其次可以利用 PA1 中已经实现的整数运算
5. 实现一条指令的同时，可以把类似的指令同时实现了，大部分指令都挺有规律的，另外感觉有一个小彩蛋，如果打开`opcode_ref.c` 这个文件，其实会发现大部分指令的格式已经写好了

## 部分指令的实现
个人感觉最难实现的是 `call`、`ret`、`push` 和 `pop` 这几个指令

首先看一下 `push` 指令的实现，`push` 指令是将一个寄存器/地址/立即数放入到栈中，看一下手册上的描述

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220628111901.png)
push 指令，先需要将栈帧腾出来相应的位置（即`ESP -= 2 或 4`），然后将待写入的数据 SOURCE 写到栈帧对应的地址上，最开始我只是简单的先将 `cpu.esp -= 2 或 4`，然后将 `source` 赋值给 `cpu.esp`，后来发现不对，是需要写入到 `cpu.esp` 对应的地址中，这样的话需要额外创建一个 `OPERAND` 来进行操作，下面是主要的代码：
```c
  6 static void instr_execute_1op() {
  7     operand_read(&opr_src);
  8 
  9     if (data_size == 16) {
 10         cpu.esp -= 2;
 11     } else if (data_size == 32) {
 12         cpu.esp -= 4;
 13     }
 14 
 15     OPERAND esp;
 16     esp.type = OPR_MEM;
 17     esp.data_size = data_size;
 18     esp.addr = cpu.esp;
 19     esp.sreg = SREG_SS;
 20     esp.val = sign_ext(opr_src.val, opr_src.data_size);
 21 
 22     operand_write(&esp);
 23 }
```
其实如果弄清楚手册上 `(SS:SP)` 这种带括号的是写入到地址当中就不容易出错了，就类似是一个指针 `int *p = &a;`，这里 `p` 类似于栈帧（ESP），然后我需要将数据写入到 `p` 所指的那个地址当中，也就是变量 `a` 的地址

目前我只实现了 `E8` 这条指令，也就是 `call near`，看一下这条指令的描述

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220628111511.png)
可以看到首先需要将当前指令执行的位置（也就是 EIP）的下一个指令放入到栈中，然后 EIP 再加上一个立即数地址，Push EIP 前面已经提过思路，具体代码如下，其实很类似：
```c
//push(IP)
  7     OPERAND esp;
  8     esp.data_size = data_size;
  9     esp.type = OPR_MEM;
 10 
 11     cpu.esp -= data_size / 8;
 12 
 13     esp.addr = cpu.esp;
 14     esp.val = eip + 1 + data_size / 8; //注意这里是当前指令的下一个指令地址，所以需要额外加上 data_size/8
 15     //printf("in call_near eip is %x\n", eip);
 16     operand_write(&esp);
```

然后是加上一个立即数，这里在 jmp_near 指令实现上已经给出类似的思路了
```c
 18     //EIP = EIP + rel16/32
 19     OPERAND rel;
 20     rel.type = OPR_IMM;
 21     rel.sreg = SREG_CS;
 22     rel.data_size = data_size;
 23     rel.addr = eip + 1;                                                     
 24 
 25     operand_read(&rel);
 26 
 27     int offset = sign_ext(rel.val, data_size);//符号拓展
 28     cpu.eip += offset; //偏移量，加上立即数的值
 29		return 1 + data_size / 8;
```

`ret` 指令注意取出栈帧的值后赋给 `eip`，最后返回值不需要返回额外的长度，返回 0 即可

## 小结
PA2-1 总共花了约 35h，最开始折磨在每条指令实现上，后面慢慢发现框架代码提供的宏，比起自己写要准确的多，然后是一些指令的理解没有到位，尤其是后面说的 `call`、`ret`、`push` 和 `pop` 这几个，导致直接出现死循环的情况，也不知道是哪个地方实现错了，还有就是有的指令实现没有进行符号拓展，最后虽然通过了测试用例，但是感觉还是有很多细节部分没有做的很好，还需要继续加油~
