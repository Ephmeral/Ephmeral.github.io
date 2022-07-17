# NJU-ICS2020 | PA3-1 小结

## 前言
PA3 存储管理，3-1对cache进行了简单的模拟，3-2开启了类似80386的保护机制，3-3实现了分页机制（虚拟地址转换）

PA4-1是异常控制流，4-2是外设和IO的模拟

## PA 3-1 Cache的模拟
cache原理部分可以看下[Cache 的基本工作原理](https://ephmeral.github.io/cache-的基本工作原理/)

具体实验要求如下：
1. cache block存储空间的大小为64B
2. cache存储空间的大小为64KB
3. 8-way set associative
4. 标志位只需要valid bit即可
5. 替换算法采用随机方式
6. write through
7. not write allocate

采用的是8路组相联，随机替换算法和回写法，回写分配法

由于 cache 大小 64KB，每个 cache block 大小是 64B，所以总共有 1024 个 cache 行，也就是可以定义一个1024大小的 CacheLine 数组

关于 CacheLine 的定义如下：
```c
typedef struct cacheLine {
	bool valid;       //     1位  标志位                                                                     
	uint32_t tag;     //tag  19位 32 - 6 - 7
	uint8_t data[64]; //data 6位  64 = 2^6  
}CacheLine;
```
关于主存块地址的分析：
- 数据大小是64B，而 64 = 2^6，所以对应主存块中的块内地址有6位
- 而cache总共2^10 = 1024 行，每组分成了 2^3 = 8行，总共也就有2^(10 - 3) = 128 组，则对应主存块中 cache 组号有 7 位
- 所以对于32位地址的主存来说，最后标志位有19位

详细有注释的实现代码如下：（注意cache读写跨行的情况）

```c
#include "memory/memory.h"

#include <stdlib.h>
#include <time.h>

CacheLine caches[1024];

// init the cache
void init_cache()
{
	// implement me in PA 3-1
	// 1024 cache line
	for (int i = 0; i < 1024; ++i) {
		caches[i].valid = false;
		caches[i].tag = 0;
		memset(caches[i].data, 0, 64);
	}
	
}

// write data to cache
void cache_write(paddr_t paddr, size_t len, uint32_t data)
{
	uint32_t addr = paddr & 0x3f; // trancut lower 6 bit
	uint32_t line_id = (paddr >> 6) & 0x7f; // cacheline group id
	uint32_t tag = paddr >> 13; //tag
	int k = line_id * 8; //record the hit caches
	for (int i = k; i < k + 8; i++) {
		//如果命中
		if (caches[i].valid == true && caches[i].tag == tag) {
			if (addr + len <= 64) {
				//update block 将数据data写入主存中
				memcpy(hw_mem + paddr, &data, len);
				//update cache line 并且更新cache行中的数据
				memcpy(caches[i].data + addr, &data, len);
				caches[i].tag = tag;
				caches[i].valid = true;
			} else {
				int cur_len = 64 - addr; //当前行剩余长度
				int next_len = len - cur_len;//下一行读取的长度
				memcpy(hw_mem + paddr, &data, len);
				cache_write(paddr, cur_len, data);
				cache_write(paddr + cur_len, next_len, data>>(cur_len * 8));
			}
			return;
		} 
	}
	//没有命中,只写入主存中，不在cache行中添加
	memcpy(hw_mem + paddr, &data, len);
}

// read data from cache
uint32_t cache_read(paddr_t paddr, size_t len)
{
	uint32_t addr = paddr & 0x3f; // 块内地址，低 6 位
	uint32_t line_id = (paddr >> 6) & 0x7f; // cache组内号
	uint32_t tag = paddr >> 13; //tag标志位
	int cnt = 0, k = line_id * 8; //k是对于组的起始位置，由于8个一组，第line_id组个cache行对应的即为实际的第8*line_id个
	uint32_t ret = 0; //返回地址
	//枚举组内8个cache行
	for (int i = k; i < k + 8; i++) {
		//如果cache有效
		if (caches[i].valid == true) {
			//cnt用来记录一组中cache行有效的个数
			//cnt==8说明这组cache满了，需要采取替换策略
			cnt++;
			//并且标志位也对应，也即是命中的情况
			if (caches[i].tag == tag) {
				//没有跨行情况
				if (addr + len <= 64) {
					//从最后一个字往前读取
					for (int t = len - 1; t >= 0; t--) {
						if (t != len - 1) ret <<= 8;
						ret += caches[i].data[addr + t];
					}
					break;
				} else { //跨行的情况
					int cur_len = 64 - addr; //当前行剩余长度
					int next_len = len - cur_len;//下一行读取的长度
					//将这一行所有的地址都读取完
					ret = cache_read(paddr, cur_len);
					//从下一行开始地址开始读取 next_len 个字节
					uint32_t next_data = cache_read(paddr + cur_len, next_len);
					//移动8 * cur_len位，再加上上一行的数据
					next_data <<= 8 * cur_len;
					ret += next_data;
					//printf("now 跨行, and ret = %u\n", ret);
				}
				return ret;
			}
		}
	}
	//cache group is full and not hit, random replace
	//cnt == 8 说明待读取的cache组已经满了，需要随机算法换出
	if (cnt == 8) {
		//ret = hw_mem_read(paddr, len);
		//从主存块中读取内容，并设置到ret中
		memcpy(&ret, hw_mem + paddr, len);
		//printf("cache满了情况下 ret = %u\n", ret);
		srand((unsigned)time(NULL));   //设置随机数种子
		int insert = k + (rand() % 8); //找到随机替换的位置
		//将主存块中内容写入cache行中，注意是一整行64
		memcpy(caches[insert].data, hw_mem + paddr - addr, 64);
		caches[insert].valid = true;
		caches[insert].tag = ret >> 13;
	} else { //cache缺失, 并且没有满
		//从主存块中读取内容，并设置到ret中
		memcpy(&ret, hw_mem + paddr, len);
		//printf("cache缺失情况下 ret = %u\n", ret);
		//将主存块中内容写入cache行中，注意是一整行64
		for (int i = k; i < k + 8; i++) {
			if (caches[i].valid == false) {
				memcpy(caches[i].data, hw_mem + paddr - addr, 64);
				caches[i].valid = true;
				caches[i].tag = ret >> 13;
			}
		}
	}
	return ret;
}
```

## 小结
PA3-1算是完整的完成了，对于后面的实验内容，发现PA3-2虽然能跑起来，但是好像实现的有问题（自己写的太简单了）。PA3-3之后的内容也没很认真的完成，到了3-3开启虚拟地址空间后，由于前面存在的一些指令的bug，导致PA3-3在运行的时候一直出现段错误，一时也没找到解决的办法，PA4就在别人代码基础上跑了一下

至此PA先告一段落了，后面有机会打算学习一下jyy版本的PA，顺便补一下计算机系统基础理论知识

