# Big Tech Interview Prep Plan — 12 Weeks

**Goal:** Close the DSA/system-design gap while continuing to apply with your current full-stack profile. Daily commitment: 1.5–2 hrs, 6 days/week.

---

## Tracking system

Keep a simple sheet (Notion, Google Sheets, or even a GitHub repo of solutions) with these columns:

| Problem | Pattern | Difficulty | Date attempted | Solved unaided? | Revisit date |
|---|---|---|---|---|---|

Rules:
- If you solve it unaided → mark done, revisit in 2 weeks.
- If you needed a hint or solution → revisit in 3 days, then 1 week.
- Aim for **10–12 problems/week** during weeks 1–8, then shift ratio toward mocks/system design in weeks 9–12.

---

## Weeks 1–2: Foundations
- **DSA:** Arrays, strings, hashmaps, two pointers, sliding window (NeetCode "Arrays & Hashing" + "Two Pointers" sections)
- **CS fundamentals:** DBMS — normalization, indexing, ACID (tie back to your Prisma/Postgres work on Getic)
- **Deliverable:** 20 problems logged, DBMS notes doc

## Weeks 3–4: Linear structures + recursion
- **DSA:** Linked lists, stacks, queues, binary search, recursion basics
- **CS fundamentals:** OS — processes vs threads, memory management basics
- **Deliverable:** 20 problems, first pass through Blind 75 linear-structure set

## Weeks 5–6: Trees & graphs
- **DSA:** Trees, BFS/DFS, tries, union-find, graph traversal
- **CS fundamentals:** Networking — TCP/IP, HTTP/HTTPS, DNS at interview depth
- **System design:** Start here — load balancing, caching basics, CAP theorem (light reading, not deep dive yet)
- **Deliverable:** 24 problems, 1 short system design write-up ("How would Getic handle 1M tickets?")

## Weeks 7–8: Dynamic programming (the hard part)
- **DSA:** DP patterns — knapsack, LCS, DP on grids/strings, memoization vs tabulation
- **CS fundamentals:** OOP/SOLID — rehearse explaining with examples from your own codebase
- **Deliverable:** 20 problems (DP is slow going, that's normal), OOP talking points doc

## Weeks 9–10: Heaps, advanced graphs, mocks begin
- **DSA:** Heaps, advanced graph algorithms (Dijkstra, topological sort), backtracking
- **System design:** Database sharding, message queues, rate limiting — 2 full design write-ups
- **Mocks:** 2 mock DSA interviews (Pramp, friends, or record yourself talking through a LeetCode medium)
- **Deliverable:** 16 problems, 2 system design docs, 2 mocks

## Weeks 11–12: Consolidation + behavioral
- **DSA:** Timed mixed-topic drills — pick 2 random mediums/day, 45 min each, no hints
- **System design:** 2 more write-ups on real-world systems (URL shortener, chat app — you've already built a URL shortener, use it)
- **Behavioral:** Write 6–8 STAR stories from your 3 projects + the n8n pipeline + academic wins (quiz win, GPA). Amazon-style leadership-principle framing especially.
- **Deliverable:** Full mock interview loop (1 DSA + 1 system design + 1 behavioral) with a friend or mentor

---

## Parallel, ongoing (don't block on these — do them alongside)
- Apply to roles every week regardless of DSA progress; your project work already clears the bar for many companies
- 1–2 small open-source PRs over the 12 weeks (good resume signal, low time cost)
- Optional: a few rated Codeforces/CodeChef contests if you enjoy CP — a rating is a strong differentiator but not mandatory

---

## Resources
- NeetCode 150 → Blind 75 → LeetCode mediums/hards by pattern
- *System Design Interview* by Alex Xu (Vol 1) — skim, don't over-invest yet
- ByteByteGo YouTube/newsletter for quick system design refreshers
