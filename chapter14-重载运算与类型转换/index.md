# 《C++Primer》第十四章 重载运算与类型转换

# 第14章 重载运算与类型转换
## 14.1 基本概念
重载的运算符是具有特殊名字的函数：它们的名字由**关键字 operator** 和其后要定义的**运算符号**共同组成。和其他函数一样，重载的运算符也包含返回类型、参数列表以及函数体。

- 重载运算符函数的参数数量与该作用的运算对象数量一样多，一元运算符有一个参数，二元运算符有两个参数；
- 二元运算符左侧运算对象传递给第一个参数，右侧对象传递给第二个对象
- 除了 operator() 外，其他重载运算符不能含有默认实参
- 如果一个重载运算符是类的成员函数时，this 会绑定到左侧运算对象，参数数量会比运算对象少一个

重载运算符函数只能是一个类的成员，或者至少有一个类类型的参数，不能对内置类型定义重载运算符
```cpp
int operator+(int, int);//错误，不能重定义int的运算符
```

以下是可以重载或者不能重载的运算符：
![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220425151917.png)

#### 重载运算符的几种调用形式：
1. 可以间接的用运算符调用重载的运算符函数
2. 也可以像普通函数那样直接调用
```cpp
//一个非成员运算符函数的等价调用
data1 + data2;           //普通表达式
operator+(data1, data2); //等价的函数调用
```
3. 也可以像调用其他成员函数一样显示的调用成员运算符
```cpp
data1 += data2;         //基于调用的表达式
data1.operator+=(data2); //对成员运算符函数的等价调用
```

#### 某些运算符不应该被重载
- 某些运算符会指定运算对象的求值顺序，而关于这些运算对象求值顺序的规则无法应用到重载的运算符上

- 像逻辑与运算符、逻辑或运算符、逗号运算符的运算对象求值顺序无法保留下来，而 && 和 || 短路求值属性也无法保留

- 对于逗号和取地址运算符，用于类类型对象时已经定义了特殊的含义，所以不应该被重载

#### 使用内置类型一致的含义
设计一个类时，要考虑这个类提供哪些操作，然后再考虑这些操作设为普通函数还是重载的运算符。如果某些类逻辑上和运算符相关，它们适合定义成重载的运算符
- 如果类执行 IO 操作，定义移位运算符和内置类型的 IO 保存一致
- 类检查相等性操作，定义 `operator=`，同时也应该定义 `operator!=`
- 如果类有比较操作，例如 `operator<`，也该也定义其他关系的操作
- 返回类型通常情况下要和内置返回类型兼容：
	- 逻辑和关系运算符应该返回 bool
	- 算术运算符应该返回类类型的值
	- 赋值和复合运算符应该返回左侧对象的引用


#### 选择作为成员或者非成员
定义重载运算符时，首先要觉得声明为类的成员函数，还是一个普通的非成员函数，下面准则可以帮助判断：
1. 赋值（=），下标（[]），调用（()）和成员访问箭头（->）必须时成员
2. 复合类型一般为成员，但非必须
3. 改变对象状态的运算符或者与给定类型密切相关的运算符，如递增、递减、解引用通常为成员
4. 具有对称性的运算符可以转换任意一端的运算对象，如算术、相等性、关系和位运算，通常位普通的非成员函数

```cpp
string s = "world";
string t = s + "!";
string u =  "hi " + s;//如果+是string成员函数，这里会报错
```
实际上，string 将 + 定义为了普通成员函数，`"hi " + s` 等价于 `operator+=("hi ", s)`，就没有出现问题

## 14.2 输入输出运算符
### 14.2.1 重载输出运算符<<
通常情况下，输出运算符第一个形参是一个非常量 ostream 对象的引用，非常量是因为像流写入内容会改变其状态，引用类型是因为无法直接复制一个 ostream 对象（注：拷贝构造函数为 delete）

第二个形参是一个常量的引用，这个常量是需要打印出来的类类型，引用为了避免复制，常量是因为打印不会改变对象的内容

举个例子：

```cpp
ostream &operator(ostream &os, const &Sales_data &item) {
	os << item.isbn() << " " << item.units_sold << " "
	   << item.revenue << " " << item.avg_price();//末尾不需要再加换行符
   return os;
}
```

>通常输出运算符主要负责打印对象内容而不是控制格式，所以一般不打印换行符

#### 输入输出运算符必须是非成员函数
输入输出函数必须为非成员函数，不能是类成员函数，否则左侧运算对象将是类的一个对象

```cpp
Sales_data data;
data << cout;     //如果opeator<<是Sales_data的对象
```
如果输入输出运算符是Sales_data 的成员，它们也必须为 istream 或 ostream 的成员，当然我们不能为标准库定义成员

>注：其实这里感觉没看懂，如果像书上写的这样，data << cout 感觉是不是也可以输出？我自己也试了代码，确实可以输出，就是看着有点怪，要是深究起来，感觉书上写的话不够严谨

### 14.2.2 重载输入运算符>>
输入运算符第一个形参是读取流的引用，第二个形参是读入到对象的引用

例如：
```cpp
istream &operator>>(istream &is, Sales_data &item) {
	double price;
	is >> item.bookNo >> item.untis_sold >> price;
	if (is) {//检查是否输入成功
		item.revenue = item.units_sold * price;
	} else {
		item = Sales_data();//输入失败，对象初始为默认情况
	}
	return is;
}
```

#### 输入时的错误
执行输入运算符时可能发生以下错误：
1. 当流读取到错误类型的数据，后续操作都会失败
2. 当读取操作未达到文件末尾或者遇到输入流其他错误时也会失败

所以使用输入操作符时，需要判断是否有错误的情况发生，因为如果出现错误的情况可能发生在中间，这样的话前面的成员时正确的，而发生读取错误的地方后面的成员就和前面不匹配了


## 14.3 算术和关系运算符
通常情况下，算术和关系运算符定义为非成员函数允许左侧和右侧运算对象进行转换，形参都是常量的引用

算术运算符通常会计算两个对象并得到一个新值，这个值区别于任何一个运算对象，常常位于一个局部变量中，返回值应该为局部变量的副本作为结果，通常也会定义复合赋值运算符

```cpp
Book
operator+(const Book &lhs, const Book &rhs) {
	Book sum = lhs; 
	sum += rhs;     //复合赋值运算符
	return sum;
}
```

### 14.3.1 相等运算符
一般情况下只有当两个对象每一个数据成员都相等时，才认为他们时相等的

下面是个具体例子：
```cpp
bool operator==(const Book &lhs, const Book &rhs) {
	return lhs.price == rhs.price && lhs.name == rhs.name;
}

bool operator!=(const Book &lhs, const Book &rhs) {
	return !(lhs == rhs);
}
```

设计相等运算符函数基本准则如下：
1. 设计一个类判断两个对象是否相等的操作时，通常定义为 operator== 而非其他的像（equl等等）普通的命名函数
2. 如果类定义了 operator== ，则该运算符应该能判断一组给定对象是否含义重复数据
3. 相等运算符应该具有传递性，如 a == b 和 b == c 都为真，那么 a == c 也为真
4. 定义了 operator== 通常也要定义 operator!=
5. 相等和不相等运算符，通常具体写一个即可，另一个进行调用即可

### 14.3.2 关系运算符
对于关联容器和一些算法会用到小于运算符，此时可以定义 operator< 

但是一般情况下，关系运算符可能没有那么有必要，比如说上面的 Book 类，如果说定义小于关系的，具体内容如何比较，是先根据书名然后根据价格进行比较？还是说仅仅根据书名比较

一般情况下，对于不相等的对象，一个对象应该小于另一个对象，这样的话，定义关系运算符的时候，逻辑上就不是很清楚了

>如果存在唯一一种逻辑可靠的 < 定义，应该考虑定义 < 运算符，但是如果类还包括 == ，仅当< 的定义和 == 结果一致时才定义 < 运算符

## 14.4 赋值运算符
13章时已经介绍过拷贝赋值和移动赋值运算符，它们把一个对象赋值给另一个对象。我们还可以定义其他的赋值运算符，以使用别的类型作为右侧对象

#### 复合赋值运算符
通常把复合赋值运算符等赋值运算符都定义在类的内部，复合赋值运算符也应该返回左侧对象的引用

```cpp
Book &Book::operator+=(const Book &rhs) {
	price += rhs.price;//这里因为自己写的例子，语义上可能有些问题
	return *this;
}
```

## 14.5 下标运算符
下标运算符通常在一些容器中，可以让我们像访问数组那样的形式进行访问，一般会定义为 operator[]

- 下标运算符必须时成员函数
- 通常返回值为访问元素的引用，确保下标可以出现在赋值运算符任意一端
- 如果一个类包含下标运算符，通常会定义两个版本：
	- 一个返回普通引用
	- 另一个是类的常量成员并且返回常量引用

```cpp
class StrVec {
	std::string& operator[](std::size_t n) 
		{return elements[n];}
	const std::string& operator[](std::size_t) const 
		{return elements[n];}
private:
	std::string *elements;//指向数组首元素的指针
}
```

- 当 StrVec 是非常量时，可以给元素赋值
- 当对常量对象取小标时，不能为其赋值

```cpp
const StrVec cvec = svec;
if (svec.size() && svec[0].empty()) {
	svec[0] = "zero";//正确：下标运算符返回string的引用
	cvec[0] = "zip"; //错误：cvec取下标返回的为常量引用
}
```

## 14.6递增和递减运算符
一般迭代器类会实现递增运算符（++）和递减运算符（--），使得迭代器可以在元素序列中进行移动，因为它们改变了操作对象的状态，通常设为成员函数

>定义递增和递减运算符的类要同时定义前置版本和后置版本，且都为类的成员函数

#### 定义前置递增/递减运算符
==为了和内置版本保持一致，前置运算符应该返回递增或递减后对象的引用==

递增和递减运算符工作机理：
- 首先调用check 函数检查是否有效
- 如果有效，接着检查给定索引值是否有效
- check 函数没有发生异常，返回运算对象的引用
下面时具体例子：

```cpp
class StrBlobPtr {
public: //递增和递减运算符
	StrBlobPtr& operator++();//前置版本
	StrBlobPtr& operator--();
	//其他成员
}

StrBlobPtr& StrBlobPtr::operator++() {
	check(curr, "已经越界");
	++curr;   //curr向前移动一个元素
	return *this;
}

StrBlobPtr& StrBlobPtr::operator--() {
	--curr;   //curr向后移动一个元素
	check(curr, "已经越界");
	return *this;
}
```

#### 区分前置和后置运算符
因为前置和后置版本使用的是同一个符号，重载版本的名字也是相同的，运算对象的数量和类型也是相同的

所以为了解决这个问题，后置版本接受一个额外的但是不使用的 int 类型的参数，编译器会为这个形参提供一个值为 0 的实参

```cpp
class StrBlobPtr {
public: //递增和递减运算符
	StrBlobPtr& operator++(int);//后置版本
	StrBlobPtr& operator--(int);
	//其他成员
}

StrBlobPtr StrBlobPtr::operator++(int) {
	//这里无须检查有效性，调用前置版本的时候会检查
	StrBlobPtr ret = *this;//记录当前的值
	++*this;       //向前移动一个元素，前置++会检查有效性
	return ret;    //返回之前记录的状态
}

StrBlobPtr& StrBlobPtr::operator--(int) {
	//这里无须检查有效性，调用前置版本的时候会检查
	StrBlobPtr ret = *this;//记录当前的值
	--*this;       //向前移动一个元素，前置++会检查有效性
	return ret;    //返回之前记录的状态
}
```

这里主要需要理解内置类型前置版本和后置版本的区别（以int类型为例）
- ++i 首先会对 i 的值进行递增，然后返回 i 的值
- i++ 首先会返回 i 的值，然后再进行运算

```cpp
int sum = 0, i = 1;
sum = ++i; //此时sum的值为2
sum = i++; //此时sum的值为1
```

#### 显示调用后置运算符
如果要显示调用运算符的话，像之前那样利用函数调用的形式进行调用，但是注意必须传入一个整型参数

```cpp
StrBlobPtr p(a1); //p指向a1的vector
p.operator++(0);  //调用后置版本的operator++
p.operator++();   //调用前置版本的operator++
```

## 14.7 成员访问运算符
迭代器和智能指针类中常常用到解引用运算符（\*）和箭头运算符（->），例如：

```cpp
class StrBlobPtr {
public:
	std::string &operator*() const {
		auto p = check(curr, "dereference past end");
		return (*p)[curr]; //(*p)是对象所指的vector
	}
	std::string &operator->() const {
		return & this->operator*();//实际工作委托给解引用运算符
	}
	//其他成员
}
```

解引用运算符首先检查curr是否在作用范围内，如果是返回curr所指元素的引用，箭头运算符返回解引用结果元素的地址

#### 对箭头运算符返回值的限定
形如point->mem 的表达式，point必须是指向类对象的指针或者是重载了 operator-> 的类的对象

```cpp
(*point).mem;         //point是一个内置指针类型
point.operator()->mem;//point是一个类的对象
```

1. 如果 point 是指针，则会应用内置箭头运算符，等价于 `(*point).mem`
2. 如果 point 是一个定义了 operator->的类的一个对象，则使用 point.operator->() 的结果来获取 mem

## 14.8 函数调用运算符
如果一个类重载了函数调用运算符（就是()），则可以像调用函数一样使用该类的对象，下面是一个例子：

```cpp
struct absInt {
	int operator()(int val) const {
		return val < 0 ? -val : val;
	}
}

int i = -42;
absInt absObj;     //含有函数调用运算符的对象
int ui = absObj(i);//将i传递给absObj.operator()
```

>函数调用运算符必须是成员函数，一个类可以定义多个不同版本的调用运算符

如果类定义了调用运算符，则该类的对象称为**函数对象**，这些对象的行为像函数一样

#### 含有状态的函数对象类
函数对象类除了 operator() 之外也可以包含其他成员，这些成员被用于定制调用运算符中的操作，下面是个例子：

```cpp
class PrintString {
public:
	PrintString(ostream &o = cout, char c = ' ') : 
		os(o), sep(c) {}
	void operator()(const string &s) const 
		{os << s << sep;}
private:
	ostream &os;//用于写入的目的流
	char step;  //用于将不同输出隔开的字符
}

PrintString printer;
printer(s);
PrintString errors(cerr, '\n');
errors(s);
```

函数对象常常作为泛型算法的实参，例如可以用for_each 算法和 PrintString 类来打印容器的内容：

`for_each(vec.beign(), vec.end(), PrintString(cerr, '\n'));`

for_each 第三个实参是类型 PrintString 的一个临时对象，我们用 cerr 和 换行符初始化了改对象，程序调用 for_each 时，会把 vec 每个元素打印到 cerr 中，元素之间以换行符分割


### 14.8.1 lambda 是函数对象
使用 PrintString 对象作为 for_each 的实参，类似于使用 lambda 表达式，编译器会将 lambda 表达式 翻译成一个未命名类的未命名对象，举例如下：

```cpp
//根据单词长度进行排序，长度相同的会按照字典序排序
stable_sort(word.begin(), word.end(), 
			[](const string &a, const string &b)
			{ return a.size() < b.size();});
```

上面 lambda 表达式类似下面的一个未命名对象

```cpp
class ShorterString {
public:
	bool operator()(const string &s1, string &s2) const 
	{ return s1.size() < s2.size(); }
}
//替换上面的lambda表达式
stable_sort(word.begin(), word.end(), ShorterString());
```

#### 表示 lambda 及相应捕获行为的类
- 使用一个 lambda 表达式通过引用捕获变量时，程序确保 lambda 执行时引用所引的对象确实存在，编译器可以直接引用而无须在 lambda 产生的类中将其存储为数据成员
- 使用值捕获的变量会拷贝到 lambda 表达式中，这种 lambda 表达式产生的类必须为每个值捕获的变量建立对应的数据成员，同时创建构造函数，用捕获的变量进行初始化

```cpp
//获得第一个指向满足条件元素的迭代器，该元素满足size() >= sz
auto wc = find_if(word.begin(), word.end(), 
				  [sz](const string &a)
					  { return a.size() >= sz;});

//上面的lambda表达式产生的类像下面这样
class SizeComp {
	SizeComp(size_t n) : sz(n) {}
	bool operator()(const string &s) const 
		{ return s.size() >= sz; }
private:
	size_t sz;//该数据成员对应通过值捕获的变量
}

//使用像上面的函数对象时，必须提供一个实参
auto wc = find_if(word.begin(), word.end(), SizeCopm(sz));
```
lambda 表达式产生的类不含默认构造函数、赋值运算符和默认析构函数；它是否含有默认的拷贝/移动构造函数通常视捕获的数据成员类型而定

### 14.8.2 标准库定义的函数对象
标准库定义了一组表示算术运算符、关系运算符和逻辑运算符的类，每个类分别定义了一个执行与类名对应的调用运算符。

如puls 类定义了一个函数调用运算符用于执行 + 操作，modulus类定义了一个调用运算符执行二元 % 的操作

这些类都是模板形式，可以指定具体的应用类型，即对应调用运算符的形参类型

```cpp
plus<int> intAdd;               //执行int加法的函数对象
negate<int> intNegate;          //执行int取反的函数对象
int sum = intAdd(10, 20);       //sum = 30
sum = intNegate(intAdd(10, 20));//sum = -30
sum = intAdd(10, intNegate(10));//sum = 0
```

下面时标准库定义的函数对象：

| 算术               | 关系                  | 逻辑                |
| ------------------ | --------------------- | ------------------- |
| `plus<Type>`       | `equal_to<Type>`      | `logical_and<`      |
| `minus<Type`       | `not_equal_to<Type>`  | `logical_or<Type>`  |
| `multiplies<Type>` | `greater<Type>`       | `logical_not<Type>` |
| `divides<Type>`    | `greater_equal<Type>` |                     |
| `modulus<Type>`    | `less<Type>`          |                     |
| `negate<Type>`     | `less_equal<Type>`    |                     |

#### 算法中使用标准库函数对象
默认情况下排序算法使用 operator< 将序列按照升序进行排列，如果想执行降序的话，可以用 greater类型的对象
`sort(svec.begin(), sec.end(), greater<string>());`

注意：标准库规定的函数对象对于指针同样适用，如果比较两个无关指针会产生未定义的行为，而我们如果想比较指针内存地址来 sort 指针的 vector。直接比较会产生未定义的行为，而标准库函数对象则可实现这个目的

```cpp
vector<string*> nameTable;
//错误：nameTable中指针彼此之间没有关系，所以 < 将产生未定义行为
sort(nameTable.begin(), nameTable.end(), 
	 [](string *a, string *b) { return a < b;});
// 正确：标准库规定指针的less是定义良好的
sort(nameTable.begin(), nameTable.end(), less<string*>());
```

### 14.8.3 可调用对象与 function
C++中有几种可调用的对象：函数、函数指针、lambda 表达式、bind 创建的对象以及重载了函数调用运算符的类

这些不同类型的可调用对象可能共享一种**调用形式**，调用形式指明了返回类型以及实参类型，下面是个例子：

```cpp
//普通函数
int add(int i, int j) { return i + j; }
//lambda 表达式
auto mod = [](int i, int j) { return i % j; }
//函数对象类
struct divide {
	int operator()(int denominator, int divisor) {
		return denominator / divisor;	
	}
}
```

上面的几种可调用对象对参数执行了不同的算术运算，它们类型不相同，但是共享同一种调用形式 `int(int, int)`

我们如果用这些可调用对象构建一个简单的计算器，可以定义一个**函数表**用于储存这些可调用对象的指针。

可以通过 map 来实现，用运算符符号的string对象作为关键字，实现运算符函数作为值

```cpp
//构建运算符到函数指针的映射关系，函数接受两个int，返回一个int
map<string, int(*)(int, int)> binops;
//正确：add是一个指向正确类型的函数指针
binops.insert({"+", add});

//错误：mod不是一个函数指针
binops.insert({"%", mod});
```

上面的问题在于 mod 是一个 lambda 表达式，与 binops 的值类型不匹配

#### 标准库 function 类型
标准库中一个新的类型 function 可以解决上述问题，下面是 function 定义的操作：

![](https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/20220427101729.png)

function 是一个模板，创建一个具体 function 类型时需要指定 function 表示的对象的调用形式，如 `function<int(int, int)>` ，这里声明了一个 function 类型，它可以接受两个 int，返回一个 int 类型的可调用对象

```cpp
function<int(int, int)> f1 = add;     //函数指针
function<int(int, int)> f1 = divide();//函数对象类的对象
function<int(int, int)> f1 = [](int i, int j) //lambda
							{ return i * j; };
cout << f1(4, 2) << endl; // 6
cout << f2(4, 2) << endl; // 2
cout << f3(4, 2) << endl; // 8
```

使用这个 function 类型可以重新定义 map：

```cpp
map<string, function<int(int, int)>> binops = {
	{"+", add},                               //函数指针
	{"-", std::minus<int>()},                 //标准库定义函数对象
	{"/", divide()},                          //用户定义函数对象
	{"*", [](int i, int j) { return i * j; }},//未命名lambda表达式
	{"%", mod}                                //命名的lambda
}

```

map 包含5 个元素，虽然可调用对象类型各不相同，但是仍可以存储在同一个 function<int(int, int)> 类型中，这时可以通过索引 map 得到function 对象的引用

```cpp
binops["+"](10, 5);//add(10, 5);
binops["-"](10, 5);//minus<int>(10, 5)
binops["/"](10, 5);//divide对象调用运算符
binops["*"](10, 5);//调用lambda函数对象
binops["%"](10, 5);//调用lambda函数对象
```

#### 重载的函数与 function
我们变不能将重载函数名字存入 function 类型的对象中：

```cpp
int add(int i, int j);
Sales_data add(const Sales_data&, const Sales_data&);
map<string, function<int(int, int)>> binops;
binops.insert({"+", add}); //错误：哪个add？
```
解决上述二义性问题，可以通过一个函数指针，以及 lambda 表达式进行区分

```cpp
int (*fp)(int, int) = add;
binops.insert({"+", fp});//正确：fp指向一个正确的add版本
//正确：使用lambda来指定我们希望使用的add版本
binops.insert({"+", [](int a, int b) {return add(a, b);}});
```

## 14.9 重载、类型转换和运算符

