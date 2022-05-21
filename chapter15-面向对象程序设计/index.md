# 《C++Primer》| 第十五章 面向对象程序设计

## 15.1 OOP：概述
**面向对象程序设计**：核心思想是数据抽象、继承和动态绑定
- 数据抽象：类的接口与实现进行分离
- 继承：定义相似的类型并对相似关系建模
- 动态绑定：一定程度上忽略相似类型的区别，用统一的方式使用它们的对象

#### 继承
通过**继承**联系在一起的类构成一种层次关系，这种层次关系的根部有一个**基类**，其他类直接或间接由基类继承而来，继承得到的类称为**派生类**，继承的关系满足 is a ，即派生类本身也是一种基类的类型

对于基类中的某些函数，如果派生类需要自定义适合自身的版本，可以在基类中将这些函数声明为**虚函数**，派生类必须在内部对所有的虚函数重新声明

#### 动态绑定
使用动态绑定，可以用同一段代码处理基类和派生类的对象

比如说定义一个函数参入的形参是基类类型，然后打印处基类的成员，此时如果传入一个派生类也同样可以打印派生类的成员，这时调用的函数会根据实际传入的类型进行调用

动态绑定过程是在函数运行时由实参决定，有时也可以称为**运行时绑定**


## 15.2 定义基类和派生类
### 15.2.1 定义基类
首先定义 Quote 类：

```cpp
class Quote {
public:
	Quote() = default;//默认构造函数
	Quote(const std::string &book, double sales_price) : 
					bookNo(book), price(sales_price) {}
	std::string isbn() const { return bookNo; }
	//返回给定数量书籍的销售总额
	//派生类负责改写并使用不同的折算算法
	virtual double net_price(std::size_t n) const 
			{ return n * price; }
	virtual ~Quote() = default;//对析构函数进行动态绑定
	
private:
	std::string bookNo; //书籍ISBN号
protected:
	double price = 0.0; //普通状态下不打折的价格
}
```

>基类通常定义一个虚析构函数，即使不执行任何操作

#### 成员函数和继承
派生类可以继承基类的成员，遇见 net_price 这种与类型相关的操作，派生类需要对这些操作提供自己新定义以**覆盖**从基类继承而来的定义

通常将基类希望派生类进行覆盖的函数定义为**虚函数**，当使用指针或者引用调用虚函数时，该调用将被动态绑定

#### 访问控制和继承
- 派生类可以继承定义在基类中的成员，但是派生类的成员函数不一定有权访问从基类继承而来的成员
- 派生类可以访问公有成员，但是不能访问私有成员
- 如果希望基类的派生类有权访问该成员，同时禁止其他用户访问，可以定义为**受保护的**（protected）

### 15.2.2 定义派生类
派生类必须通过**类派生列表**来指明它是从哪个基类继承而来的，类派生列表形式是：首先一个冒号，后面紧跟以逗号分隔的基类列表，每个基类前面可以有以下三种访问说明符之一：public、protected和private

定义 Bulk_quote 类
```cpp
class Bulk_quote : public Quote { //Bulk_quote继承自Quote
public:
	Bulk_quote() = default;
	Bulk_quote(const std::string&, double, std::size_t, double);
	//覆盖基类的函数版本以实现基于大量购买的折扣政策
	double net_price(std::size_t) const override;
private:
	std::size_t min_qty = 0;//适用折扣政策的最低购买量
	double discount = 0.0;  //以小数表示折扣额
}
```

Bulk_quote 类从基类 Quote 继承了 isbn 函数和 bookNo、price等数据成员，此外还定义了 net_price 的新版本，同时增加了两个新的数据成员

#### 派生类中的虚函数
派生类如果没有覆盖基类的虚函数，则派生类会直接继承基类中的版本

C++11新标准允许派生类显示注明它使用某个成员函数覆盖了它继承的虚函数，具体做法是在函数定义后面加个关键字 override

#### 派生类对象即派生类向基类的类型转换
派生类对象含有基类对应的成员部分，我们可以将派生类对象当成基类对象来使用，也能将基类指针或引用绑定到派生类对象的基类部分上

```cpp
Quote item;      //基类对象
Bulk_quote bulk; //派生类对象
Quote *p = &item;//p指向Quote对象
p = &bulk;       //p指向bulk的Quote部分
Quote &r = bulk; //r绑定到bulk的Quote部分
```

这种转换称为**派生类到基类的**类型转换

#### 派生类构造函数
派生类对象中含有从基类继承的成员，但是派生类不能直接初始化这些成员，派生类必须使用基类的构造函数来初始化它的基类部分

派生类在初始化成员时，可以通过构造函数初始化列表将实参传给基类构造函数，如下：

```cpp
//Bulk_quote的构造函数
Bulk_quote(const std::string &book, double p, 
		   std::size_t qyt, double disc) :
		   Quote(book, p), min_qty(qty), discount(disc) {}
```

>派生类首先初始化基类部分，然后按照声明顺序初始化派生类的成员

#### 派生类使用基类的成员
派生类可以访问基类的公用成员和受保护的成员，例如：
```cpp
//如果达到购买书籍某个最低限度值，就可以享受折扣价格
double Bulk_quote::net_price(size_t cnt) const {
	if (cnt >= min_qty) 
		return cnt * (1 - discount) * price;
	else
		return cnt * price;
}
```

#### 继承与静态成员
如果基类定义了一个静态成员，则整个继承体系中只存在该成员的唯一定义，不能派生出来多个各类，每一个静态成员只存在唯一的实例

静态成员遵循通用的访问控制规则，如果基类中定义为 private 的，派生类无权进行访问；如果静态成员可访问，既可以通过基类使用它，也可以通过派生类使用

```cpp
class Base {
public:
	static void statemen();
};
class Derived : public Base {
	void f(const Derived&);
};

void Derived::f(const Derived &derived_obj) {
	Base::statemem();       //通过基类访问
	Derived::statemem();    //通过派生类访问
	derived_obj.statemem(); //通过基类对象访问
	statemem();             //通过this对象访问
}
```

#### 派生类的声明
派生类声明和其他类差别不大，声明中包含类名但是不包含它的派生列表：

```cpp
class Bulk_quote : public Quote;//错误，派生列表不能出现在这
class Bulk_quote;               //正确：声明派生类的正确方式
```

#### 被用作基类的类
如果想用某个类作为基类，则这个类必须已经定义而非仅仅声明：

```cpp
class Quote;//声明但未定义
//错误：Quote必须被定义
class Bulk_quote : public Quote {...};
```

一个类不可以派生它本身

#### 防止继承的发生
如果不希望某一个类派生出其他类，或者不考虑将它作为一个基类，C++11新标准提供了一种防止继承发生的方法，即在类名后面跟一个关键字 final：
```cpp
class NoDrived final { /***/ };
class Bad : Noderived { /***/ }; //错误：NoDrived是final的
```


### 15.2.3 类型转换与继承
我们可以将基类的指针或引用绑定到派生类对象上，例如：可以用 Quote& 指向一个 Bulk_quote 对象

**==当使用基类的引用（或指针）时，我们并不清楚该引用（指针）所绑定对象的真实类型==**，可能该对象时基类的对象，也可能时派生类的对象

>智能指针类也支持派生类向基类的类型转换

#### 静态类型和动态类型
- 使用存在继承关系的类型时，需要区分一个变量或者表达式的**静态类型**和**动态类型**
- 静态类型编译时总是已知的，它是变量声明时的类型或者表达式生成的类型
- 动态类型则是变量或表达式表示内存中的对象的类型，运行时才可以确定
- 如果表达式既不是引用也不是指针，则它的动态类型和静态类型永远一致

#### 不存在基类向派生类的隐式转换
- 派生类可以向基类转换是因为派生类中含有基类的成员，基类的引用或指针可以绑定到该基类部分上
- 而基类对象中可能存在派生类对象中的成员，也可能不存在，所以不能从基类向派生类自动类型转换

```cpp
Quote base;
Bulk_quote* bulkPtr = &base; //错误：基类不能转换为派生类
Bulk_quote& bulkRef = base;  //错误：基类不能转换为派生类
```

==即使一个基类指针或者引用类型绑定在派生类对象上，我们也不能执行从基类向派生类的转换==

```cpp
Bulk_quote bulk;
Quote *itemPtr = &bulk;        //正确：动态类型是Bulk_quote
Bulk_quote *bulkPtr = itemPtr; //错误：不能将基类转换为派生类
```

编译器在编译时候无法确定上述转换过程在运行时是否安全，编译器只能检查静态类型来判断是否合法

#### 对象之间不存在类型转换
派生类向基类的自动类型转换只能对指针和引用有效，在派生类和基类类型之间不存在这样的转换。

当对基类进行初始化或者拷贝赋值时，如果传入的是派生类的对象，通常只会将派生类中含有基类的部分进行拷贝复制，而派生类多的部分会被忽略

```cpp
Bulk_quote bulk;  //派生类对象
Quote item(bulk); //使用Quote::Quote(const Quote&)构造函数
item = bulk;      //调用Quote::operator=(const Quote&)
```

当构造 item 时，只会处理 Quote 类中的 bookNo 和 price 两个部分，同时忽略了 bulk 中其他成员

>当使用一个派生类对象为基类对象初始化或赋值时，只有派生类对象中基类部分会被拷贝、移动或赋值，它的派生类部分会被忽略

问：给出静态类型和动态类型的定义
- 静态类型在编译时就己经确定了，它是变量声明时的类型或表达式生成的类型；
- 而动态类型则是变量或表达式表示的内存中的对象的类型，动态类型直到运行时才能知道；
- 如果一个变量非指针也非引用，则它的静态类型和动态类型永远一致。但基类的指针或引用的动态类型可能与其动态类型不一致


## 15.3 虚函数
我们使用基类的引用或指针调用一个虚函数的成员函数时，会执行动态绑定，直到运行时我们才能知道到底调用了哪个版本的虚函数，所以所有的虚函数都必须被定义

#### 虚函数的调用可能在运行时才被解析
下面是个例子：

```cpp
Quote base("0-201-824-1", 50);
print_total(cout, base, 10);    //Quote::net_price
Bulk_quote derived("021-82470-1", 50);
print_total(cout, derived, 10); //Bulk_quote::net_price
```

- 第一次调用 print_total 时，base 绑定到  Quote 上，运行的是 Quote 定义的版本
- 第二次调用时，derived 绑定的 Bulk_quote 版本上，调用的会是 Bulk_quote 定义的版本

**动态绑定只有当通过引用或指针调用虚函数时才会发生**

```cpp
base = derived;     //把derived中Quote部分拷贝给base
base.net_price(20); //调用Quote::net_price
```

使用普通类型（非指针非引用）的表达式调用虚函数时，在编译阶段就已经确定下来调用的版本了


#### 派生类中的虚函数
- 派生类如果覆盖继承而来的虚函数，它的形参类型和返回类型必须和基类函数一致

- 当派生类返回类型是指针或引用时，返回类型存在例外，如果 D 由 B 派生而来，则派生类的返回类型可以时 B\* ，而基类返回类型为 D\* 

#### final 和 override 说明符
派生类如果定义了一个函数和虚函数名字相同但是形参列表不同，编译器会认为这个函数和原有函数相互独立，这样的话就不符合我们的想法，派生类没有覆盖基类中的虚函数。或者是在派生类定义函数时因为疏忽打错了函数名，也会出现上述情况

C++11新标准提供 **override 关键字**来说明派生类中的虚函数，这样使得程序员意图更清晰同时编译器也可以发现错误

```cpp
struct B {
	virtual void f1(int) const;
	virtual void f2();
	void f3();
};

struct D1 : B {
	void f1(int) const override; //正确：f1与基类f1匹配
	void f2(int) override;       //错误：形参不匹配
	void f3() override;          //错误：f3不是虚函数
	void f4() override;          //错误：基类没有名为f4函数
}
```

如果我们使用 **final 关键字**，则之后尝试覆盖该函数操作都会失败

```cpp
struct D2 : B {
	//从B继承f2()和f3()，覆盖f1(int)
	void f1(int) const final;//不允许后续其他类覆盖f1(int)
};

struct D3 : D2 {
	void f2();          //正确：覆盖从基类B间接继承来的f2()
	void f1(int) const; //错误：D2将f1声明为final
}
```

**final 和 override 说明符出现在形参列表（包括任何const和引用修饰符）以及尾置返回类型之后**

#### 虚函数和默认实参
虚函数也可以像其他函数一样拥有默认实参，基类和派生类定义的默认实参最好相同

#### 回避虚函数的机制
如果希望对虚函数的调用不要进行动态绑定，而是强迫执行虚函数的特定版本，可以使用**作用域运算符**实现这一目的

```cpp
double undiscounted = basePtr->Quote::net_price(42);
```

- 通常情况下，只有成员函数（或友元）中代码才需要使用作用域运算符回避虚函数机制
- 通常当一个派生类的虚函数想调用基类中虚函数版本时，需要回避虚函数的机制
- 如果派生类虚函数中没有使用作用域运算符，运行时被解析成调用自身版本，导致无限循环


## 15.4 抽象基类
#### 纯虚函数
我们如果将虚函数定义为**纯虚函数**，含有该函数的类是**抽象基类**，抽象基类负责定义接口，而后续其他类可以覆盖该接口

**我们在函数体的位置（即分号前面）书写 =0 就可以将一个虚函数说明为纯虚函数**

```cpp
class Disc_quote : public Quote {
public:
	Disc_quote() = default;
	Disc_quote(const std::string& book, double price,
				std::size_t qty, double price) :
				Quote(book, price), quantity(qty), discount(dis) {}
	double net_price(std::size_t) const = 0;
protected:
	std::size_t quantity = 0;
	double discount = 0.0;
}
```

- 纯虚函数无须定义，我们也可以为其定义，但函数体必须写在类的外部，即我们不能在类的内部为一个 =0 的函数提供函数体

- **我们不能直接创建一个抽象基类的对象**

#### 派生类构造函数只初始化它的直接基类
下面重新实现 Bulk_quote

```cpp
class Bulk_quote : public Disc_quote {
public:
	Bulk_quote() = default;
	Bulk_quote(const std::string& book, double price,
				std::size_t qty, double price) :
				Disc_quote(book, price, qty, disc) {}
	double net_price(std::size_t) const override;
};
```

每个类各自控制其对象的初始化过程，即使 Bulk_quote 中没有任何数据成员，也需要提供一个构造函数，初始化它的直接基类，也就是 Disc_quote


## 15.5 访问控制与继承
每个类分别控制自己成员初始化过程，每个类还控制着其成员对于派生类来说是否**可访问**

#### 受保护的成员
protected 关键字可以控制那些它希望与派生类分享但是不想和其他公共访问使用的成员

- 和私有成员类似，受保护的成员对于类的用户是不可访问的
- 和公有成员类型，受保护的成员对于派生类和友元是可访问的
- 派生类的成员或友元**只能通过派生类对象**来访问基类中受保护的成员
- 派生类对于基类对象中受保护成员没有任何访问权限

```cpp
class Base {
protected:
	int prot_mem; 
};

class Sneaky : public Base {
	friend void clobber(Sneaky&);//能访问Sneaky::prot_mem
	friend void clobber(Base&*); //不能访问Base::prot_mem
	int j; //默认为private
};
//正确：可以访问Sneaky对象的private和protected成员
void clobber(Sneaky &s) { s.j = s.prot_mem = 0; }
//错误：不能访问Base中的protected成员
void clobber(Base &b) { b.prot_mem = 0; }
```

上面的最后一条的含义是一个派生类成员和友元只能访问派生类继承过来属于基类那部分的受保护成员（这些成员，派生类自己本身也有，成员和友元可以访问自己本身的受保护的成员），而不能直接访问基类对象中的受保护成员

#### 公共、私有和受保护继承
类对继承而来的成员的访问权限受到两个因素影响：一是基类在该成员的访问说明符，二是派生类的派生列表中的访问说明符

```cpp
class Base {
public:
	void pub_mem();
protected:
	int prot_mem;
private:
	char priv_mem;
};

struct Pub_Derv : public Base {
	//正确：派生类能访问protected成员
	int f() { return prot_mem; }
	//错误：派生类不能访问private成员
	char g() { return priv_mem; }
};

struct Priv_Derv : private Base {
	//private不影响派生类访问权限
	int f1() const { return prot_mem; }
};
```

派生类访问说明符对于派生类的成员能否访问直接基类的成员没有什么影响，如上 Pub_Derv 和 Priv_Derv 都可以访问基类 Base 中的 prot_mem

派生类访问说明符是控制派生类用户（包括派生类的派生类）对于基类成员的访问权限，相当于将基类成员定义为相应的访问说明符

```cpp
Pub_Derv d1;
Priv_Derv d2;
d1.pub_mem(); //正确：pub_mem在派生类中是public的
d2.pub_mem(); //错误：pub_mem在派生类中是protected的
```

此时在 Priv_Derv 中基类的成员被定义为 private 的了，这样它创建的对象就不可以直接访问

#### 派生类向基类转换的可访问性
派生类向基类的转换是否可访问由使用该转换的代码决定，同时派牛类的派生访问说明符也会有影响。假定D 继承自B :·

- 只有当 D 公有地继承 B 时，用户代码才能使用派生类向基类的转换；如果 D 继承 B 的方式是受保护的或者私有的，则用户代码不能使用该转换。
- 不论 D 以什么方式继承B , D 的成员函数和友元都能使用派生类向基类的转换： 派生类向其直接基类的类型转换对千派牛类的成员和友元来说水远是可访问的。
- 如果 D 继承 B 的方式是公有的或者受保护的，则 D 的派生类的成员和友元可以使用 D 向 B 的类型转换； 反之，如果 D 继承 B 的方式是私有的，则不能使用。

#### 友元和继承
友元关系不能传递，也不能继承，基类的友元在访问派生类成员时不具有特殊性

```cpp
class Base {
	friend class Pal;
protected:
	int prot_mem; 
};

class Sneaky : public Base {
	friend void clobber(Sneaky&);//能访问Sneaky::prot_mem
	friend void clobber(Base&*); //不能访问Base::prot_mem
	int j; //默认为private
};

class Pal {
public:
	int f(Base b) { return b.prot_mem; } //正确：Pal是Base友元
	int f(Sneaky s) { return s.j; }      //错误：Pal不是Sneaky友元
	int f3(Sneaky s) { return s.prot_mem; }//正确：Pal是Base友元
}
```

f3 访问了派生类中基类部分的成员，Pal 是基类的友元，Pal 能够访问 Base 对象的成员

友元只对做出声明的类有效，而友元的基类或派生类不具有特殊访问能力

```cpp
class D2 : public Pal {
public:
	int mem(Base b) 
		{ return b.prot_mem; } //错误友元不能继承
}
```

#### 改变个别成员的可访问性
如果需要改变派生类继承的某个名字的访问性，可以使用 using 声明达到这个目的

```cpp
class Base {
public:
	std::size_t size() cont { return n; }
protected:
	std::size_t n;
};
class Dervied : private Base {
public:
	using Base::size;
protected:
	using Base::n;
};
```

Derived 为私有继承，继承的size 和 n 默认情况下是 Derived 的私有成员，使用 using 声明语句，可以改变这个成员的可访问性，此时的 Derived 用户都可以使用 size，而只有 Derived 的派生类才可以使用 n

using 声明控制的访问权限仅由声明语句前面的访问说明符决定

#### 默认的继承保护级别
默认情况下，class 关键字的派生类是**私有继承**的，struct 关键字的派生类是**公有继承**的

```cpp
class Base { /**/ };
struct D1 : Base { /**/ }; //默认public继承
class D2 : Base { /**/ };  //默认private继承
```

struct 和 class 关键字唯一区别就是默认成员访问说明符默认派生访问说明符的区别

>一个私有派生的类最好显示的声明 private，不要仅仅依赖默认设置


## 15.6 继承中的类作用域
每个类定义自己的作用域，在这个作用域类定义类的成员

存在继承关系时，派生类的作用域**嵌套**在基类作用域之内，当一个名字在派生类的作用域无法解析，编译器会继续在外层的基类作用域中寻找改名字的含义

```cpp
Bulk_quote bulk;
cout << bulk.isbn();
```

名字 isbn 解析过程如下：
1. 我们通过 Bulk_quote 对象调用 isbn 的，首先在 Bulk_quote 中查找，没有找到 isbn
2. Bulk_quote 由 Disc_quote 派生而来，记下来在 Disc_quote 中查找，仍然找不到
3. Disc_quote 由 Quote 派生而来，接着在 Quote 中查找，此时找到了 isbn，最终被解析为 Quote 中的 isbn

#### 在编译时进行名字查找
一个对象、引用或指针的静态类型决定了对象哪些成员是可见的，静态类型和动态类型可能不一样，但是能使用哪些成员依然由静态类型决定

我们在 Disc_quote 中添加一个新成员

```cpp
class Disc_quote : public Quote {
public:
	std::pair<size_t, double> discount_policy() const 
			{ return {quantity, discount}; }
	//其他成员与前面一致
}
```

我们只能通过 Disc_quote 及派生类对象、引用或指针使用 discount_policy

```cpp
Bulk_quote bulk;
Bulk_quote *bulkPtr = &bulk;
Quote *itemPtr = &bulk;
bulkPtr->discount_policy();//正确：bulkPtr类型为Bulk_quote*
itemPtr->discount_policy();//错误：itemPtr类型为Quote*
```

#### 名字冲突与继承
和其他作用域一样，派生类也能重用定义在基类中的名字，此时定义在内层作用域（即派生类）的名字将隐藏定义在外层作用域（即基类）的名字

**可以通过作用域运算符来使用一个被隐藏的基类成员**

#### 名字查找先于类型检查
声明在内层作用域的函数并不会重载声明在外层作用域的函数，**定义在派生类中的函数也不会重载基类中的成员**

如果派生类和基类某个成员同名，派生类将在其作用域内隐藏该基类成员，即使形参列表不一样，基类成员仍然会被隐藏

```cpp
struct Base {
	int memfcn();
};
struct Derived : Base {
	int memfcn(int);//隐藏基类的memfcn
};

Derived d; Base b;
b.memfcn();       //调用 Base::memfcn
d.memfcn(10);     //调用 Derived::memfcn
d.memfcn();       //错误：基类memfcn被隐藏了
d.Base::memfcn(); //正确：调用Base::memfcn
```

#### 虚函数和作用域
15.3说到基类和派生类的虚函数必须有相同的形参列表，如果基类和派生类虚函数接受实参不一样，**无法通过基类的引用或指针调用派生类的虚函数**

```cpp
class Base {
public:
	virtual int fcn();
};
class D1 : public Base {
public:
	//隐藏了基类的fcn，这个fcn不是虚函数
	//D1继承了Base::fcn()定义
	int fcn(int);
	virtual void f2();
}；
class D2 : public D1 {
public:
	int fcn(int);//非虚函数，隐藏了D1::fcn(int)
	int fcn();   //覆盖了Base的虚函数fcn
	void f2();   //覆盖了D1虚函数f2
}
```

下面是使用几种函数的方法

```cpp
Base bobj; D1 d1obj; D2 d2obj;

Base *bp1 = &bobj, *bp2 = &d1obj, *bp3 = &d2obj;
bp1->fcn(); //虚调用，运行时调用Base::fcn
bp2->fcn(); //虚调用，运行时调用Base::fcn
bp3->fcn(); //需调用，运行时调用D2::fcn

D1 *d1p = &d1obj; D2 *d2p = &d2obj;
bp2->f2(); //错误：Base没有名为f2成员
d1p->f2(); //虚调用，运行时调用D1::f2()
d2p->f2(); //虚调用，运行时调用D2::f2()

Base *p1 = &d2obj; D1 *p2 = &d2obj; D2 *p3 = &d2obj;
p1->fcn(42); //错误，Base中没有fcn(int)函数
p2->fcn(42); //静态绑定，调用D1::fcn(int)
p3->fcn(42); //静态绑定，调用D2::fcn(int)
```

#### 覆盖重载的函数
成员函数无论是否为虚函数都能被重载，如果派生类希望所有的重载版本对于它都是可见的，那么它就需要覆盖所有的版本，或者一个都不覆盖

如果只需要覆盖其中一些函数，但是不得不自己重新定义覆盖基类的每一个版本，否则未重新定义的函数会被隐藏

通过使用 using 声明，就无须覆盖所有版本。using 声明语句指定一个名字而不指定形参列表，所有一条基类成员函数的 using 声明语句就可以把该函数所有重载实例添加到派生类作用域中。此时派生类只需要定义特有的函数就行了

## 15.7 构造函数与拷贝控制
### 15.7.1 虚析构函数
当我们 delete 一个动态分配的对象指针时，将执行析构函数，如果指向继承体系中的某个类型，则有可能出现指针的静态类型与被删除对象动态类型不符合的情况，这样的话编译器必须确保执行正确的析构函数

**通过将基类中的析构函数定义为虚函数来确保执行正确的析构函数版本**

```cpp
class Quote {
public:
	//如果我们删除指向派生类对象的基类指针，需要虚析构函数
	virtual ~Quote() = default; //动态绑定析构函数
}
```

析构函数的虚属性也会继承，基类的析构函数为虚函数就可以确保 delete 基类指针时能够调用正确的析构函数版本

```cpp
Quote *itemPtr = new Quote; //静态类型与动态类型一致
delete itemPtr;             //调用Quote的析构函数
itemPtr = new Bulk_Quote;   //静态类型与动态类型一致
delete itemPtr;             //调用Bulk_quote析构函数
```

>如果基类的析构函数不是虚函数，则 delete 一个指向派生类对象的基类函数将产生未定义的行为

#### 虚函数将阻止合成移动操作
如果一个类定义了一个析构函数，即使通过=default 的形式使用了合成版本，编译器也不会为这个类合成移动操作

## 15.7.2 合成拷贝控制与继承
基类和派生类的合成拷贝控制成员的行为与其他合成的构造函数、赋值运算符或析构函数类似，它们对类本身成员依次进行初始化、赋值和销毁操作，此外还负责对直接基类部分进行初始化、赋值、销毁的操作

*这里需要注意的就是顺序问题：*
- 对于构造函数，派生类使用合成的构造函数时，会自动先调用直接基类的构造函数，然后再初始化自己的成员，直接基类又会进一步调用基类的构造函数
- **构造函数整体的表现为，先初始化基类成员->初始化直接基类->派生类**
- 对于析构函数，合成的析构函数体是空的，隐式的析构部分负责销毁类的成员，对于派生类的析构函数来说，除了销毁自己的成员外，还负责销毁派生类的直接基类，依次进行
- 整体表现为，**先调用派生类析构函数->直接基类析构函数->基类析构函数**


#### 派生类中删除的拷贝控制和基类的关系
- 如果基类拷贝控制成员是被删除的或者不可访问，派生类中对于的成员也是被删除的
- 如果基类中有一个不可访问或删除的析构函数，派生类中合成的默认和拷贝构造函数是删除的，因为编译器无法销毁派生类对象中基类部分

```cpp
class B {
public:
	B() {}
	B(const B&) = delete;
	//其他成员，无移动构造函数
};

class D : public B {
	//没有声明任何构造函数
};
D d;                //正确：D合成默认构造函数使用B默认构造函数
D d2(d);            //错误：D合成拷贝构造函数是删除的
D d3(std::move(d)); //错误：隐式使用D被删除的拷贝构造函数
```

*如果基类中没有默认、拷贝或移动构造函数，一般情况下派生类也不会定义相应的操作*

#### 移动操作和继承
大多数基类会定义一个**虚析构函数**，默认情况下，基类不含有合成的移动操作，派生类也没有

如果需要移动操作，首先应该在基类中进行定义，可以使用合成的版本，但是要显示的定义，一旦定义移动操作，还有同时定义拷贝操作（3/5准则）

```cpp
class Quote {
public:
	Quote() = default;
	Quote(const Quote&) = default;
	Quote(Quote&&) = default;
	Quote& operator=(const Quote&) = default;
	Quote& operator=(Quote&&) = default;
	virtual ~Quote() = default;
};
```

### 15.7.3 派生类的拷贝控制成员
- 派生类构造函数初始化阶段不仅需要初始化派生类自己的成员，还负责初始化派生类对象中基类部分
- 派生类的拷贝、移动构造函数、赋值运算符也类似，拷贝移动赋值派生类成员的同时，也要对基类部分进行相同的操作
- 而**析构函数只负责销毁派生类自己分配的资源**，派生类中基类部分是自动销毁的

#### 定义派生类的拷贝或移动构造函数
```cpp
class Base { /***/ };
class D : public Base {
public:
	D(const D& d) : Base(d) //拷贝基类成员
			/*D的成员初始值*/ {/**/}
	D(D&& d) : Base(std::move(d)) //移动基类成员
			/*D的成员初始值*/ {/**/}
};
```

初始值 Base(d) 将一个 D 对象传递给基类构造函数，值得注意的是，这里传给基类拷贝构造函数是一个 D 对象，它会自动匹配 Base 中的拷贝构造函数

如果没有提供基类初始值的话，基类部分被默认初始化，而不是从其他对象拷贝而来

```cpp
//D这个拷贝构造函数很可能是不正确的定义
//基类部分被默认初始化，而非拷贝
D(const D& d) /*成员初始值，但是没有提供基类初始值*/
	{/**/}
```

#### 派生类赋值运算符
和拷贝移动构造函数一样，赋值运算符也必须显示为基类部分进行赋值

```cpp
D &D::operator=(const D &rhs) {
	Base::operator=(rhs);
	//D的其他成员赋值
	//酌情使用自赋值和释放已有资源
	return *this;
}
```

#### 派生类析构函数
派生类析构函数只负责销毁派生类自己分配的资源

```cpp
class D : public B {
public:
	//Base::~Base()被自动执行
	~D() { /*销毁D分配的资源*/}
}
```

#### 构造函数和析构函数中调用虚函数
书上这里写的有点绕，我的理解就是：
- 在基类的构造或析构函数中调用虚函数时，执行的版本时基类的虚函数版本
- 在派生类的构造或析构函数中调用虚函数时，执行的是派生类的虚函数版本

我自己也写了下面的代码进行了测试，确实是这样：

```cpp
#include <iostream>
using namespace std;

class Base {
public:
	Base() {
		cout << "Base default constructor" << endl;
	}
	Base(int n) : num(n) {
		cout << "Base constructor" << endl;
		print_num();
	}
	virtual void print_num() {
		cout << "this is a base virtual, num = ";
		cout << num << endl;
	}
	~Base() {
		cout << "this is a Base destructor" << endl;
		print_num();
	}
protected:
	int num;
};

class Derived : public Base {
public:
	Derived(int n) :Base(n) { 
		print_num();
		cnt = n / 2;
	}
	void print_num() override {
		cout << "this is a derived virtual, num = " << num << endl;
		cout << "cnt is " << cnt << endl;
	}
	~Derived() {
		cout << "this is a Derived destructor" << endl;
		print_num();
	}
private:
	int cnt;
};

int main() {
	Derived *p = new Derived(10);
	cout << "===========" << endl;
	delete p;
	return 0;
}
/*打印结果，先执行了构造函数的调用，然后是析构函数的调用
silas@Silas-PC:~/cpp$ g++ construct_virtual.cpp && ./a.out
Base constructor
this is a base virtual, num = 10
this is a derived virtual, num = 10
cnt is 0
===========
this is a Derived destructor
this is a derived virtual, num = 10
cnt is 5
this is a Base destructor
this is a base virtual, num = 10
*/
```

### 15.7.4 继承的构造函数
C++11新标准下，派生类可以重用直接基类定义的构造函数，一个类只负责初始化它的直接基类，也只继承直接基类的构造函数。

类不能继承默认、拷贝和移动构造函数，如果派生类没有直接定义这些构造函数，编译器将为派生类合成它们

派生类继承基类构造函数的方式是提供一条注明了直接基类名的 using 声明语句

```cpp
class Bulk_quote : public Disc_quote {
public:
	using Disc_quote::Disc_quote;//继承了Disc_quote构造函数
	double net_price(std::size_t) const;
};
```

using 声明语句作用在构造函数时，将令编译器产生代码，对于基类的每个构造函数，在派生类都会生成一个与之对应的构造函数，形如：`derived(parms) : base(args) {}`

在上面Bulk_quote 中，继承的构造函数等价于：

```cpp
Bulk_quote(const std::string &book, double price, 
		   std::size_t qty, double disc) :
		   Disc_quote(book, price, qty, disc) {}
```

*如果派生类有自己的成员，这些成员将会被默认初始化*

#### 继承的构造函数特点
1. 和普通成员 using 声明不一样，using 不会改变构造函数的访问级别，如，基类的私有构造函数在派生类中还是一个私有的构造函数
2. using 声明不能指定 explicit 或 constexpr，基类构造函数是 explicit 或 constexpr，派生类也是如此
3. 基类构造函数中的默认实参不会被继承，派生类会获得多个继承的构造函数，其中每个构造函数分别省略掉一个含义默认实参的形参
4. 如果派生类定义的构造函数和基类构造函数有相同形参列表，这些构造函数不会被继承
5. 默认、 拷贝和移动构造函数不会被继承，这些按照正常合成规则被合成
