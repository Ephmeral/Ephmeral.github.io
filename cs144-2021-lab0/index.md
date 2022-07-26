# CS144-2021: lab0


关于现代 C++，CS144建议以下几点：
- Use the language documentation at https://en.cppreference.com as a resource. 
- Never use `malloc()` or `free()`. 
- Never use `new` or `delete`.
- Essentially never use **raw pointers** (\*), and use “**smart” pointers** (unique ptr or shared ptr) only when necessary(You will not need to use these in CS144.)
- Avoid templates, threads, locks, and virtual functions. (You will not need to use these in CS144.)
- Avoid C-style strings (**`char *str`**) or string functions (`strlen()`, `strcpy()`). These are pretty error-prone. Use a **std::string** instead
- Never use C-style casts (e.g., (FILE \*)x). Use a C++ static cast if you have to (you generally will not need this in CS144).
- Prefer passing function arguments by **const** reference (e.g.: **const Address & address**). 
- Make every variable **const** unless it needs to be mutated. 
- Make every method **const** unless it needs to mutate the object. 
- Avoid global variables, and give every variable the smallest scope possible. 
- Before handing in an assignment, please run **make format** to normalize the coding style

感觉还是挺严格的，不知道实际工程项目当中是不是也有类似的要求

## 3.4 Writing webget
这个就是让我们熟悉一下 Socket 的 API 如何使用，刚开始不太理解，没仔细看实验手册给的链接

仔细看下给的 TCPSocket 的使用发现其实就是首先客户端和服务器建立连接，然后客户端向服务器发送请求，最后读取服务器响应的内容，代码如下：

注意：请求报文的换行是 `\r\n` 并且请求结束时要多加一个换行

```cpp
void get_URL(const string &host, const string &path) {
    // Your code here.
    TCPSocket sock;
    sock.connect(Address(host, "http"));
    sock.write("GET " + path + " HTTP/1.1\r\n");
    sock.write("Host: " + host + "\r\n");
    sock.write("Connection: close\r\n\r\n");
    // sock.shutdown(SHUT_WR);
    
    while (!sock.eof()) {
        cout << sock.read();
    }
    sock.close();
    // You will need to connect to the "http" service on
    // the computer whose name is in the "host" string,
    // then request the URL path given in the "path" string.

    // Then you'll need to print out everything the server sends back,
    // (not just one call to read() -- everything) until you reach
    // the "eof" (end of file).

    // cerr << "Function called: get_URL(" << host << ", " << path << ").\n";
    // cerr << "Warning: get_URL() has not been implemented yet.\n";
}
```
完成测试的样子：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220725130555.png)

## 4 An in-memory reliable byte stream
这个就是实现一个可靠的字节流，类似于管道，从一端写入，另外一端读取，这样的话用双端队列 deque 比较合适

下面是添加在头文件中的变量：
```cpp
class ByteStream {
  private:
    // Your code here -- add private members as necessary.
   std::deque<char> buffer;
   size_t cap;
   size_t size = 0;
   size_t read_len = false;
   size_t write_len = false;
   bool input_end = false; 
    // Hint: This doesn't need to be a sophisticated data structure at
    // all, but if any of your tests are taking longer than a second,
    // that's a sign that you probably want to keep exploring
    // different approaches.

    bool _error{};  //!< Flag indicating that the stream suffered an error.
    //...
}
```

然后是具体 `ByteStream` 的实现，比较重要的是 eof 的判断，也是参考了其他博客的思路，当字符流也就是 buffer 为空了，并且没有继续输入的字符也就是 input_end 结束了，就达到 eof 了

然后踩坑的地方：当实现完的时候，以为直接结束了，可以测试，然后一直通不过，也不知道啥原因，后来发现需要先 `make` 把错误代码改过来，并且编译一下，然后再`make check_lab0` 就可以测试了

然后就是我写代码过程中发现的错误：C++的列表初始化顺序要和变量定义的顺序一致（感觉之前C++白学了，笑）

```cpp
#include "byte_stream.hh"

// Dummy implementation of a flow-controlled in-memory byte stream.

// For Lab 0, please replace with a real implementation that passes the
// automated checks run by `make check_lab0`.

// You will need to add private members to the class declaration in `byte_stream.hh`

template <typename... Targs>
void DUMMY_CODE(Targs &&... /* unused */) {}

using namespace std;

ByteStream::ByteStream(const size_t capacity) : buffer(capacity), cap(capacity)  {
    buffer.erase(buffer.begin(), buffer.end());
}

size_t ByteStream::write(const string &data) {
    if (input_end) {
      return 0;
    }
    size_t pre = buffer.size();
    for (char c : data) {
        if (buffer.size() < this->cap) {
            buffer.push_back(c);
            this->write_len++;
        } else {
            break;
        }
    }
    return buffer.size() - pre;
}

//! \param[in] len bytes will be copied from the output side of the buffer
string ByteStream::peek_output(const size_t len) const {
    string ans;
    size_t i = 0;
    for (auto it = buffer.begin(); it != buffer.end() && i < len;
         ++it, ++i) {
      ans.push_back(*it);
    }
    return ans;
}

//! \param[in] len bytes will be removed from the output side of the buffer
void ByteStream::pop_output(const size_t len) { 
    for (size_t i = 0; i < len && !buffer.empty(); i++) {
        buffer.pop_front();
        this->read_len++;
    }
 }

//! Read (i.e., copy and then pop) the next "len" bytes of the stream
//! \param[in] len bytes will be popped and returned
//! \returns a string
std::string ByteStream::read(const size_t len) {
    string ans;
    size_t i = 0;
    for (auto it = buffer.begin();
         it != buffer.end() && i < len && !buffer.empty(); ++it, ++i) {
      ans.push_back(*it);
      buffer.pop_front();
      this->read_len++;
    }
    return ans;
}

void ByteStream::end_input() { input_end = true; }

bool ByteStream::input_ended() const { return input_end; }

size_t ByteStream::buffer_size() const { return buffer.size(); }

bool ByteStream::buffer_empty() const { return buffer.empty(); }

bool ByteStream::eof() const { return buffer.empty() && this->input_end; }

size_t ByteStream::bytes_written() const { return this->write_len; }

size_t ByteStream::bytes_read() const { return this->read_len; }

size_t ByteStream::remaining_capacity() const { return this->cap - buffer.size(); }

```

完结证明：

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220725102612.png)

## 小结
lab0 其实花了我挺久的，大概3-4小时，主要是刚开始没反应过来先 make 一下测试代码编译是否正确

