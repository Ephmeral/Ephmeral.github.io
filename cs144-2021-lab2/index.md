# CS144-2021 lab2

lab2 主要是实现 TCPReceiver，就是将接收到的 TCPSegment （TCP报文段）写入到我们之前实现的流当中

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/202208012133802.png)

## 3.1 Translating between 64-bit indexes and 32-bit seqnos
我们在lab1实现的 StreamReassembler 重组字符串，每个字符串对应流当中的索引是 64 位的，但是在 TCP 报文段头部中，确认序号（sequence number/seqno）是 32 位的，所以对于大于 32 位的索引我们就无法用 32 位的确认序号存储，就需要进行一定的转换，大于 32 位的索引我们将其对 2^32 取模

实验指导给了个例子，我们要做的就是将 seqno(32位) 和 absolute seqno(64位) 之间进行转换

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/202208012144056.png)

64 位的 absolute seqno 转为 32位的 seqno 比较好办，直接取模即可

```cpp
WrappingInt32 wrap(uint64_t n, WrappingInt32 isn) {
    uint64_t res = (n + static_cast<uint64_t> (isn.raw_value())) % (1UL << 32);
    return WrappingInt32{static_cast<uint32_t> (res)};
}
```

但是对于 32 位的 seqno 转换为 64位的 absolute seqno 就稍微麻烦点，因为比如现在有一个对 5 取模后得到为 3 的数，那么我们可以推出这个数如果可以 8，也可以是 13、18、23、28...

这里也是同样的道理，这里的解决办法就是给一个数，然后根据这个数找到最近的结果，对于上面 5 的例子，如果我们给定 10 的话，那么最近的为 8 （10-8 =2，13 - 10 = 3）

回到实验部分，unwrap 的实现首先我们根据 isn 来找到第 n 个的绝对位置 absqeno（注意这里可能出现负数的情况，但是对于无符号数，负数会变成一个很大的正数），然后我们根据得到的绝对位置和给定的 checkpoint 进行比较，分别相减得到低32位结果和高32位结果，如果低32位小于2^32 / 2 的话 `absqeno + k * 2^32` 即是离checkpoint 最近的位置，如果大于2^32 / 2 的话 `absqeno + (k+1) * 2^32` 即是离checkpoint 最近的位置

我画了一个图大概理解一下，就是如果absqeno 和 checkpoint 的低32位差值小于一半的 2^32，那么他们低32位的差加上高32位的差得到的结果就是最小的，如果两个差值大于 2^32 的一半那么 absqeno + 2^32 就是最接近 checkpoint 的（图可能有点抽象，建议和代码结合理解一下）

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/202208012234949.png)

```cpp
uint64_t unwrap(WrappingInt32 n, WrappingInt32 isn, uint64_t checkpoint) {
    uint64_t absqeno = static_cast<uint64_t>(n.raw_value() - isn.raw_value());
    if (checkpoint <= absqeno) return absqeno;
    uint64_t k = (checkpoint - absqeno) >> 32;
    uint64_t lowbit = ((checkpoint - absqeno) << 32) >> 32;
    if (lowbit < (1UL << 31)) {
        return absqeno + k * (1UL << 32);
    }
    return absqeno + (k + 1) * (1UL << 32);
}
```

## 3.2 Implementing the TCP receiver
这个部分就是实现 TCP receiver，感觉最关键的理解要做的 receiver 要做的事情，reveiver 将每次得到的 TCP 报文段根据标志位来决定是否写入 StreamReassembler 中（也就是lab1实现的流组装器），如果要写入的话需要确定写入的下标

先看一下 TCP 首部几个标志位的含义：
- ACK：确认标记，确认序号有效
- SYN：同步标记，表示发起一个新的连接
- FIN：结束标记，表示释放一个连接

首先在 TCPReceiver 中定义一个变量 `_is_syn` 来判断是否发起了新的连接，如果有将报文首部中的序列号（seqno）存入到另外一个变量 `_isn` 中（这也是初始序号）

```cpp
class TCPReceiver {
    //! Our data structure for re-assembling bytes.
    StreamReassembler _reassembler;

    //! The maximum number of bytes we'll store.
    size_t _capacity;
    bool _is_syn = false;
    WrappingInt32 _isn{0};
   public:
   ...
};
```

然后是报文段接收函数的实现，详细看注释：
```cpp
void TCPReceiver::segment_received(const TCPSegment &seg) {
	//得到TCP报文段的头部
    TCPHeader header = seg.header();
    bool eof = header.fin; //eof标记根据FIN标志来决定
    //在发起新的连接之前，所有报文段都丢弃
    if (_is_syn == false && header.syn == false) {
        return;
    }
    //得到序列号
    WrappingInt32 seqno = header.seqno;
    //如果SYN标记位为真，表示发起一个新的连接
    //此时设置对应的变量，序列号也要+1
    //序列号加1的原因是syn标记位也占了一位，但是不会写入流当中
    if (header.syn) {
        _is_syn = true;
        _isn = header.seqno;
        seqno = seqno + 1;
    }
	
	//获取当前已经写入流当中的字节数，用来推导seqno的下标
    uint64_t lastIndex = stream_out().bytes_written();
    //利用前面实现的unwrap得到待写入数据的起始下标
    uint64_t index = unwrap(seqno, _isn, lastIndex) - 1;
    //将数据部分写入流当中
    _reassembler.push_substring(seg.payload().copy(), index, eof); 
}
```

对于 `ackno()` 函数，如果没有发起新的连接直接返回空，否则的话，如果已经发起新的连接了，将返回下一个准备接收的确认号（这里需要根据加上标记位对应的长度）

```cpp
optional<WrappingInt32> TCPReceiver::ackno() const { 
    //已经发起新的连接了
    if (_is_syn) {
		//这里需要加上SYN标记位的长度
		size_t ack = stream_out().bytes_written() + 1;
		//如果结束了还需要加上FIN标记位的长度
		if (stream_out().input_ended()) ack++;
return wrap(ack, _isn);
    }
    //没有发起连接，返回空
    return {}; 
}
```

参考资料：
- [CS144计算机网络 Lab2 | Kiprey's Blog](https://kiprey.github.io/2021/11/cs144-lab2/)
- [Stanford CS144 Lab2 小结 - 知乎](https://zhuanlan.zhihu.com/p/396255962)

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/202208012305968.png)

这个实验代码量不多，但是写正确不是那么容易，我最开始没有理解到位，也是参考了别人的博客才搞清楚要具体干什么，另外就是对TCP三次握手四次挥手不是特别的熟悉，这些标志位也是，需要学习一下理论知识，不然上来直接做实验就是一头雾水

