# 《C++Primer》| 第十六章 模板与泛型编程


## 16.1 定义模板
如果希望定义两个函数，来比较两个值，对于不同类型，可以通过定义多个重载函数来实现这样的功能

```cpp
//如果两个值相等，返回0，v1小于v2返回-1，v2小于v1返回1
int compare(const string &v1, const string &v2) {
	if (v1 < v2) return -1;
	if (v2 < v1) return 1;
	return 0;
}

int compare(const double &v1, const double &v2) {
	if (v1 < v2) return -1;
	if (v2 < v1) return 1;
	return 0;
}
```

这两个函数几乎相同，唯一的区别是**参数的类型**，函数体完全一样

如果还需要定义其他类型的比较函数，显然这样定义比较麻烦，可以用到下面介绍的函数模板进行简化

### 16.1.1 函数模板
- 通过定义一个**函数模板**，而不需要为每个类型都定义一个新函数；
- 一个函数模板就是一个公式，可以用来生成针对特定类型的函数版本

```cpp
template<typename T>
int compare(const T &v1, const T &v2) {
	if (v1 < v2) return -1;
	if (v2 < v1) return 1;
	return 0;
}
```

模板定义以**关键字 template** 开始，后跟一个**模板参数列表**，这是一个逗号分隔的一个或多个**模板参数**的列表，用（<>）包围起来

>模板定义中，模板参数列表不能为空

模板参数列表类似函数参数列表，在调用时为函数提供实参来初始化形参；模板参数列表中的类型，只有当调用时，通过显式或隐式指定**模板实参**，将其绑定到模板参数上，根据具体使用情况来确定

#### 实例化函数模板
*当调用一个函数模板时，编译器用函数实参来推断模板实参*

```cpp
cout << compare(1, 0) << endl; //T为int
//实参类型为int, 编译器推断出模板实参为int，将其绑定到模板参数T
```

编译器用推断出来的模板参数来**实例化**一个特定版本的函数，对于上面的调用，会实例化出 `int compare(const int&, const int&);` 函数

同样对于下面的调用：

```cpp
vector<int> vec1{1, 2, 3}, vec2{5, 6, 7};
cout << compare(vec1, vec2) << endl;
//实例化出 int compare(const vector<int>&, const vector<int>&)
```

编译器会实例化另一个 compare 版本，其中 T 被替换为 `vector<int>`

```cpp
int compare(const vector<int>&v1, const vector<int>&v2) {
	if (v1 < v2) return -1;
	if (v2 < v1) return 1;
	return 0;
}
```

这些编译器生成的版本通常称为模板的==实例==

#### 模板类型参数
上面定义的 compare 函数有一个模板**类型参数**，一般可以将类型参数看作类型说明符，就像内置类型或类类型说明符一样使用

类型参数可以用来指定返回类型，函数参数类型，以及函数体内用于变量声明或类型转换

```cpp
template <typename T> T foo(T* p) {
	T tmp = *p; //tmp类型将时指针p指向的类型
	//...
	return tmp;
}
```

**类型参数前必须使用关键字 class 或 typename**

```cpp
//错误：U前面需要加上关键字class或typename
template <typename T, U> T calc(const T&, const U&);
```

**这两个关键字含义相同，可以互换使用**

#### 非类型模板参数
- 一个**非类型参数**表示一个值而非一个类型，通过一个特定的类型名而非关键字 class 或 typename 来指定非类型参数
- 一个模板被实例化时，非类型参数被用户提供或编译器推断出的值所替代，*这些值必须是常量表达式*

例如：编写一个 compare 版本处理字符串字面常量，这种字面常量是 const char 数组，用于不能拷贝一个数组，所以将自己的参数定义为**数组的引用**，由于希望比较不同长度的字符串字面值常量，模板定义了两个非类型的参数

```cpp
template <unsigned N, unsigned M>
int compare(const (&p1)[N], const (&p2)[M]) {
	return strcmp(p1, p2);
}
```

调用这个版本时：

```cpp
compare("hi", "mom");

//编译器会用字面值常量的大小代替N，M
//编译器会在末尾插入一个空字符作为终结符

//编译器会实例出下面版本
int compare(const char (&p1)[3], const char (&p2)[4]);
```

- 一个非类型参数可以是一个整型、一个指向对象或函数类型的指针或（左值）引用
- **绑定到非类型整型参数的实参必须是一个常量表达式**
- 绑定到指针或引用必须具有静态生存期，不能用普通（非static）局部变量或动态对象作为指针引用的实参
- 指针参数也可以用 nullptr 或值为 0 的常量表达式来实例化

#### inline 和 constexpr 的函数模板
inline 和 constexpr 说明符放在模板参数列表后面，返回类型之前

```cpp
//正确：inline说明符在模板参数列表之后
template<typename T> inline T min(const T&, const T&);
//错误：inline位置不正确
inline template<typename T> T min(const T&, const T&);
```

#### 编写类型无关的代码
编写泛型代码两个重要原则：
1. 模板中的函数参数是 const 的引用
2. 函数体中的条件判断仅用 < 比较运算

- 使用 const 的引用，保证了函数可以用于不能拷贝的类型，设为引用处理大对象时，函数运行速度会更快
- 只使用 < 运算符，降低了函数对要处理类型的要求，这些类型必须支持 <，而不必同时支持 >
- 如果需要类型无关和可移植性，可以使用 less 函数对象来定义

```cpp
template <typename T> int compare(const T &v1, const T &v2) {
	if (less<T>()(v1, v2)) return -1;
	if (less<T>()(v2, v1)) return 1;
	return 0;
}
```

#### 模板编译
编译器遇见一个模板定义时，并不生成代码，只有当实例化出模板的一个特定版本时，编译器才会生成代码

模板为了生成一个实例化版本，需要函数模板或类模板成员函数的定义，与非模板代码不同，模板的头文件通常即包括声明也包括定义

#### 大多数编译错误在实例化期间报告
模板直到实例化才会生成代码，通常编译器在三个阶段报告错误：
1. 编译模板本身，基本的语法错误（忘记分号，变量名拼错等）
2. 编译器遇到模板使用时，函数模板会检查实参数目是否正确，参数类型是否匹配，类模板是否提供了正确数目的模板实参
3. 模板实例化时，只有这个阶段才会发现类型相关的错误

例如：之前的 compare 函数，如果传入一个类类型

```cpp
Sales_data data1, data2;
cout << compare(data1, data2) << endl; //错误：Sales_data未定义<
```

这样的错误只有等到实例化 compare 才会发现

### 16.1.2 类模板
**类模板**用来生成类的蓝图，类模板必须提供额外的信息，来确定模板的参数类型，一般在模板名后尖括号中提供实参

#### 定义类模板
```cpp
template <typename T> class Blob {
public:
	typedef T value_type;
	typedef typename std::vector<T>::size_type size_type;
	//构造函数
	Blob();
	Blob(std::initializer_list<T> il);
	//Blob中元素数目
	size_type size() const { return data->size(); }
	bool empty() const { return data->empty(); }
	void push_back(const T& t) { return data->push_back(t);}
	void pop_back();
	//元素访问
	T& back();
	T& operator[](size_type i);
private:
	std::shared_ptr<std::vector<T>> data;
	//若data[i]无效，抛出msg
	void check(size_type i, const std::string &msg) const;
}；
```

#### 实例化类模板
使用一个类模板时，需要提供额外信息，这些额外信息是**显示模板实参**列表，它们被绑定到模板参数

```cpp
//使用类模板，必须提供元素类型
Blob<int> ia; 
Blob<int> ia2 = {0, 1, 2, 3};
```

ia 和 ia2会实例化以下特定版本的 `Blob<int> `
`
```cpp
template <> class Blob<int> {
	typedef typename std::vector<int>::size_type size_type;
	Blob();
	Blob(std::initializer_list<int> il);
	//...
}
```

当编译器从 Blob 模板中实例化一个类时，它会重写 Blob 模板，将参数 T 的每个实例替换成给定的模板实参

>一个类模板的每个实例都形成一个独立的类，类型 `Blob<string>` 与其他任何 Blob类型都没有关系，也不会对任何其他 Blob 类型的成员具有特殊的访问权限

#### 类模板的成员函数
与其他类一样，既可以在类模板内部，也可以在外部定义其成员函数，且**定义在类模板内的成员函数被隐式声明为内联函数**

- 类模板的成员函数本身是一个普通函数
- 每个类模板的实例都有自己版本的成员函数
- 类模板的成员函数具有和模板相同的模板参数
- 定义在类模板之外的成员函数就必须以关键字 template 开始，后接参数列表

简单说就是在类模板内部定义成员函数，可以直接使用参数 T，而在类模板外部定义成员函数，前面需要加上 template 等

```cpp
template <typename T>
ret-type Blob<T>::member-name(parm-list)
```

这里必须加上 template 这行

#### 类模板成员函数实例化
默认情况下，类模板的成员函数只有当程序使用它的时候才进行实例化

```cpp
// 实例化Blob<int>和接受initializer_list<int>的构造函数
Blob<int> squares = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
for (size_t i = 0; i != squares.size(); ++i) {
	squares[i] = i * i; //实例化Blob<int>::operator[](size_t)
}
```

如果一个成员函数没有被使用，则它不会被实例化

#### 类代码内简化模板类名的使用
在使用一个类模板类型时必须提供模板实参，但是在类模板自己的作用域中，可以直接使用模板名而不提供实参

```cpp
template <typename T> class BlobPtr {
public:
	BlobPtr() : curr(0) {}
	//其他构造函数
	T& operator*() const {
		auto p = check(curr, "derederence past edn");
		return (*p)[curr];
	}
	//递增和递减
	BlobPtr& operator++(); //求值运算符
	BlobPtr& operator--();
private:
	//其他成员
	std::size_t curr; //数组中的位置
}
```

这里前置递增和递减成员返回的时 BlobPtr&，而不是 `BlobPtr<T>&`，在类模板作用域中，编译器处理模板自身引用会自动提供模板匹配的实参

#### 类模板外使用类模板名
在类模板外定义成员时，此时不在类的作用域，直到遇见类名菜进入类的作用域

```cpp
//后置++版本
template <typename T>
BlobPtr<T> BlobPtr<T>::operator++(int) {
	BlobPtr ret = *this;
	++*this;
	return ret;
}
```

返回类型位于类的作用域之外，所以必须指出返回类型是一个实例化的 BlobPtr，在函数体内已经进入类的作用域，则定义 ret 时无须重复提供模板实参，如果不通过模板实参，编译器假定使用的类型与成员实例化所用类型一致，等价于：`BlobPtr<T> ret = *this;`

#### 类模板和友元
- 一个类包含一个友元声明，类与友元各自是否是模板是互相无关的
- 如果一个模板包括一个非模板友元，则友元可以访问所以模板实例
- 如果友元自身也是模板，类可以授权给所有友元模板实例，也可以只授权给特定实例

#### 一对一友好关系
类模板与另一个（类或函数）模板间友好关系的最常见的形式是建立*对应实例及其友元间的友好关系*。例如，我们的 Blob 类应该将 BlobPtr 类和一个模板版本的 Blob 

```cpp
template <typename> class BlobPtr;
//需要提前声明
template <typename> class Blob;
template <typename T>
	bool operator==(const Blob<T>&, const Blob<T>&);

template <typename T> class Blob {
	friend class BlobPtr<T>;
	friend bool operator==<T>
				(const Blob<T>&, const Blob<T>&);
	//其他成员
}
```

友元的声明用 Blob 的模板形参作为自己的模板实参，友好关系被限定在相同类型实例化的 Blob 和 BlobPtr 相等运算符之间

```cpp
//BlobPtr<char>和operator==<char>都是本对象的友元
Blob<char> ca; 
//BlobPtr<int>和operator==<int>都是本对象的友元
Blob<int> ia;
```

上面例子中，ca 对 ia 或其他实例没有特殊访问权限

#### 通用和特定模板的友好关系
一个类也可以将另一个模板的每个实例都声明为自己的友元，或者限定特定的实例为友元

```cpp
template <typename T> class Pal;
class C { //C是普通非模板类
	friend class Pal<C>;//C实例化Pal是C的友元
	//Pal2的所有实例都是C的友元，这种情况无须前置声明
	template <typename T> friend class Pal2;
};
template <typename T> class C2 {//C2是个模板类
	//C2每个实例将相同实例的Pal声明为友元
	friend class Pal<T>;
	//Pal2所有实例都是C2每个实例的友元，不需要前置声明
	template <typename X> friend class Pal2;
	//Pal3是一个非模板类，它是C2所有实例的友元
	friend class Pal3;
};
```

*为了让所有实例都成为友元，友元声明中必须使用与类模板不同的模板参数*

#### 令模板自己的类型参数成为友元
在C++11新标准中，可以将模板类型参数声明为友元

```cpp
template <typename Type> class Bar {
	friend Type; //访问权限授予实例化Bar的类型
	//...
}
```

此时，对于某个类型 `Foo`，`Foo` 将称为 `Bar<Foo>` 的友元，`Sales_data` 将成为 `Bar<Sales_data>` 的友元

#### 模板类型别名
类模板一个实例定义了一个类类型，我们可以定义一个 typedef 来引用实例化的类： `typedef Blob<string> StrBlob;`

由于模板不是一个类型，我们不能定义一个 `typedef` 引用一个模板，即不能定义一个 `typedef` 引用 `Blob<T>`

但是新标准允许为类模板定义一个类型别名：

```cpp
template<typename T> using twin = pair<T, T>;
twin<string> authors; //authors是一个pair<string, strin>
```

使用别名时，也需要像模板那样指出特定类型的 twin

使用一个模板类型别名时，可以固定一个或多个模板参数

```cpp
template <typename T> using partNo = pair<T, unsigned>;
partNo<string> books; //是pair<string, unsigned>
partNo<Vehicle> books; //是pair<Vehicle, unsigned>
```

#### 类模板的static成员
**对于类模板的static成员，每个模板的实例都有属于自己的 static 成员实例**

例如：

```cpp
template <typename T> class Foo {
public:
	static std::size_t count() { return ctr; }
	//其他成员
private:
	static std::size_t ctr;
	//其他成员
}
```

对于任意的 `Foo<X>` 实例对象共享相同的 `ctr` 对象和 `count` 函数

```cpp
//实例化static成员Foo<string>::ctr和Foo<string>::count
Foo<string> fs;
//所有三个对象共享相同的Foo<int>::ctr和Foo<int>::count成员
Foo<int> fi, fi2, fi3;
```

在类外部也可以定义static成员，与定义模板成员函数类似：

```cpp
template <typename T>
size_t Foo<T>::ctr = 0; //定义并初始化ctr
```

使用一个静态成员时，可以通过作用域运算符直接访问成员，为了访问static成员，必须提供一个特定的实例：

```cpp
Foo<int> fi; //实例化Foo<int>和static数据成员ctr
auto ct = Foo<int>::count();//实例化Foo<int>::count
ct = fi.count();            //使用Foo<int>::count
ct = Foo::count();          //错误：未明确哪个模板实例
```

类似模板类的其他成员函数，一个static成员函数只有在使用时才会实例化










