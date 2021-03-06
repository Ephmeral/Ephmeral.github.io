# 5.1 二叉树及其表示

## §5.1 二叉树及其表示
### 5.1.1 树
#### 有根树
从图论的角度看，树等价于连通无环图。因此与一般的图相同，树也由一组**顶点（vertex）** 以及联接与其间的若干条**边（edge）** 组成。

在计算机科学中，往往还会在此基础上，再*指定某一特定顶点*，并称之为**根（root）**。

在指定根节点之后，我们也称之为**有根树（rooted tree）**。
此时，从程序实现的角度，我们也更多地将顶点称作**节点（node）**。

#### 深度与层次
由树的连通性，每一节点与根之间都有一条路径相联；而根据树的无环性，由根通往每个节点的路径必然唯一。

因此如图5.1所示，*沿每个节点 v到根 r 的唯一通路所经过边的数目*，称作 v 的**深度（depth）**，记作 depth(v)。

依据深度排序，可对所有节点做分层归类。特别地，约定根节点的深度 depth(r) = 0，故属于第0层。

#### 祖先、后代与子树

任一节点 v 在通往树根沿途所经过的每个节点都是其**祖先**（ancestor），v 是它们的**后代**（descendant）。

特别地，v 的祖先/后代包括其本身，而v本身以外的祖先/后代称作真祖先（proper ancestor）/ 真后代（proper descendant）。

节点 v 历代祖先的层次，自下而上以 1 为单位逐层递减；在每一层次上，v 的祖先至多一个。

特别地，若节点 u 是 v 的祖先且恰好比 v 高出一层， 则称 u 是 v 的**父亲**（parent），v 是 u 的**孩子**（child）。

v 的孩子总数，称作其**度数或度**（degree），记作 deg(v)。无孩子的节点称作**叶节点**（leaf），包括根在内的其余节点皆为内部节点（internal node）。

v 所有的后代及其之间的联边称作**子树**（subtree），记作 subtree(v)。

![[有根树的逻辑结构.png]]

#### 高度
树 T 中所有节点[[5.1 二叉树及其表示#深度与层次|深度]]的最大值称作该树的**高度**（height），记作height(T)。

特别地，本书约定，仅含单个节点的树高度为0，空树高度为-1。

推而广之，任一节点 v 所对应子树 subtree(v) 的高度，亦称作该节点的高度，记作 height(v)。特别地，全树的高度亦即其根节点 r 的高度，height(T) = height(r)。


### 5.1.2 二叉树
![[Pasted image 20220405161653.png]]

如图5.2所示，二叉树（binary tree）中每个节点的度数均**不超过2**。

因此在二叉树中，同一父节点的孩子都可以左、右相互区分——此时，亦称作**有序二叉树**（ordered binary tree）。本书所提到的二叉树，默认地都是有序的。

### 5.1.3 多叉树
一般地，树中各节点的孩子数目并不确定。每个节点的孩子均不超过 k 个的有根树，称作 k 叉树（k-ary tree）。

#### 父节点
在多叉树中，根节点以外的任一节点有且仅有一个父节点。

将各节点组织为向量或列表，其中每个元素除保存**节点本身的信息**（data）外，还需要保存**父节点（parent）的秩或位置**。可为树根指定一个虚构的父节点 -1 或NULL，以便统一判断。
![[Pasted image 20220405162142.png]]

- 所有向量或列表所占的空间总量为 O(n)，线性正比于节点总数 n。
- 时间方面，仅需常数时间，即可确定任一节点的父节点；
- 但反过来，孩子节点的查找却不得不花费 O(n) 时间访遍所有节点。

#### 孩子节点
若注重孩子节点的快速定位，可如图5.4所示，令各节点将其所有的孩子组织为一个向量或列表。如此，对于拥有 r 个孩子的节点，可在 **O(r + 1)** 时间内列举出其所有的孩子。
![[Pasted image 20220405162446.png]]

#### 父节点 + 孩子节点
以上父节点表示法和孩子节点表示法各有所长，但也各有所短。为综合二者的优势，消除缺点，可如图5.5所示令各节点既记录父节点，同时也维护一个序列以保存所有孩子。

尽管如此可以高效地*兼顾对父节点和孩子的定位*，但在节点插入与删除操作频繁的场合，为动态地维护和更新树的拓扑结构，不得不反复地遍历和调整一些节点所对应的孩子序列。然而，向量和列表等线性结构的此类操作都需耗费大量时间，势必影响到整体的效率。

![[Pasted image 20220405162533.png]]

#### 有序多叉树 = 二叉树
解决上述难题的方法之一，就是采用支持高效动态调整的二叉树结构。为此，必须首先建立起从多叉树到二叉树的某种转换关系，并使得在此转换的意义下，任一多叉树都等价于某棵二叉树。

当然，为了保证作为多叉树特例的二叉树有足够的能力表示任何一棵多叉树，我们只需给多叉树增加一项约束条件——*同一节点的所有孩子之间必须具有某一线性次序*。

仿照有序二叉树的定义，凡符合这一条件的多叉树也称作**有序树**（ordered tree）。通常根节点的分支可以按照字典序排列

#### 长子 + 兄弟
由图5.6(a)的实例可见，有序多叉树中任一非叶节点都有唯一的**“长子”** ，而且从该 “长子” 出发，可按照预先约定或指定的次序遍历所有孩子节点。因此可如图(b)所示，为每个节点设置两个指针，分别指向其 **“长子”** 和**下一“ 兄弟”** 。
![[Pasted image 20220405163134.png]]

现在，若将这两个指针分别与二叉树节点的左、右孩子指针统一对应起来，则可进一步地将原有序多叉树转换为如图(c)所示的**常规二叉树**。

### 二叉树
**有序有根树 = 二叉树**
Binary Tree：节点度数不超过 2
孩子（子树）可以左右区分（有序）
- lc() ~ lSubtree()
- rc() ~ rSubtree()
<img src="https://silas-py-oss.oss-cn-chengdu.aliyuncs.com/img/Pasted image 20220408084438.png"/>

- 深度为 k 的二叉树，至多有 2^k个节点
- n 个节点，高为 h 的二叉树满足 h + 1 <= n <= 2^(h+1) -1
- 特殊情况：
	- n = h + 1：退化为一条单链
	- n = 2^(h+1) - 1 ：为满二叉树

#### 基数
- 设度数为 0、1、2 的节点各有n0、n1、n2个
- 边数 **e = n - 1** = n1 + 2 * n2
	- 1/2 度节点对应于 1/2 条入边
- 叶节点树 **n0 = n2 + 1**
	- n1 与 n0 无关：h = 0 时，1 = 0 + 1；此后，n0与n2同步递增
- 节点数 n = n0 + n1 + n2 = 1 + n1 + 2n2
- 当 n1 = 0 时，有 e = 2 * n2 和 n0 = n2 + 1 = (n + 1) / 2
	- 此时，节点数为偶数，不含单分支节点

![[Pasted image 20220408085600.png]]



