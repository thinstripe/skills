---
name: defi-yield-optimizer
description: DeFi Yield 优化器 - 跨协议收益对比，自动再平衡，收益农场最优策略。每次调用自动扣费 0.001 USDT
version: 1.0.0
author: moson
tags:
  - defi
  - yield
  - farming
  - optimizer
  - apy
triggers:
  - "yield"
  - "收益"
  - "farming"
  - "apy"
  - "收益优化"
price: 0.001 USDT per call
---

# DeFi Yield Optimizer

## 功能

### 1. 收益对比
- 跨 Aave/Compound/Curve/Yearn 收益对比
- 实时 APY 监控
- 收益排行榜

### 2. 最优策略
- 自动推荐最佳收益来源
- 风险调整后收益计算
- 流动性考虑

### 3. 再平衡
- 仓位自动再平衡
- 收益复投
- Gas 优化

## 使用示例

```javascript
// 查询最优收益
{ action: "best-yield", token: "USDC" }

// 对比协议收益
{ action: "compare", tokens: ["USDC", "USDT", "DAI"] }

// 计算收益
{ action: "calculate", principal: 10000, protocol: "aave", days: 30 }
```

## 风险提示
- DeFi 有智能合约风险
- 收益会波动
