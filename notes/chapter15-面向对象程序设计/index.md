# 《C++Primer》15章 面向对象程序设计

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

==当使用基类的引用（或指针）时，我们并不清楚该引用（指针）所绑定对象的真实类型==，可能该对象时基类的对象，也可能时派生类的对象

>智能指针类也支持派生类向基类的类型转换

#### 静态类型和动态类型

