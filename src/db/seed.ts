// Reference-data seed for Path Pointer.
//
// This seeds ONLY reference/catalog data (topics, subtopics, problems, top 150,
// roadmap). It does NOT create fake users, fake solves, or fake progress. The
// backend always reads this data from PostgreSQL at runtime.
//
// Run with: npx tsx src/db/seed.ts   (or the seed npm script)

import { config } from "dotenv";
config({ path: ".env.local" });
console.log("Seeding into:", process.env.DATABASE_URL?.split("@")[1]);
import { db, pool } from "./index";
import {
  topics,
  subtopics,
  problems,
  top150Problems,
  roadmapTopics,
  roadmapSubtopics,
} from "./schema";

interface SeedProblem {
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  subtopic?: string;
  top150?: boolean;
  url?: string;
}

interface SeedSubtopic {
  name: string;
  slug: string;
}

interface SeedTopic {
  name: string;
  slug: string;
  description: string;
  stage: number;
  subtopics: SeedSubtopic[];
  problems: SeedProblem[];
}

const lc = (slug: string) => `https://leetcode.com/problems/${slug}/`;

// REPLACEMENT for the `DATA: SeedTopic[]` constant in src/db/seed.ts
//
// This merges your original 8 topics (all existing problems kept, new
// official "Top Interview 150" problems appended where they fit) plus 8
// new topics for categories that had no good existing home: Matrix,
// Intervals, Trie, Backtracking, Divide & Conquer, Heap, Bit Manipulation,
// Math.
//
// HOW TO USE:
// 1. Open src/db/seed.ts
// 2. Select the entire `const DATA: SeedTopic[] = [ ... ];` block
// 3. Replace it with everything below (from "const DATA" to the closing "];")
// 4. Save, then run: npm run db:push (accept the new NOT NULL/rename
//    prompts the same way as before — these are brand new topics/problems,
//    so there's no existing data at risk for the new topics; for the 8
//    existing topics you already resolved column prompts on so there
//    should be no further schema questions unless a column is genuinely
//    new)
// 5. Re-run the seed with a correctly-set DATABASE_URL, e.g. in PowerShell:
//    $env:DATABASE_URL="<your connection string>"; npx tsx src/db/seed.ts

const DATA: SeedTopic[] = [
  {
    name: "Arrays & Hashing",
    slug: "arrays-hashing",
    description: "Foundational array manipulation and hashing techniques.",
    stage: 1,
    subtopics: [
      { name: "Two Pointers", slug: "two-pointers" },
      { name: "Prefix Sum", slug: "prefix-sum" },
      { name: "Hashing", slug: "hashing" },
    ],
    problems: [
      { title: "Two Sum", slug: "two-sum", difficulty: "Easy", subtopic: "hashing", top150: true },
      { title: "Contains Duplicate", slug: "contains-duplicate", difficulty: "Easy", subtopic: "hashing" },
      { title: "Valid Anagram", slug: "valid-anagram", difficulty: "Easy", subtopic: "hashing", top150: true },
      { title: "Group Anagrams", slug: "group-anagrams", difficulty: "Medium", subtopic: "hashing", top150: true },
      { title: "Top K Frequent Elements", slug: "top-k-frequent-elements", difficulty: "Medium", subtopic: "hashing", top150: true },
      { title: "Product of Array Except Self", slug: "product-of-array-except-self", difficulty: "Medium", subtopic: "prefix-sum", top150: true },
      { title: "Longest Consecutive Sequence", slug: "longest-consecutive-sequence", difficulty: "Medium", subtopic: "hashing", top150: true },
      { title: "Trapping Rain Water", slug: "trapping-rain-water", difficulty: "Hard", subtopic: "two-pointers", top150: true },
      // --- Top 150 additions ---
      { title: "Merge Sorted Array", slug: "merge-sorted-array", difficulty: "Easy", top150: true },
      { title: "Remove Element", slug: "remove-element", difficulty: "Easy", top150: true },
      { title: "Remove Duplicates from Sorted Array", slug: "remove-duplicates-from-sorted-array", difficulty: "Easy", top150: true },
      { title: "Remove Duplicates from Sorted Array II", slug: "remove-duplicates-from-sorted-array-ii", difficulty: "Medium", top150: true },
      { title: "Majority Element", slug: "majority-element", difficulty: "Easy", top150: true },
      { title: "Rotate Array", slug: "rotate-array", difficulty: "Medium", top150: true },
      { title: "Best Time to Buy and Sell Stock II", slug: "best-time-to-buy-and-sell-stock-ii", difficulty: "Medium", top150: true },
      { title: "Jump Game", slug: "jump-game", difficulty: "Medium", top150: true },
      { title: "Jump Game II", slug: "jump-game-ii", difficulty: "Medium", top150: true },
      { title: "H-Index", slug: "h-index", difficulty: "Medium", top150: true },
      { title: "Insert Delete GetRandom O(1)", slug: "insert-delete-getrandom-o1", difficulty: "Medium", top150: true },
      { title: "Gas Station", slug: "gas-station", difficulty: "Medium", top150: true },
      { title: "Candy", slug: "candy", difficulty: "Hard", top150: true },
      { title: "Roman to Integer", slug: "roman-to-integer", difficulty: "Easy", top150: true },
      { title: "Integer to Roman", slug: "integer-to-roman", difficulty: "Medium", top150: true },
      { title: "Length of Last Word", slug: "length-of-last-word", difficulty: "Easy", top150: true },
      { title: "Longest Common Prefix", slug: "longest-common-prefix", difficulty: "Easy", top150: true },
      { title: "Reverse Words in a String", slug: "reverse-words-in-a-string", difficulty: "Medium", top150: true },
      { title: "Zigzag Conversion", slug: "zigzag-conversion", difficulty: "Medium", top150: true },
      { title: "Find the Index of the First Occurrence in a String", slug: "find-the-index-of-the-first-occurrence-in-a-string", difficulty: "Easy", top150: true },
      { title: "Text Justification", slug: "text-justification", difficulty: "Hard", top150: true },
      { title: "Ransom Note", slug: "ransom-note", difficulty: "Easy", top150: true },
      { title: "Isomorphic Strings", slug: "isomorphic-strings", difficulty: "Easy", top150: true },
      { title: "Word Pattern", slug: "word-pattern", difficulty: "Easy", top150: true },
      { title: "Happy Number", slug: "happy-number", difficulty: "Easy", top150: true },
      { title: "Contains Duplicate II", slug: "contains-duplicate-ii", difficulty: "Easy", top150: true },
      { title: "Maximum Subarray", slug: "maximum-subarray", difficulty: "Medium", top150: true },
      { title: "Maximum Sum Circular Subarray", slug: "maximum-sum-circular-subarray", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Two Pointers & Sliding Window",
    slug: "two-pointers-sliding-window",
    description: "Efficient linear scans using pointers and windows.",
    stage: 1,
    subtopics: [
      { name: "Sliding Window", slug: "sliding-window" },
      { name: "Fast & Slow", slug: "fast-slow" },
    ],
    problems: [
      { title: "Valid Palindrome", slug: "valid-palindrome", difficulty: "Easy", subtopic: "fast-slow", top150: true },
      { title: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "Easy", subtopic: "sliding-window", top150: true },
      { title: "Longest Substring Without Repeating Characters", slug: "longest-substring-without-repeating-characters", difficulty: "Medium", subtopic: "sliding-window", top150: true },
      { title: "3Sum", slug: "3sum", difficulty: "Medium", subtopic: "fast-slow", top150: true },
      { title: "Minimum Window Substring", slug: "minimum-window-substring", difficulty: "Hard", subtopic: "sliding-window", top150: true },
      // --- Top 150 additions ---
      { title: "Is Subsequence", slug: "is-subsequence", difficulty: "Easy", top150: true },
      { title: "Two Sum II - Input Array Is Sorted", slug: "two-sum-ii-input-array-is-sorted", difficulty: "Medium", top150: true },
      { title: "Container With Most Water", slug: "container-with-most-water", difficulty: "Medium", top150: true },
      { title: "Minimum Size Subarray Sum", slug: "minimum-size-subarray-sum", difficulty: "Medium", top150: true },
      { title: "Substring with Concatenation of All Words", slug: "substring-with-concatenation-of-all-words", difficulty: "Hard", top150: true },
    ],
  },
  {
    name: "Stack",
    slug: "stack",
    description: "LIFO structures and monotonic stacks.",
    stage: 2,
    subtopics: [
      { name: "Monotonic Stack", slug: "monotonic-stack" },
      { name: "Parsing", slug: "parsing" },
    ],
    problems: [
      { title: "Valid Parentheses", slug: "valid-parentheses", difficulty: "Easy", subtopic: "parsing", top150: true },
      { title: "Min Stack", slug: "min-stack", difficulty: "Medium", subtopic: "parsing", top150: true },
      { title: "Daily Temperatures", slug: "daily-temperatures", difficulty: "Medium", subtopic: "monotonic-stack" },
      { title: "Largest Rectangle in Histogram", slug: "largest-rectangle-in-histogram", difficulty: "Hard", subtopic: "monotonic-stack", top150: true },
      // --- Top 150 additions ---
      { title: "Simplify Path", slug: "simplify-path", difficulty: "Medium", top150: true },
      { title: "Evaluate Reverse Polish Notation", slug: "evaluate-reverse-polish-notation", difficulty: "Medium", top150: true },
      { title: "Basic Calculator", slug: "basic-calculator", difficulty: "Hard", top150: true },
    ],
  },
  {
    name: "Binary Search",
    slug: "binary-search",
    description: "Searching sorted spaces and answer-space search.",
    stage: 2,
    subtopics: [
      { name: "Classic", slug: "classic" },
      { name: "On Answer", slug: "on-answer" },
    ],
    problems: [
      { title: "Binary Search", slug: "binary-search", difficulty: "Easy", subtopic: "classic", top150: true },
      { title: "Search a 2D Matrix", slug: "search-a-2d-matrix", difficulty: "Medium", subtopic: "classic", top150: true },
      { title: "Koko Eating Bananas", slug: "koko-eating-bananas", difficulty: "Medium", subtopic: "on-answer" },
      { title: "Median of Two Sorted Arrays", slug: "median-of-two-sorted-arrays", difficulty: "Hard", subtopic: "classic", top150: true },
      // --- Top 150 additions ---
      { title: "Search Insert Position", slug: "search-insert-position", difficulty: "Easy", top150: true },
      { title: "Find Peak Element", slug: "find-peak-element", difficulty: "Medium", top150: true },
      { title: "Search in Rotated Sorted Array", slug: "search-in-rotated-sorted-array", difficulty: "Medium", top150: true },
      { title: "Find First and Last Position of Element in Sorted Array", slug: "find-first-and-last-position-of-element-in-sorted-array", difficulty: "Medium", top150: true },
      { title: "Find Minimum in Rotated Sorted Array", slug: "find-minimum-in-rotated-sorted-array", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Linked List",
    slug: "linked-list",
    description: "Pointer manipulation over linked structures.",
    stage: 2,
    subtopics: [
      { name: "Reversal", slug: "reversal" },
      { name: "Cycle", slug: "cycle" },
    ],
    problems: [
      { title: "Reverse Linked List", slug: "reverse-linked-list", difficulty: "Easy", subtopic: "reversal", top150: true },
      { title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "Easy", subtopic: "reversal", top150: true },
      { title: "Linked List Cycle", slug: "linked-list-cycle", difficulty: "Easy", subtopic: "cycle", top150: true },
      { title: "Reorder List", slug: "reorder-list", difficulty: "Medium", subtopic: "reversal" },
      { title: "Merge k Sorted Lists", slug: "merge-k-sorted-lists", difficulty: "Hard", subtopic: "reversal", top150: true },
      // --- Top 150 additions ---
      { title: "Add Two Numbers", slug: "add-two-numbers", difficulty: "Medium", top150: true },
      { title: "Copy List with Random Pointer", slug: "copy-list-with-random-pointer", difficulty: "Medium", top150: true },
      { title: "Reverse Linked List II", slug: "reverse-linked-list-ii", difficulty: "Medium", top150: true },
      { title: "Reverse Nodes in k-Group", slug: "reverse-nodes-in-k-group", difficulty: "Hard", top150: true },
      { title: "Remove Nth Node From End of List", slug: "remove-nth-node-from-end-of-list", difficulty: "Medium", top150: true },
      { title: "Remove Duplicates from Sorted List II", slug: "remove-duplicates-from-sorted-list-ii", difficulty: "Medium", top150: true },
      { title: "Rotate List", slug: "rotate-list", difficulty: "Medium", top150: true },
      { title: "Partition List", slug: "partition-list", difficulty: "Medium", top150: true },
      { title: "LRU Cache", slug: "lru-cache", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Trees",
    slug: "trees",
    description: "Binary trees, BSTs, and traversals.",
    stage: 3,
    subtopics: [
      { name: "Traversal", slug: "traversal" },
      { name: "BST", slug: "bst" },
    ],
    problems: [
      { title: "Invert Binary Tree", slug: "invert-binary-tree", difficulty: "Easy", subtopic: "traversal", top150: true },
      { title: "Maximum Depth of Binary Tree", slug: "maximum-depth-of-binary-tree", difficulty: "Easy", subtopic: "traversal", top150: true },
      { title: "Same Tree", slug: "same-tree", difficulty: "Easy", subtopic: "traversal", top150: true },
      { title: "Binary Tree Level Order Traversal", slug: "binary-tree-level-order-traversal", difficulty: "Medium", subtopic: "traversal", top150: true },
      { title: "Validate Binary Search Tree", slug: "validate-binary-search-tree", difficulty: "Medium", subtopic: "bst", top150: true },
      { title: "Binary Tree Maximum Path Sum", slug: "binary-tree-maximum-path-sum", difficulty: "Hard", subtopic: "traversal", top150: true },
      // --- Top 150 additions ---
      { title: "Symmetric Tree", slug: "symmetric-tree", difficulty: "Easy", top150: true },
      { title: "Construct Binary Tree from Preorder and Inorder Traversal", slug: "construct-binary-tree-from-preorder-and-inorder-traversal", difficulty: "Medium", top150: true },
      { title: "Construct Binary Tree from Inorder and Postorder Traversal", slug: "construct-binary-tree-from-inorder-and-postorder-traversal", difficulty: "Medium", top150: true },
      { title: "Populating Next Right Pointers in Each Node II", slug: "populating-next-right-pointers-in-each-node-ii", difficulty: "Medium", top150: true },
      { title: "Flatten Binary Tree to Linked List", slug: "flatten-binary-tree-to-linked-list", difficulty: "Medium", top150: true },
      { title: "Path Sum", slug: "path-sum", difficulty: "Easy", top150: true },
      { title: "Sum Root to Leaf Numbers", slug: "sum-root-to-leaf-numbers", difficulty: "Medium", top150: true },
      { title: "Binary Search Tree Iterator", slug: "binary-search-tree-iterator", difficulty: "Medium", top150: true },
      { title: "Count Complete Tree Nodes", slug: "count-complete-tree-nodes", difficulty: "Medium", top150: true },
      { title: "Lowest Common Ancestor of a Binary Tree", slug: "lowest-common-ancestor-of-a-binary-tree", difficulty: "Medium", top150: true },
      { title: "Binary Tree Right Side View", slug: "binary-tree-right-side-view", difficulty: "Medium", top150: true },
      { title: "Average of Levels in Binary Tree", slug: "average-of-levels-in-binary-tree", difficulty: "Easy", top150: true },
      { title: "Binary Tree Zigzag Level Order Traversal", slug: "binary-tree-zigzag-level-order-traversal", difficulty: "Medium", top150: true },
      { title: "Minimum Absolute Difference in BST", slug: "minimum-absolute-difference-in-bst", difficulty: "Easy", top150: true },
      { title: "Kth Smallest Element in a BST", slug: "kth-smallest-element-in-a-bst", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Graphs",
    slug: "graphs",
    description: "BFS/DFS, union-find, and topological sort.",
    stage: 4,
    subtopics: [
      { name: "BFS/DFS", slug: "bfs-dfs" },
      { name: "Topological Sort", slug: "topo-sort" },
    ],
    problems: [
      { title: "Number of Islands", slug: "number-of-islands", difficulty: "Medium", subtopic: "bfs-dfs", top150: true },
      { title: "Clone Graph", slug: "clone-graph", difficulty: "Medium", subtopic: "bfs-dfs", top150: true },
      { title: "Course Schedule", slug: "course-schedule", difficulty: "Medium", subtopic: "topo-sort", top150: true },
      { title: "Pacific Atlantic Water Flow", slug: "pacific-atlantic-water-flow", difficulty: "Medium", subtopic: "bfs-dfs" },
      { title: "Word Ladder", slug: "word-ladder", difficulty: "Hard", subtopic: "bfs-dfs", top150: true },
      // --- Top 150 additions ---
      { title: "Surrounded Regions", slug: "surrounded-regions", difficulty: "Medium", top150: true },
      { title: "Evaluate Division", slug: "evaluate-division", difficulty: "Medium", top150: true },
      { title: "Course Schedule II", slug: "course-schedule-ii", difficulty: "Medium", top150: true },
      { title: "Snakes and Ladders", slug: "snakes-and-ladders", difficulty: "Medium", top150: true },
      { title: "Minimum Genetic Mutation", slug: "minimum-genetic-mutation", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Dynamic Programming",
    slug: "dynamic-programming",
    description: "Overlapping subproblems and optimal substructure.",
    stage: 5,
    subtopics: [
      { name: "1D DP", slug: "1d-dp" },
      { name: "2D DP", slug: "2d-dp" },
      { name: "Knapsack", slug: "knapsack" },
    ],
    problems: [
      { title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy", subtopic: "1d-dp", top150: true },
      { title: "House Robber", slug: "house-robber", difficulty: "Medium", subtopic: "1d-dp", top150: true },
      { title: "Coin Change", slug: "coin-change", difficulty: "Medium", subtopic: "knapsack", top150: true },
      { title: "Longest Increasing Subsequence", slug: "longest-increasing-subsequence", difficulty: "Medium", subtopic: "1d-dp", top150: true },
      { title: "Unique Paths", slug: "unique-paths", difficulty: "Medium", subtopic: "2d-dp", top150: true },
      { title: "Edit Distance", slug: "edit-distance", difficulty: "Hard", subtopic: "2d-dp", top150: true },
      { title: "Regular Expression Matching", slug: "regular-expression-matching", difficulty: "Hard", subtopic: "2d-dp" },
      // --- Top 150 additions ---
      { title: "Word Break", slug: "word-break", difficulty: "Medium", top150: true },
      { title: "Triangle", slug: "triangle", difficulty: "Medium", top150: true },
      { title: "Minimum Path Sum", slug: "minimum-path-sum", difficulty: "Medium", top150: true },
      { title: "Unique Paths II", slug: "unique-paths-ii", difficulty: "Medium", top150: true },
      { title: "Longest Palindromic Substring", slug: "longest-palindromic-substring", difficulty: "Medium", top150: true },
      { title: "Interleaving String", slug: "interleaving-string", difficulty: "Medium", top150: true },
      { title: "Best Time to Buy and Sell Stock III", slug: "best-time-to-buy-and-sell-stock-iii", difficulty: "Hard", top150: true },
      { title: "Best Time to Buy and Sell Stock IV", slug: "best-time-to-buy-and-sell-stock-iv", difficulty: "Hard", top150: true },
      { title: "Maximal Square", slug: "maximal-square", difficulty: "Medium", top150: true },
    ],
  },
  // ============ NEW TOPICS (no good existing fit) ============
  {
    name: "Matrix",
    slug: "matrix",
    description: "2D grid manipulation and traversal.",
    stage: 2,
    subtopics: [],
    problems: [
      { title: "Valid Sudoku", slug: "valid-sudoku", difficulty: "Medium", top150: true },
      { title: "Spiral Matrix", slug: "spiral-matrix", difficulty: "Medium", top150: true },
      { title: "Rotate Image", slug: "rotate-image", difficulty: "Medium", top150: true },
      { title: "Set Matrix Zeroes", slug: "set-matrix-zeroes", difficulty: "Medium", top150: true },
      { title: "Game of Life", slug: "game-of-life", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Intervals",
    slug: "intervals",
    description: "Merging, inserting, and reasoning about ranges.",
    stage: 2,
    subtopics: [],
    problems: [
      { title: "Summary Ranges", slug: "summary-ranges", difficulty: "Easy", top150: true },
      { title: "Merge Intervals", slug: "merge-intervals", difficulty: "Medium", top150: true },
      { title: "Insert Interval", slug: "insert-interval", difficulty: "Medium", top150: true },
      { title: "Minimum Number of Arrows to Burst Balloons", slug: "minimum-number-of-arrows-to-burst-balloons", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Trie",
    slug: "trie",
    description: "Prefix trees for string search problems.",
    stage: 3,
    subtopics: [],
    problems: [
      { title: "Implement Trie (Prefix Tree)", slug: "implement-trie-prefix-tree", difficulty: "Medium", top150: true },
      { title: "Design Add and Search Words Data Structure", slug: "design-add-and-search-words-data-structure", difficulty: "Medium", top150: true },
      { title: "Word Search II", slug: "word-search-ii", difficulty: "Hard", top150: true },
    ],
  },
  {
    name: "Backtracking",
    slug: "backtracking",
    description: "Exhaustive search with pruning.",
    stage: 3,
    subtopics: [],
    problems: [
      { title: "Letter Combinations of a Phone Number", slug: "letter-combinations-of-a-phone-number", difficulty: "Medium", top150: true },
      { title: "Combinations", slug: "combinations", difficulty: "Medium", top150: true },
      { title: "Permutations", slug: "permutations", difficulty: "Medium", top150: true },
      { title: "Combination Sum", slug: "combination-sum", difficulty: "Medium", top150: true },
      { title: "N-Queens II", slug: "n-queens-ii", difficulty: "Hard", top150: true },
      { title: "Generate Parentheses", slug: "generate-parentheses", difficulty: "Medium", top150: true },
      { title: "Word Search", slug: "word-search", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Divide & Conquer",
    slug: "divide-and-conquer",
    description: "Splitting problems into independent subproblems.",
    stage: 3,
    subtopics: [],
    problems: [
      { title: "Convert Sorted Array to Binary Search Tree", slug: "convert-sorted-array-to-binary-search-tree", difficulty: "Easy", top150: true },
      { title: "Sort List", slug: "sort-list", difficulty: "Medium", top150: true },
      { title: "Construct Quad Tree", slug: "construct-quad-tree", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Heap",
    slug: "heap",
    description: "Priority queues for top-k and streaming problems.",
    stage: 3,
    subtopics: [],
    problems: [
      { title: "Kth Largest Element in an Array", slug: "kth-largest-element-in-an-array", difficulty: "Medium", top150: true },
      { title: "IPO", slug: "ipo", difficulty: "Hard", top150: true },
      { title: "Find K Pairs with Smallest Sums", slug: "find-k-pairs-with-smallest-sums", difficulty: "Medium", top150: true },
      { title: "Find Median from Data Stream", slug: "find-median-from-data-stream", difficulty: "Hard", top150: true },
    ],
  },
  {
    name: "Bit Manipulation",
    slug: "bit-manipulation",
    description: "Working directly with binary representations.",
    stage: 2,
    subtopics: [],
    problems: [
      { title: "Add Binary", slug: "add-binary", difficulty: "Easy", top150: true },
      { title: "Reverse Bits", slug: "reverse-bits", difficulty: "Easy", top150: true },
      { title: "Number of 1 Bits", slug: "number-of-1-bits", difficulty: "Easy", top150: true },
      { title: "Single Number", slug: "single-number", difficulty: "Easy", top150: true },
      { title: "Single Number II", slug: "single-number-ii", difficulty: "Medium", top150: true },
      { title: "Bitwise AND of Numbers Range", slug: "bitwise-and-of-numbers-range", difficulty: "Medium", top150: true },
    ],
  },
  {
    name: "Math",
    slug: "math",
    description: "Numeric reasoning and formula-driven problems.",
    stage: 1,
    subtopics: [],
    problems: [
      { title: "Palindrome Number", slug: "palindrome-number", difficulty: "Easy", top150: true },
      { title: "Plus One", slug: "plus-one", difficulty: "Easy", top150: true },
      { title: "Factorial Trailing Zeroes", slug: "factorial-trailing-zeroes", difficulty: "Medium", top150: true },
      { title: "Sqrt(x)", slug: "sqrtx", difficulty: "Easy", top150: true },
      { title: "Pow(x, n)", slug: "powx-n", difficulty: "Medium", top150: true },
      { title: "Max Points on a Line", slug: "max-points-on-a-line", difficulty: "Hard", top150: true },
    ],
  },
];


async function seed() {
  console.log("Seeding reference data...");

  for (const t of DATA) {
    const [topicRow] = await db
      .insert(topics)
      .values({
        name: t.name,
        slug: t.slug,
        description: t.description,
        displayOrder: DATA.indexOf(t),
      })
      .onConflictDoUpdate({
        target: topics.slug,
        set: { name: t.name, description: t.description, displayOrder: DATA.indexOf(t) },
      })
      .returning();

    const subMap = new Map<string, string>();
    for (let i = 0; i < t.subtopics.length; i += 1) {
      const s = t.subtopics[i];
      const [subRow] = await db
        .insert(subtopics)
        .values({
          topicId: topicRow.id,
          name: s.name,
          slug: s.slug,
          displayOrder: i,
        })
        .onConflictDoUpdate({
          target: [subtopics.topicId, subtopics.slug],
          set: { name: s.name, displayOrder: i },
        })
        .returning();
      subMap.set(s.slug, subRow.id);
    }

    // Roadmap topic + subtopics.
    const [rtRow] = await db
      .insert(roadmapTopics)
      .values({
        topicId: topicRow.id,
        stage: t.stage,
        title: t.name,
        description: t.description,
        displayOrder: DATA.indexOf(t),
      })
      .onConflictDoNothing()
      .returning();
    const roadmapTopicId = rtRow?.id;
    if (roadmapTopicId) {
      for (let i = 0; i < t.subtopics.length; i += 1) {
        const s = t.subtopics[i];
        await db
          .insert(roadmapSubtopics)
          .values({
            roadmapTopicId,
            subtopicId: subMap.get(s.slug) ?? null,
            title: s.name,
            displayOrder: i,
          })
          .onConflictDoNothing();
      }
    }

    for (let i = 0; i < t.problems.length; i += 1) {
      const p = t.problems[i];
      const [problemRow] = await db
        .insert(problems)
        .values({
          topicId: topicRow.id,
          subtopicId: p.subtopic ? subMap.get(p.subtopic) ?? null : null,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          url: p.url ?? lc(p.slug),
          displayOrder: i,
        })
        .onConflictDoUpdate({
          target: problems.slug,
          set: {
            title: p.title,
            difficulty: p.difficulty,
            topicId: topicRow.id,
            subtopicId: p.subtopic ? subMap.get(p.subtopic) ?? null : null,
            displayOrder: i,
          },
        })
        .returning();

      if (p.top150) {
        await db
          .insert(top150Problems)
          .values({
            problemId: problemRow.id,
            topicId: topicRow.id,
            title: p.title,
            slug: p.slug,
            difficulty: p.difficulty,
            url: p.url ?? lc(p.slug),
            displayOrder: i,
          })
          .onConflictDoUpdate({
            target: top150Problems.slug,
            set: {
              problemId: problemRow.id,
              topicId: topicRow.id,
              title: p.title,
              difficulty: p.difficulty,
            },
          });
      }
    }
  }

  console.log("Seed complete.");
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });
