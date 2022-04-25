# 并查集


## 并查集模板写法

```cpp
class UnionFind {
private:
	int cnt;             // 连通分量
    vector<int> parent;  //x父节点为parent[x]
public:
    UnionFind(int n) {
        cnt = n;
        parent.resize(n);
        // 开始时，每个节点是自己的父节点
        for (int i = 0; i < n; ++i) {
            parent[i] = i;
        }
    }
// 连通两个节点
void connect(int p, int q) {
    int rootP = find(p);
    int rootQ = find(q);
    if (rootP == rootQ) return;
    parent[rootP] = rootQ; // 两个树的根节点合并
    cnt--;
}

// 找到x的根节点
int find(int x) {
    while (parent[x] != x) {
        x = parent[x];
    }
    return x;
}

//判断p, q是否连通
bool isConnected(int p, int q) {
    int rootP = find(p);
    int rootQ = find(q);
    return rootP == rootQ;
}

// 返回有多少连通分量
int count() {
    return cnt;
}
```
};

