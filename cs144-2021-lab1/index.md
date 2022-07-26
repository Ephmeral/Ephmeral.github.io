# CS144-2021: lab1


## lab1 StreamReassembler
这个 lab 是为了将得到不同的字节流重新组合得到完整的连续的字节信息，我们知道tcp在传输过程中不是将一大段报文直接发送过去，而是分成一小段一小段再发出去，这样的话客户端就需要将不同片段的信息重新组合得到完整的tcp报文，这个实验就是需要我们将不同的片段重新组合一下

最关键的是理解给的那种图，关于字节信息的
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220726195216.png)
- 蓝色区域：已经接收并且已经排完序
- 绿色区域：已经排序但是还没有写入到字节流中
- 红色区域：已经接受但是没有排序

然后就是 capacity 这个字段，感觉有点像是流量控制（这里理论部分我掌握的不是很扎实，大概有这个印象），就是整体字节流大小最多为 capacity 这么大，然后再接受字节流的时候最多宽度为 capacity

我最开始的想法，先维护一个上一个已经排完序的字节流位置 `_endid`，然后是利用一个哈希表记录每个位置 `index` 到字符串 `data` 的映射，这样的话对于每次输入的字符串我们可以通过字符串首字母所在的下标（指整体分段前的下标）和 `_endid` 来比较看属于哪个区域

- 如果 `index > _endid` 的话，说明此时字符串属于红色区域，暂时存储在哈希表中待处理
- 如果 `index <= _endid`，说明此时有一部分字符串是从 `_endid` 开始，这样我们将合适的部分写入给定的 `_output` 也就是我们lab0 实现的 `ByteStream`

然后就有了我第一次尝试，下面代码虽然只有两个测试用例通不过，但是存在较大的问题，这里只是记录一下最开始我的想法（可以忽略这部分代码）

```cpp
#include "stream_reassembler.hh"

// Dummy implementation of a stream reassembler.

// For Lab 1, please replace with a real implementation that passes the
// automated checks run by `make check_lab1`.

// You will need to add private members to the class declaration in `stream_reassembler.hh`

template <typename... Targs>
void DUMMY_CODE(Targs &&... /* unused */) {}

using namespace std;

StreamReassembler::StreamReassembler(const size_t capacity) : 
    _maps(), 
    _endid(0), 
    _output(capacity), 
    _capacity(capacity),
    eof_index(0),
    _unassembled_len(0) {}
//merge的意思就是可能在插入新的字符串之后之前未排序部分可能空隙刚好补上
//所以这时候根据index从小到达枚举，将合适的字符串长度写入_output中
void StreamReassembler::merge() {
    size_t real_id, real_len;
    //枚举哈希表中所有键值对，默认根据index从小到大排序
    for (auto it = _maps.begin(); it != _maps.end(); ) {
        size_t index = it->first;
        string data = it->second;
        // 如果此时字符串起始位置小于等于上一次最后一个下标位置
        //并且字符串最终位置大于上一次最后一个下标位置
        //说明此时有部分/全部字符可以写入output中
        if (index <= this->_endid && index + data.length() >= this->_endid) {
            real_id = _endid - index;
            // 防止超过cap的情况 
            //！注意这里其实有点问题，因为最开始我把capacity当成了从那张图stream start开始到结尾是capcity，后来才发现是从first unread开始
            real_len = min(data.length() - real_id, _capacity - _endid);
            _output.write(data.substr(real_id, real_len));
            _unassembled_len -= real_len;
            _endid += real_len;
            ++it; //这里迭代器需要先加一下再删除，不然对应迭代器删除了，无法到达下一个迭代器位置
            _maps.erase(index);
        } else if (index < this->_endid && index + data.length() < this->_endid) {
	        //这个分支其实多余了
            ++it;
            _maps.erase(index);
        } else {
            ++it;
        }
    }
}

//! \details This function accepts a substring (aka a segment) of bytes,
//! possibly out-of-order, from the logical stream, and assembles any newly
//! contiguous substrings and writes them into the output stream in order.
void StreamReassembler::push_substring(const string &data, const size_t index, const bool eof) {
    // 如果字符串最后一个位置都小于上一次结尾的下标的话，说明肯定已经写入output了，直接删除即可
    if (index < this->_endid && index + data.length() < this->_endid) {
        return;
    }
    if (!_maps.count(index) || _maps[index].length() < data.length()) {
        _maps[index] = data;
    } 
    
    _unassembled_len += data.length();
    merge();
	
	//这里是参考别人的思路，后文有链接
    if (eof) {
        eof_index = index + data.size() + 1; // 注意，这里的+1很重要
    }
    if (_output.bytes_written() + 1 == eof_index) { // 和上面的+1对应上
        _output.end_input();
    }
}

//这里我的想法就是，对于哈希表中的字符串都是没有写入output中的，也就是未排序红色部分，然后将他们重叠部分去掉，最后的长度就是没有组装的长度
size_t StreamReassembler::unassembled_bytes() const { 
    size_t total = 0;
    size_t preid = 0, prelen = 0;
    for (auto it = _maps.begin(); it != _maps.end(); ++it) {
        size_t curid = it->first, curlen = it->second.length();
        if (curid < preid + prelen) {
            total -= preid + prelen - curid; //减掉重叠部分
        }
        total += curlen;
        preid = curid;
        prelen = curlen;
    }
    // return total;
    return total;
}

//这里我就理解错了，以为是整体输出的字节流的为空
//其实是看未组装的部分是否为空
bool StreamReassembler::empty() const { return _maps.empty() && _output.buffer_empty(); }

```

下面是上面对应头文件的声明

```cpp
class StreamReassembler {
  private:
    // Your code here -- add private members as necessary.
    std::map<size_t, std::string> _maps;
    size_t _endid;
    ByteStream _output;  //!< The reassembled in-order byte stream
    size_t _capacity;    //!< The maximum number of bytes
    size_t eof_index;
    size_t _unassembled_len;
    void merge();
    //...
}
```

第一次的尝试有两个测试用例过不了

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220726180153.png)

这里感觉问题挺多的，所以有了第二次尝试，参考了这两篇文章的思路
- [Stanford CS144 Lab1 小结 - 知乎](https://zhuanlan.zhihu.com/p/394489794)
- [CS144-斯坦福大学计算机网络-lab1实现 - 知乎](https://zhuanlan.zhihu.com/p/406919057)

第二次尝试，我用的是两个数组，一个数组记录读入的字符串内容，另一个数组表示对应位置的字符串是否有效（避免读入的是空字符串情况），下面是代码

```cpp
class StreamReassembler {
  private:
    // Your code here -- add private members as necessary.
    std::vector<char> _bufstr; //缓存字符串
    std::vector<bool> _flag;   //标记字符串对应下标是否有效
	size_t _firstid;           //记录第一次未读取字符串的位置
    ByteStream _output;  //!< The reassembled in-order byte stream
    size_t _capacity;    //!< The maximum number of bytes
    size_t _eof;            //标记整体结束位置
    size_t _unassembled_len;//未组装的字节长度
    //...
}
```

```cpp
//初始化
StreamReassembler::StreamReassembler(const size_t capacity) : 
    _bufstr(capacity, '\0'), 
    _flag(capacity, false),
    _firstid(0), 
    _output(capacity), 
    _capacity(capacity),
    _eof(0),
    _unassembled_len(0) {}

//! \details This function accepts a substring (aka a segment) of bytes,
//! possibly out-of-order, from the logical stream, and assembles any newly
//! contiguous substrings and writes them into the output stream in order.
void StreamReassembler::push_substring(const string &data, const size_t index, const bool eof) {
	//得到字符读取的开始和结束的位置
    size_t start = max(index, _firstid);
    //注意这里用的是_output剩余的大小，而不是_capacity
    size_t end = min(index + data.length(), _firstid + _output.remaining_capacity());

	//从每个位置开始遍历，将对应字符写入缓存bufstr中
    for (size_t i = start; i < end; i++) {
        //这里是实际写入bufstr的位置，形成一个环
        size_t real_id = i % _capacity;
        if (_flag[real_id]) continue;
        _bufstr[real_id] = data[i - index];
        _flag[real_id] = true;
        ++_unassembled_len;
    }

	//找到真正写入的字符串结尾位置
    size_t real_end = _firstid;
    while (_flag[real_end % _capacity] ==true && real_end < _firstid + _capacity) {
        ++real_end;
    }

	//如果字符串能够写入output中
    if (real_end > _firstid) {
	    //从bufstr中得到写入的字符串
        std::string write_str(real_end - _firstid, 0);
        for (size_t i = _firstid; i < real_end; ++i) {
            write_str[i - _firstid] = _bufstr[i % _capacity];
        }

		//实际写入后得到的大小（可能有超过capcity的情况
        size_t n = _output.write(write_str);
        for (size_t i = _firstid; i < _firstid + n; ++i) {
            _flag[i % _capacity] = false;
        }

		//第一次未读入的位置往后偏移 n
        _firstid += n;
        //未组装的长度 - n
        _unassembled_len -= n;
    }
    //所有的读取结束时
    if (eof) {
        _eof = index + data.size() + 1; // 注意，这里的+1很重要
    }
    if (_output.bytes_written() + 1 == _eof) { // 和上面的+1对应上
        _output.end_input();
    }
}

size_t StreamReassembler::unassembled_bytes() const { 
    return _unassembled_len;
}

bool StreamReassembler::empty() const { return unassembled_bytes() == 0; }

```

完结证明：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220726202711.png)

## 小结
lab1 理解了需要实现的内容就不是太难，但是想要完整的写对代码就有点困难了，很多边界条件啥的一开始都没考虑清楚，部分内容的理解上有有点出入，后面还是需要先仔细读一下实验指导书的内容再开始写代码

