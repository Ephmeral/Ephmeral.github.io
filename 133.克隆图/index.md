# LC 133.克隆图


### 解题思路：

本质是遍历图的所有顶点，然后将每个节点深拷贝到新的顶点，图的遍历自然想到DFS和BFS两种方法

问题的关键在于如何深拷贝每个顶点：

- 首先，用一个哈希表存放旧顶点和新顶点，这样在访问旧顶点的时候，可以快速定位新的顶点
- 其次，遍历过程中，不能用构造函数直接拷贝每个顶点的邻居，需要单独拷贝

### 代码

方法一：DFS

```c++
class Solution {
public:
    unordered_map<Node*, Node*> vis;		//标记旧顶点到新顶点的映射
    Node* cloneGraph(Node* node) {
        if (node == nullptr) return nullptr;//顶点为空的情况
        if (vis.find(node) != vis.end()) {	//如果发现vis中已经访问过旧顶点，直接返回对应的新顶点
            return vis[node];
        }
        Node *clone = new Node(node->val);	//构造一个克隆的新顶点，主要不能直接调用构造函数拷贝邻居
        vis[node] = clone;				   //标记已经访问过当前顶点node，并对应相应的克隆顶点
        for (auto &nb : node->neighbors) {  //对每个邻居加入到新的顶点中，进一步调用cloneGraph
            clone->neighbors.emplace_back(cloneGraph(nb));
        }
        return clone;					  //返回克隆的新顶点
    }
};
```

方法二：BFS

```c++
class Solution {
public:
    Node* cloneGraph(Node* node) {
        if (node == nullptr) return nullptr;
        queue<Node*> que;					   // 用来BFS遍历时，存放顶点
        unordered_map<Node*, Node*> vis; 		// 标记已经访问过的顶点，并映射到克隆的顶点上
        Node *clone = new Node(node->val);	 	// 创建当前顶点的克隆顶点
        que.emplace(node);
        vis[node] = clone;					   // 标记当前顶点node已经访问过
        while (!que.empty()) {
            Node* p = que.front(); que.pop();	// 取出队首的顶点
            for (auto & nb : p->neighbors) {
                if (vis.find(nb) == mp.end()) {	//如果邻居没有访问过，加入到队列中，并且存放到哈希表中
                    vis[nb] = new Node(nb->val);
                    que.emplace(nb);
                }
                mp[p]->neighbors.emplace_back(vis[nb]);//依次将每个顶点加入到克隆顶点的邻居数组中
            }
        }
        return mp[node];					// 返回node对应的克隆顶点，也j
    }
};
```


