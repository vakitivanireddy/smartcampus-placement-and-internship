/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const DAY = 24 * 60 * 60 * 1000;

function addDays(days, base = new Date()) {
  return new Date(base.getTime() + days * DAY).toISOString().slice(0, 10);
}

function dateTime(days, hour = 10) {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const skills = [
  ['Java', 'programming', 'Object-oriented JVM language widely used in enterprise backends.', 'https://dev.java/learn/'],
  ['Python', 'programming', 'General-purpose language used for data, automation and backend services.', 'https://docs.python.org/3/tutorial/'],
  ['JavaScript', 'programming', 'The language of the web, also used for Node.js services.', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript'],
  ['TypeScript', 'programming', 'Typed superset of JavaScript for safer large applications.', 'https://www.typescriptlang.org/docs/'],
  ['C', 'programming', 'Low-level language used in systems and embedded software.', 'https://en.cppreference.com/w/c'],
  ['C++', 'programming', 'High-performance language used in systems, games and embedded work.', 'https://isocpp.org/faq'],
  ['Go', 'programming', 'Compiled language popular for cloud services and tooling.', 'https://go.dev/tour/'],
  ['Kotlin', 'programming', 'Modern JVM language used for Android and backend development.', 'https://kotlinlang.org/docs/home.html'],
  ['SQL', 'database', 'Query language for relational data.', 'https://sqlbolt.com/'],
  ['HTML', 'framework', 'Markup language for structuring web pages.', 'https://developer.mozilla.org/en-US/docs/Web/HTML'],
  ['CSS', 'framework', 'Styling language for responsive web interfaces.', 'https://developer.mozilla.org/en-US/docs/Web/CSS'],
  ['React', 'framework', 'Component-based JavaScript UI library.', 'https://react.dev/learn'],
  ['Node.js', 'framework', 'JavaScript runtime for server-side applications.', 'https://nodejs.org/en/learn'],
  ['Express.js', 'framework', 'Minimal Node.js web framework for REST APIs.', 'https://expressjs.com/en/guide/routing.html'],
  ['Spring Boot', 'framework', 'Java framework for production-ready Spring applications.', 'https://spring.io/guides/gs/spring-boot'],
  ['Django', 'framework', 'Batteries-included Python web framework.', 'https://docs.djangoproject.com/en/stable/intro/tutorial01/'],
  ['Flask', 'framework', 'Lightweight Python web framework.', 'https://flask.palletsprojects.com/en/stable/tutorial/'],
  ['Angular', 'framework', 'TypeScript-based frontend framework.', 'https://angular.dev/overview'],
  ['Next.js', 'framework', 'React framework for full-stack web applications.', 'https://nextjs.org/learn'],
  ['REST APIs', 'framework', 'Design and consumption of HTTP APIs.', 'https://restfulapi.net/'],
  ['Tailwind CSS', 'framework', 'Utility-first CSS framework.', 'https://tailwindcss.com/docs/installation'],
  ['Bootstrap', 'framework', 'Responsive CSS component framework.', 'https://getbootstrap.com/docs/5.3/getting-started/introduction/'],
  ['MySQL', 'database', 'Popular open-source relational database.', 'https://dev.mysql.com/doc/refman/8.0/en/'],
  ['PostgreSQL', 'database', 'Advanced open-source relational database.', 'https://www.postgresql.org/docs/current/tutorial.html'],
  ['MongoDB', 'database', 'Document-oriented NoSQL database.', 'https://www.mongodb.com/docs/manual/tutorial/'],
  ['Redis', 'database', 'In-memory data store for caching and queues.', 'https://redis.io/docs/latest/develop/'],
  ['Git', 'tool', 'Distributed version control system.', 'https://git-scm.com/book/en/v2'],
  ['GitHub', 'tool', 'Code hosting and collaboration platform.', 'https://docs.github.com/en'],
  ['Docker', 'tool', 'Container platform for reproducible environments.', 'https://docs.docker.com/get-started/'],
  ['Kubernetes', 'tool', 'Container orchestration platform.', 'https://kubernetes.io/docs/tutorials/'],
  ['AWS', 'tool', 'Amazon Web Services cloud platform.', 'https://docs.aws.amazon.com/'],
  ['Linux', 'tool', 'Unix-like operating system and command line.', 'https://linuxjourney.com/'],
  ['Postman', 'tool', 'API development and testing tool.', 'https://learning.postman.com/docs/introduction/overview/'],
  ['Jira', 'tool', 'Agile issue and project tracking tool.', 'https://www.atlassian.com/software/jira/guides'],
  ['Figma', 'tool', 'Collaborative interface design tool.', 'https://help.figma.com/hc/en-us'],
  ['Excel', 'tool', 'Spreadsheet tool for analysis and reporting.', 'https://support.microsoft.com/en-us/excel'],
  ['Power BI', 'tool', 'Microsoft business intelligence and dashboard tool.', 'https://learn.microsoft.com/en-us/power-bi/'],
  ['Tableau', 'tool', 'Data visualisation and analytics platform.', 'https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm'],
  ['Data Structures and Algorithms', 'concept', 'Core problem-solving patterns used in coding interviews.', 'https://www.geeksforgeeks.org/data-structures/'],
  ['Object-Oriented Programming', 'concept', 'Designing software around objects, interfaces and responsibilities.', 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/'],
  ['DBMS', 'concept', 'Database design, normalisation, transactions and indexing.', 'https://www.geeksforgeeks.org/dbms/'],
  ['Operating Systems', 'concept', 'Processes, scheduling, memory, file systems and concurrency.', 'https://pages.cs.wisc.edu/~remzi/OSTEP/'],
  ['Computer Networks', 'concept', 'Networking layers, TCP/IP, HTTP and network security basics.', 'https://www.geeksforgeeks.org/computer-network-tutorials/'],
  ['System Design', 'concept', 'Designing scalable, reliable distributed systems.', 'https://github.com/donnemartin/system-design-primer'],
  ['Machine Learning', 'concept', 'Supervised, unsupervised and model evaluation fundamentals.', 'https://scikit-learn.org/stable/getting_started.html'],
  ['Data Analysis', 'concept', 'Cleaning, exploring and interpreting data with code.', 'https://pandas.pydata.org/docs/user_guide/10min.html'],
  ['Statistics', 'concept', 'Probability, distributions, inference and experiment design.', 'https://www.khanacademy.org/math/statistics-probability'],
  ['Problem Solving', 'concept', 'Structured analytical and algorithmic thinking.', 'https://www.hackerrank.com/domains/algorithms'],
  ['Communication', 'soft', 'Clear written and verbal communication for teams and interviews.', 'https://www.coursera.org/learn/wharton-communication-skills'],
  ['Aptitude', 'soft', 'Quantitative, logical and verbal reasoning for placement tests.', 'https://www.indiabix.com/aptitude/questions-and-answers/'],
  ['Agile', 'concept', 'Iterative delivery practices, ceremonies and collaboration.', 'https://www.atlassian.com/agile'],
];

const roleSkills = {
  'Java Developer': [
    ['Java', 'required', 4], ['Data Structures and Algorithms', 'required', 4], ['SQL', 'required', 3],
    ['Spring Boot', 'required', 3], ['REST APIs', 'required', 3], ['Object-Oriented Programming', 'required', 4],
    ['DBMS', 'required', 3], ['Git', 'required', 3], ['Docker', 'preferred', 2],
  ],
  'Full Stack Developer': [
    ['JavaScript', 'required', 4], ['React', 'required', 4], ['Node.js', 'required', 3], ['SQL', 'required', 3],
    ['REST APIs', 'required', 3], ['HTML', 'required', 3], ['CSS', 'required', 3], ['Git', 'required', 3],
    ['TypeScript', 'preferred', 3], ['Docker', 'preferred', 2],
  ],
  'Frontend Developer': [
    ['HTML', 'required', 4], ['CSS', 'required', 4], ['JavaScript', 'required', 4], ['React', 'required', 4],
    ['Git', 'required', 3], ['TypeScript', 'preferred', 3], ['Tailwind CSS', 'preferred', 2], ['Figma', 'preferred', 2],
  ],
  'Backend Developer': [
    ['Java', 'required', 3], ['Node.js', 'required', 3], ['SQL', 'required', 4], ['REST APIs', 'required', 4],
    ['DBMS', 'required', 3], ['Docker', 'required', 3], ['Git', 'required', 3], ['Spring Boot', 'preferred', 3],
    ['System Design', 'preferred', 3],
  ],
  'Data Analyst': [
    ['SQL', 'required', 4], ['Python', 'required', 3], ['Excel', 'required', 3], ['Data Analysis', 'required', 3],
    ['Statistics', 'required', 3], ['Communication', 'required', 3], ['Power BI', 'preferred', 3], ['Tableau', 'preferred', 3],
  ],
  'Data Scientist': [
    ['Python', 'required', 4], ['Machine Learning', 'required', 4], ['Data Analysis', 'required', 4],
    ['Statistics', 'required', 4], ['SQL', 'required', 3], ['Communication', 'preferred', 3],
  ],
  'DevOps Engineer': [
    ['Linux', 'required', 4], ['Docker', 'required', 4], ['Git', 'required', 3], ['Kubernetes', 'required', 3],
    ['AWS', 'required', 3], ['Computer Networks', 'required', 3], ['Problem Solving', 'required', 3], ['Python', 'preferred', 2],
  ],
};

const topics = [
  {
    slug: 'dsa',
    title: 'Data Structures and Algorithms',
    category: 'DSA',
    description: 'Build interview-ready problem solving with arrays, hashing, trees, graphs and dynamic programming.',
    estimated_minutes: 2400,
    content: `## What to focus on
Most placement coding rounds reward pattern recognition, not memorising solutions. Start with complexity analysis, then move through arrays, strings, hashing, linked lists, stacks/queues, trees, graphs and dynamic programming.

## A practical sequence
1. Arrays and two pointers: traversal, prefix sums, sliding window.
2. Hashing: frequency maps, duplicate detection, pair sums.
3. Strings: palindromes, anagrams, pattern matching.
4. Linked lists, stacks and queues.
5. Trees: traversals, BST properties, lowest common ancestor.
6. Graphs: BFS, DFS, topological sort, shortest paths.
7. Dynamic programming: 1D state, knapsack patterns, grid paths.
8. Greedy and binary search on answers.

## Interview habits
- Clarify constraints before coding.
- State a brute-force approach, then optimise.
- Dry-run on edge cases: empty input, duplicates, negative values, one element.
- Write clean code, then analyse time and space complexity out loud.

Do not mark a topic complete just because you watched a video. Complete it when you can solve representative problems without looking at the solution.`,
    resources: [
      ['NeetCode Roadmap', 'https://neetcode.io/roadmap', 'NeetCode', 'course'],
      ['Striver A2Z DSA Sheet', 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/', 'Take U Forward', 'course'],
      ['GeeksforGeeks Data Structures Tutorial', 'https://www.geeksforgeeks.org/data-structures/', 'GeeksforGeeks', 'article'],
      ['LeetCode Problem Set', 'https://leetcode.com/problemset/', 'LeetCode', 'practice'],
      ['CP-Algorithms', 'https://cp-algorithms.com/', 'CP-Algorithms', 'article'],
      ['Big-O Cheat Sheet', 'https://www.bigocheatsheet.com/', 'Big-O Cheat Sheet', 'article'],
    ],
    tasks: [
      ['Solve 10 array and string problems', 'Focus on two pointers and sliding windows. Record the pattern and complexity for each.'],
      ['Implement core structures from scratch', 'Build a dynamic array, linked list, stack, queue, hash map and BST in your preferred language.'],
      ['Complete one graph problem set', 'Practice BFS, DFS and topological sort on at least six problems.'],
      ['Do a timed mock coding round', 'Solve two medium problems in 60 minutes without editorial help, then review your mistakes.'],
    ],
  },
  {
    slug: 'programming-languages',
    title: 'Programming Languages',
    category: 'Programming',
    description: 'Strengthen one primary language and learn the idioms interviewers expect.',
    estimated_minutes: 900,
    content: `## Pick one primary language
Choose the language you will use in coding rounds and in your strongest project. Java, Python, JavaScript/TypeScript and C++ are all accepted by most companies. Depth beats a long list on a resume.

## Topics to revise
- Syntax you use daily: collections, strings, loops, functions.
- Memory model basics and pass-by-value semantics.
- Collections: lists, maps, sets, priority queues and their complexity.
- Exceptions and error handling.
- Modules, packages and dependency management.
- Input/output performance for competitive programming.
- Language-specific interview idioms (streams in Java, comprehensions in Python, closures in JavaScript).

## Verification
Explain your chosen language's collection complexity table from memory. Rewrite one old project function in a cleaner, idiomatic style and add tests. Only mark this topic complete when you can code comfortably without an IDE autocomplete crutch.`,
    resources: [
      ['Java Learning Trail', 'https://dev.java/learn/', 'Oracle / Dev.java', 'course'],
      ['Python Official Tutorial', 'https://docs.python.org/3/tutorial/', 'Python Software Foundation', 'docs'],
      ['MDN JavaScript Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 'MDN', 'docs'],
      ['C++ Reference', 'https://en.cppreference.com/w/cpp', 'cppreference', 'docs'],
      ['Exercism Language Tracks', 'https://exercism.org/tracks', 'Exercism', 'practice'],
    ],
    tasks: [
      ['Write a collection cheat sheet', 'List the 8 collections you use most with their time complexity and one use case each.'],
      ['Refactor an old project', 'Pick one file and improve naming, error handling and tests. Note what changed and why.'],
      ['Solve 5 easy problems in your primary language', 'Use only your language documentation, not AI code generation.'],
    ],
  },
  {
    slug: 'dbms-sql',
    title: 'DBMS and SQL',
    category: 'Core CS',
    description: 'Master relational modelling, joins, indexes, transactions and query optimisation.',
    estimated_minutes: 1200,
    content: `## SQL skills that show up in interviews
- SELECT, WHERE, GROUP BY, HAVING, ORDER BY and LIMIT.
- INNER, LEFT, RIGHT and self joins.
- Subqueries, CTEs and window functions.
- Aggregations, conditional aggregation and null handling.
- Inserts, updates, deletes and transactions.

## DBMS theory
- Keys, constraints and referential integrity.
- Functional dependencies and normal forms (1NF to 3NF/BCNF).
- ACID properties, isolation levels and anomalies.
- Indexes: B-tree basics, covering indexes, when indexes hurt writes.
- Query plans and the N+1 problem in application code.
- Sharding vs replication at a high level.

## Practice approach
Write queries against a small schema you create yourself. Use EXPLAIN to inspect a query plan. Be ready to explain why an index helps one query but not another.`,
    resources: [
      ['SQLBolt Interactive SQL', 'https://sqlbolt.com/', 'SQLBolt', 'practice'],
      ['MySQL 8.0 Reference Manual', 'https://dev.mysql.com/doc/refman/8.0/en/', 'Oracle', 'docs'],
      ['Use The Index, Luke', 'https://use-the-index-luke.com/', 'Markus Winand', 'article'],
      ['GeeksforGeeks DBMS Tutorial', 'https://www.geeksforgeeks.org/dbms/', 'GeeksforGeeks', 'article'],
      ['SQLZoo', 'https://sqlzoo.net/wiki/SQL_Tutorial', 'SQLZoo', 'practice'],
    ],
    tasks: [
      ['Model a placement portal', 'Design tables for students, opportunities and applications with keys and indexes.'],
      ['Write 12 queries', 'Include joins, a CTE, a window function and an aggregate with HAVING.'],
      ['Explain three query plans', 'Run EXPLAIN on an indexed and non-indexed query and write down the difference.'],
    ],
  },
  {
    slug: 'operating-systems',
    title: 'Operating Systems',
    category: 'Core CS',
    description: 'Processes, threads, scheduling, memory, deadlocks and file systems for technical interviews.',
    estimated_minutes: 900,
    content: `## Core areas
- Process vs thread, context switching and system calls.
- CPU scheduling: FCFS, SJF, round robin, priority; calculate waiting and turnaround times.
- Synchronisation: race conditions, mutexes, semaphores, monitors; producer-consumer and reader-writer.
- Deadlock: four conditions, prevention, avoidance (Banker's algorithm), detection.
- Memory: paging, segmentation, TLB, virtual memory, page replacement (FIFO, LRU, optimal).
- File systems: inodes, directories, journaling and permissions.
- Linux basics: processes, signals, permissions and common commands.

## Interview framing
Connect theory to practice: explain what happens when a program reads a file, what a context switch costs, or why thrashing occurs. Practice numerical scheduling and page-replacement questions under a time limit.`,
    resources: [
      ['Operating Systems: Three Easy Pieces', 'https://pages.cs.wisc.edu/~remzi/OSTEP/', 'University of Wisconsin', 'course'],
      ['GeeksforGeeks Operating Systems Tutorial', 'https://www.geeksforgeeks.org/operating-systems/', 'GeeksforGeeks', 'article'],
      ['Linux Journey', 'https://linuxjourney.com/', 'Linux Journey', 'course'],
      ['MIT 6.S081 Operating System Engineering', 'https://pdos.csail.mit.edu/6.S081/2021/schedule.html', 'MIT PDOS', 'course'],
    ],
    tasks: [
      ['Calculate 5 scheduling examples', 'Solve FCFS, SJF, round robin and priority scheduling with waiting/turnaround tables.'],
      ['Trace two page replacement runs', 'Compare FIFO and LRU on the same reference string.'],
      ['Write a producer-consumer program', 'Use threads and a mutex/semaphore; explain where a race could occur.'],
    ],
  },
  {
    slug: 'computer-networks',
    title: 'Computer Networks',
    category: 'Core CS',
    description: 'TCP/IP, HTTP, DNS, TLS and practical debugging for backend interviews.',
    estimated_minutes: 720,
    content: `## Layered model, practical view
- Application: HTTP/HTTPS, DNS, SMTP, WebSockets.
- Transport: TCP vs UDP, ports, three-way handshake, flow and congestion control.
- Network: IP addressing, subnetting, routing, NAT.
- Link: Ethernet, ARP, MAC addresses.

## Web-focused essentials
- What happens when you type a URL: DNS, TCP handshake, TLS, HTTP request, response rendering.
- HTTP methods, status codes, headers, cookies and caching.
- REST vs GraphQL vs gRPC at a high level.
- HTTPS and TLS certificates.
- Common debugging: curl, ping, traceroute, netstat/ss, browser dev tools.

## Interview questions
Expect questions like "TCP vs UDP for video calls", "what happens on a DNS failure", "how does HTTP caching reduce load", and "why is HTTPS important for auth cookies".`,
    resources: [
      ['GeeksforGeeks Computer Network Tutorial', 'https://www.geeksforgeeks.org/computer-network-tutorials/', 'GeeksforGeeks', 'article'],
      ['MDN HTTP Overview', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'MDN', 'docs'],
      ['Stanford CS144 Introduction to Computer Networking', 'https://cs144.github.io/', 'Stanford', 'course'],
      ['Cloudflare Learning Center: What is DNS?', 'https://www.cloudflare.com/learning/dns/what-is-dns/', 'Cloudflare', 'article'],
    ],
    tasks: [
      ['Trace a URL request end to end', 'Write the DNS, TCP, TLS and HTTP steps in your own words.'],
      ['Inspect real traffic', 'Use browser dev tools and curl to compare request/response headers for two sites.'],
      ['Explain TCP vs UDP with examples', 'Prepare a 2-minute answer covering reliability, ordering and latency.'],
    ],
  },
  {
    slug: 'oop',
    title: 'Object-Oriented Programming',
    category: 'Core CS',
    description: 'Design clean, testable code using encapsulation, composition and SOLID principles.',
    estimated_minutes: 720,
    content: `## Fundamentals
- Classes, objects, constructors and access modifiers.
- Encapsulation, inheritance, polymorphism and abstraction.
- Interfaces vs abstract classes; composition over inheritance.
- Method overloading vs overriding.
- Association, aggregation and composition.

## Design quality
- SOLID principles with a concrete example for each.
- Common design patterns: factory, strategy, observer, adapter, repository, singleton (and its pitfalls).
- Dependency injection and testability.
- Immutability and value objects.

## Practice
Refactor a procedural script into small classes with clear responsibilities. Write unit tests for the behaviour before and after. In interviews, explain trade-offs rather than reciting definitions.`,
    resources: [
      ['GeeksforGeeks OOP Concepts', 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/', 'GeeksforGeeks', 'article'],
      ['Refactoring Guru Design Patterns', 'https://refactoring.guru/design-patterns', 'Refactoring Guru', 'article'],
      ['MDN Classes', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes', 'MDN', 'docs'],
      ['SOLID Principles Explained', 'https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design', 'DigitalOcean', 'article'],
    ],
    tasks: [
      ['Write SOLID examples', 'Create one small code example showing each principle and one violation.'],
      ['Refactor an old project', 'Extract at least two classes and add unit tests for the extracted behaviour.'],
      ['Implement two patterns', 'Build a strategy-based payment calculator and a factory for notification senders.'],
    ],
  },
  {
    slug: 'web-development',
    title: 'Web Development',
    category: 'Development',
    description: 'Frontend, backend and API fundamentals needed to ship a credible project.',
    estimated_minutes: 1500,
    content: `## Frontend
- Semantic HTML and responsive CSS (flexbox, grid, media queries).
- JavaScript essentials: scope, closures, async/await, fetch, events.
- React: components, props, state, effects, forms, routing.
- Accessibility basics: labels, focus states, keyboard navigation, contrast.
- State management: local state first, then context or a library.

## Backend
- HTTP APIs with Express/Node or Spring Boot.
- Request validation, authentication, sessions/JWT and error handling.
- Relational data modelling and parameterised SQL.
- Environment variables, CORS and security headers.
- File uploads: validate type and size; never trust client filenames.

## Ship and explain
Deploy a small full-stack project. Be ready to explain one hard bug, how you debugged it, and what you would change at 10x traffic.`,
    resources: [
      ['MDN Learn Web Development', 'https://developer.mozilla.org/en-US/docs/Learn_web_development', 'MDN', 'course'],
      ['React Learn', 'https://react.dev/learn', 'React Team', 'docs'],
      ['The Odin Project', 'https://www.theodinproject.com/', 'The Odin Project', 'course'],
      ['Full Stack Open', 'https://fullstackopen.com/en/', 'University of Helsinki', 'course'],
      ['Node.js Learn', 'https://nodejs.org/en/learn', 'Node.js', 'docs'],
    ],
    tasks: [
      ['Build a responsive page', 'Create a dashboard card layout that works at 375px, 768px and 1440px.'],
      ['Add a REST endpoint', 'Implement validation, error handling and a database write for one feature.'],
      ['Audit a project', 'Check accessibility, loading states, empty states and mobile navigation.'],
    ],
  },
  {
    slug: 'aptitude',
    title: 'Aptitude and Reasoning',
    category: 'Aptitude',
    description: 'Timed practice for quantitative, logical and verbal placement tests.',
    estimated_minutes: 900,
    content: `## Test structure
Most campus aptitude tests combine quantitative aptitude, logical reasoning and verbal ability, often with negative marking and tight timing.

## High-yield quantitative topics
Percentages, ratios, averages, profit and loss, time-speed-distance, time and work, mixtures, simple/compound interest, permutations and combinations, probability, number systems and mensuration.

## Logical reasoning
Series, coding-decoding, blood relations, directions, syllogisms, seating arrangements, puzzles, data interpretation and statements/assumptions.

## Verbal
Reading comprehension, grammar, sentence correction, para jumbles and vocabulary.

## Strategy
Take one timed sectional test every two days. Review every wrong answer: classify as knowledge gap, careless error or time management. Keep a formula sheet and revise it weekly. Accuracy matters more than attempting every question.`,
    resources: [
      ['IndiaBix Aptitude Questions', 'https://www.indiabix.com/aptitude/questions-and-answers/', 'IndiaBix', 'practice'],
      ['IndiaBix Logical Reasoning', 'https://www.indiabix.com/logical-reasoning/questions-and-answers/', 'IndiaBix', 'practice'],
      ['GeeksforGeeks Aptitude Tutorial', 'https://www.geeksforgeeks.org/aptitude/', 'GeeksforGeeks', 'article'],
      ['Khan Academy Arithmetic', 'https://www.khanacademy.org/math/arithmetic', 'Khan Academy', 'course'],
    ],
    tasks: [
      ['Take a 30-minute sectional test', 'Score it honestly and list the three weakest question types.'],
      ['Build a formula sheet', 'One page covering percentages, ratios, time-work and interest.'],
      ['Practice 20 data interpretation questions', 'Time yourself and check calculation accuracy.'],
    ],
  },
  {
    slug: 'technical-interviews',
    title: 'Technical Interviews',
    category: 'Interviews',
    description: 'Structure live coding, core CS and project discussions with confidence.',
    estimated_minutes: 1200,
    content: `## Interview format
A typical technical round includes a short introduction, one or two coding problems, core CS questions, and a deep dive into your resume projects. Some companies add a separate system design or machine learning round.

## Coding round routine
1. Repeat the problem and confirm constraints.
2. Give a brute-force idea and its complexity.
3. Optimise with a known pattern.
4. Code in small, testable steps.
5. Dry-run the sample and edge cases.
6. State final complexity and possible trade-offs.

## Core CS and projects
- Prepare 2-minute explanations for each project: problem, architecture, your contribution, hardest bug, testing and result.
- Know the database schema and API design of your main project.
- Expect follow-ups: how would you scale it, secure it, or monitor it?
- Be honest about what you do not know; show how you would find out.

## Mock interviews
Record yourself. Ask a peer to challenge your assumptions. Review whether you clarified requirements, communicated before coding, and tested edge cases.`,
    resources: [
      ['InterviewBit Technical Interview Questions', 'https://www.interviewbit.com/technical-interview-questions/', 'InterviewBit', 'article'],
      ['GeeksforGeeks Interview Preparation', 'https://www.geeksforgeeks.org/interview-preparation-for-software-developer/', 'GeeksforGeeks', 'article'],
      ['System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'Donne Martin', 'docs'],
      ['Pramp Peer Mock Interviews', 'https://www.pramp.com/', 'Pramp', 'practice'],
      ['Tech Interview Handbook', 'https://www.techinterviewhandbook.org/', 'Yangshun Tay', 'article'],
    ],
    tasks: [
      ['Write your project stories', 'Use problem, action, result for three projects; include metrics where possible.'],
      ['Do two mock interviews', 'One coding and one project deep dive. Ask for written feedback.'],
      ['Prepare 10 core CS questions', 'Pick questions from DBMS, OS, networks and OOP and answer out loud.'],
    ],
  },
  {
    slug: 'hr-interviews',
    title: 'HR and Behavioural Interviews',
    category: 'Interviews',
    description: 'Tell authentic, structured stories and ask thoughtful questions.',
    estimated_minutes: 480,
    content: `## What HR rounds assess
Communication, motivation, cultural fit, ownership, teamwork and honesty. They are not a formality: weak answers about relocation, gaps or career goals can undo a strong technical round.

## Prepare structured stories
Use STAR (Situation, Task, Action, Result) for 6-8 experiences:
- A conflict in a team.
- A failure and what you changed.
- A deadline under pressure.
- A time you learned something quickly.
- A time you took initiative.
- A strength and a real improvement area.

## Common questions
- Tell me about yourself.
- Why this company and role?
- Where do you see yourself in three years?
- Are you willing to relocate or work in a different domain?
- What are your salary expectations? (Research the role and respond with a range.)
- Do you have questions for us?

## Authenticity
Do not invent achievements. Prepare examples from projects, coursework, volunteering and part-time work. Keep answers concise, then stop. Close with a genuine question about the team or learning path.`,
    resources: [
      ['GeeksforGeeks HR Interview Questions', 'https://www.geeksforgeeks.org/hr-interview-questions/', 'GeeksforGeeks', 'article'],
      ['Indeed: STAR Interview Method', 'https://www.indeed.com/career-advice/interviewing/how-to-use-the-star-interview-response-technique', 'Indeed', 'article'],
      ['AmbitionBox Interview Experiences', 'https://www.ambitionbox.com/interviews', 'AmbitionBox', 'article'],
      ['Glassdoor Interview Questions', 'https://www.glassdoor.co.in/Interview/index.htm', 'Glassdoor', 'article'],
    ],
    tasks: [
      ['Write six STAR stories', 'One each for conflict, failure, pressure, learning, initiative and teamwork.'],
      ['Draft a 90-second introduction', 'Cover education, one relevant project and why this role. Practise out loud.'],
      ['Prepare five questions to ask', 'Focus on team, mentorship, ownership and success measures.'],
    ],
  },
];

const opportunitySeeds = [
  {
    key: 'novatech',
    title: 'Software Engineer Intern',
    company: 'NovaTech Labs',
    type: 'internship',
    location: 'Bengaluru',
    work_mode: 'hybrid',
    salary_stipend: '₹25,000 / month',
    description: 'SAMPLE LISTING — Work with the platform team on internal tools and APIs. You will build small features end to end, write tests and participate in code reviews. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.0,
    openings: 6,
    deadlineDays: 12,
    branches: ['CSE', 'IT', 'ECE'],
    batches: [2027, 2028],
    skills: [['Java', 'required', 3], ['Data Structures and Algorithms', 'required', 2], ['SQL', 'preferred', 2], ['Git', 'preferred', 2]],
    requirements: [['max_backlogs', 1, 'No more than 1 active backlog']],
  },
  {
    key: 'cloudmint',
    title: 'Frontend Developer Intern',
    company: 'CloudMint',
    type: 'internship',
    location: 'Remote',
    work_mode: 'remote',
    salary_stipend: '₹20,000 / month',
    description: 'SAMPLE LISTING — Join a product team building dashboards for small businesses. Expect React components, accessible UI work and close collaboration with designers. This is demonstration data, not a verified live opening.',
    min_cgpa: 6.5,
    openings: 4,
    deadlineDays: 18,
    branches: ['CSE', 'IT', 'ECE'],
    batches: [2026, 2027],
    skills: [['HTML', 'required', 3], ['CSS', 'required', 3], ['JavaScript', 'required', 3], ['React', 'required', 3], ['Git', 'preferred', 2], ['TypeScript', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'dataforge',
    title: 'Data Analyst Intern',
    company: 'DataForge Analytics',
    type: 'internship',
    location: 'Hyderabad',
    work_mode: 'onsite',
    salary_stipend: '₹22,000 / month',
    description: 'SAMPLE LISTING — Support client analytics projects by cleaning data, writing SQL and building weekly reports. You will present findings to a mentor and improve existing dashboards. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.5,
    openings: 3,
    deadlineDays: 7,
    branches: ['CSE', 'IT', 'ECE', 'EEE'],
    batches: [2026, 2027],
    skills: [['SQL', 'required', 3], ['Python', 'required', 3], ['Excel', 'required', 3], ['Data Analysis', 'required', 3], ['Power BI', 'preferred', 2], ['Tableau', 'preferred', 2]],
    requirements: [['min_tenth_percentage', 70, 'Minimum 70% in Class 10']],
  },
  {
    key: 'bytebridge',
    title: 'Backend Developer (Placement)',
    company: 'ByteBridge',
    type: 'placement',
    location: 'Pune',
    work_mode: 'onsite',
    salary_stipend: '₹12 LPA',
    description: 'SAMPLE LISTING — Full-time backend role on a payments platform. The team works with Java, Spring Boot and relational databases, with a strong focus on reliability. This is demonstration data, not a verified live opening.',
    min_cgpa: 8.0,
    openings: 5,
    deadlineDays: 21,
    branches: ['CSE', 'IT'],
    batches: [2026],
    skills: [['Java', 'required', 4], ['Spring Boot', 'required', 3], ['SQL', 'required', 3], ['REST APIs', 'required', 3], ['Object-Oriented Programming', 'required', 3], ['Docker', 'preferred', 2]],
    requirements: [['max_backlogs', 0, 'No active backlogs at the time of application']],
  },
  {
    key: 'pixelworks',
    title: 'UI/UX Design Intern',
    company: 'PixelWorks Studio',
    type: 'internship',
    location: 'Remote',
    work_mode: 'remote',
    salary_stipend: '₹15,000 / month',
    description: 'SAMPLE LISTING — Work with senior designers on mobile and web interfaces, from wireframes to handoff. A portfolio and Figma experience are expected. This is demonstration data, not a verified live opening.',
    min_cgpa: 6.0,
    openings: 2,
    deadlineDays: 26,
    branches: ['CSE', 'IT', 'ECE', 'Design'],
    batches: [2026, 2027, 2028],
    skills: [['Figma', 'required', 3], ['HTML', 'preferred', 2], ['CSS', 'preferred', 2], ['Communication', 'preferred', 3]],
    requirements: [],
  },
  {
    key: 'quantiva',
    title: 'DevOps Engineer Trainee',
    company: 'Quantiva Systems',
    type: 'placement',
    location: 'Noida',
    work_mode: 'onsite',
    salary_stipend: '₹7.5 LPA',
    description: 'SAMPLE LISTING — Trainee role supporting CI/CD pipelines, container platforms and cloud infrastructure. Strong Linux fundamentals are expected. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.0,
    openings: 4,
    deadlineDays: 15,
    branches: ['CSE', 'IT', 'ECE'],
    batches: [2026],
    skills: [['Linux', 'required', 3], ['Docker', 'required', 3], ['Git', 'required', 3], ['Computer Networks', 'preferred', 2], ['Kubernetes', 'preferred', 2], ['AWS', 'preferred', 2]],
    requirements: [['max_backlogs', 1, 'No more than 1 active backlog']],
  },
  {
    key: 'growmint',
    title: 'Full Stack Developer Intern',
    company: 'GrowMint Fintech',
    type: 'internship',
    location: 'Mumbai',
    work_mode: 'hybrid',
    salary_stipend: '₹30,000 / month',
    description: 'SAMPLE LISTING — Build customer-facing features across a React frontend and Node.js services. You will own a small feature with mentorship and ship it to production. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.0,
    openings: 3,
    deadlineDays: 5,
    branches: ['CSE', 'IT'],
    batches: [2027],
    skills: [['JavaScript', 'required', 2], ['React', 'required', 2], ['Node.js', 'required', 2], ['SQL', 'required', 3], ['Git', 'preferred', 2], ['TypeScript', 'preferred', 2], ['AWS', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'healthnest',
    title: 'Machine Learning Intern',
    company: 'HealthNest',
    type: 'internship',
    location: 'Bengaluru',
    work_mode: 'onsite',
    salary_stipend: '₹28,000 / month',
    description: 'SAMPLE LISTING — Assist with model experimentation and evaluation for healthcare scheduling. Expect data cleaning, feature engineering and careful documentation. This is demonstration data, not a verified live opening.',
    min_cgpa: 8.0,
    openings: 2,
    deadlineDays: 24,
    branches: ['CSE', 'IT', 'ECE'],
    batches: [2027, 2028],
    skills: [['Python', 'required', 3], ['Machine Learning', 'required', 3], ['Data Analysis', 'required', 3], ['Statistics', 'preferred', 3], ['SQL', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'orbit',
    title: 'Business Analyst (Placement)',
    company: 'Orbit Consulting',
    type: 'placement',
    location: 'Gurugram',
    work_mode: 'onsite',
    salary_stipend: '₹9 LPA',
    description: 'SAMPLE LISTING — Work with consulting teams to translate business problems into data-backed recommendations. Strong spreadsheet and communication skills are essential. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.0,
    openings: 8,
    deadlineDays: 9,
    branches: ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil'],
    batches: [2026, 2027],
    skills: [['Excel', 'required', 3], ['Communication', 'required', 3], ['Problem Solving', 'required', 3], ['SQL', 'preferred', 2], ['Power BI', 'preferred', 2]],
    requirements: [['max_backlogs', 2, 'No more than 2 active backlogs']],
  },
  {
    key: 'codecraft',
    title: 'Technical Content Intern',
    company: 'CodeCraft Academy',
    type: 'internship',
    location: 'Remote',
    work_mode: 'remote',
    salary_stipend: '₹18,000 / month',
    description: 'SAMPLE LISTING — Write and review beginner-friendly programming tutorials and exercises. You will work with instructors and test every code sample you publish. This is demonstration data, not a verified live opening.',
    min_cgpa: 6.5,
    openings: 2,
    deadlineDays: 3,
    branches: ['CSE', 'IT'],
    batches: [2026, 2027],
    skills: [['Communication', 'required', 3], ['Git', 'required', 2], ['Java', 'preferred', 3], ['Python', 'preferred', 3]],
    requirements: [],
  },
  {
    key: 'vertex',
    title: 'Embedded Software Intern',
    company: 'Vertex Robotics',
    type: 'internship',
    location: 'Chennai',
    work_mode: 'onsite',
    salary_stipend: '₹24,000 / month',
    description: 'SAMPLE LISTING — Work on firmware for warehouse robots in C and C++, including debugging on hardware. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.8,
    openings: 3,
    deadlineDays: 16,
    branches: ['ECE', 'EEE'],
    batches: [2027],
    skills: [['C', 'required', 3], ['C++', 'required', 3], ['Linux', 'required', 2], ['Python', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'northstar',
    title: 'Technology Analyst (Placement)',
    company: 'Northstar Bank',
    type: 'placement',
    location: 'Bengaluru',
    work_mode: 'onsite',
    salary_stipend: '₹10 LPA',
    description: 'SAMPLE LISTING — Rotational technology analyst programme covering core banking systems, SQL and Java services. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.5,
    openings: 10,
    deadlineDays: 11,
    branches: ['CSE', 'IT', 'ECE'],
    batches: [2026],
    skills: [['Java', 'required', 3], ['SQL', 'required', 3], ['Problem Solving', 'required', 3], ['Spring Boot', 'preferred', 2], ['Communication', 'preferred', 3]],
    requirements: [['max_backlogs', 0, 'No active backlogs'], ['min_tenth_percentage', 75, 'Minimum 75% in Class 10']],
  },
  {
    key: 'skyline',
    title: 'QA Automation Intern',
    company: 'Skyline Media',
    type: 'internship',
    location: 'Remote',
    work_mode: 'remote',
    salary_stipend: '₹16,000 / month',
    description: 'SAMPLE LISTING — Write automated browser tests and maintain the test suite for a media streaming product. This is demonstration data, not a verified live opening.',
    min_cgpa: 6.0,
    openings: 4,
    deadlineDays: 20,
    branches: ['CSE', 'IT'],
    batches: [2027, 2028],
    skills: [['Python', 'required', 2], ['Problem Solving', 'required', 2], ['Git', 'preferred', 2], ['Postman', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'futureworks',
    title: 'Product Management Intern',
    company: 'FutureWorks',
    type: 'internship',
    location: 'Remote',
    work_mode: 'remote',
    salary_stipend: '₹20,000 / month',
    description: 'SAMPLE LISTING — Support product discovery, user research and roadmap planning for an education product. This is demonstration data, not a verified live opening.',
    min_cgpa: 7.0,
    openings: 2,
    deadlineDays: 30,
    branches: ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil'],
    batches: [2026, 2027, 2028],
    skills: [['Communication', 'required', 3], ['Excel', 'required', 2], ['SQL', 'preferred', 2], ['Figma', 'preferred', 2]],
    requirements: [],
  },
  {
    key: 'helixsoft',
    title: 'Junior Developer (Placement)',
    company: 'HelixSoft',
    type: 'placement',
    location: 'Kochi',
    work_mode: 'onsite',
    salary_stipend: '₹6 LPA',
    description: 'SAMPLE LISTING — An expired sample listing kept in the database so the application can demonstrate deadline handling. This is demonstration data, not a verified live opening.',
    min_cgpa: 6.5,
    openings: 2,
    deadlineDays: -4,
    branches: ['CSE', 'IT'],
    batches: [2026, 2027],
    skills: [['Java', 'required', 3], ['Data Structures and Algorithms', 'required', 2]],
    requirements: [],
  },
];

const practiceQuestions = [
  // Quantitative aptitude
  {
    key: 'quant-profit-loss', category: 'quantitative', difficulty: 'easy',
    prompt: 'A shopkeeper marks an item 40% above its cost price and then gives a 25% discount. What is his profit percentage?',
    options: ['5%', '10%', '15%', '20%'], answer: 0,
    explanation: 'Let cost price be ₹100. Marked price = ₹140. Selling price after 25% discount = 140 × 0.75 = ₹105, so profit = ₹5 on ₹100 = 5%.',
  },
  {
    key: 'quant-train-speed', category: 'quantitative', difficulty: 'easy',
    prompt: 'A 180 m long train is running at 54 km/h. How long does it take to cross a pole?',
    options: ['10 seconds', '12 seconds', '15 seconds', '18 seconds'], answer: 1,
    explanation: '54 km/h = 54 × 5/18 = 15 m/s. Time = distance / speed = 180 / 15 = 12 seconds.',
  },
  {
    key: 'quant-average', category: 'quantitative', difficulty: 'easy',
    prompt: 'The average of five numbers is 28. If the number 20 is removed, what is the average of the remaining four numbers?',
    options: ['28', '29', '30', '32'], answer: 2,
    explanation: 'Total of five numbers = 5 × 28 = 140. After removing 20, total = 120. New average = 120 / 4 = 30.',
  },
  {
    key: 'quant-ratio', category: 'quantitative', difficulty: 'easy',
    prompt: 'Two numbers are in the ratio 3 : 5 and their sum is 64. What is the smaller number?',
    options: ['20', '24', '28', '32'], answer: 1,
    explanation: 'Let the numbers be 3x and 5x. Then 8x = 64, so x = 8. The smaller number is 3 × 8 = 24.',
  },
  {
    key: 'quant-simple-interest', category: 'quantitative', difficulty: 'easy',
    prompt: 'What is the simple interest on ₹12,000 at 8% per annum for 2.5 years?',
    options: ['₹2,000', '₹2,200', '₹2,400', '₹2,800'], answer: 2,
    explanation: 'Simple interest = P × R × T / 100 = 12000 × 8 × 2.5 / 100 = ₹2,400.',
  },
  {
    key: 'quant-time-work', category: 'quantitative', difficulty: 'medium',
    prompt: 'A can finish a job in 12 days and B can finish the same job in 18 days. Working together, how many days will they take?',
    options: ['6 days', '7.2 days', '7.5 days', '8 days'], answer: 1,
    explanation: 'Combined one-day work = 1/12 + 1/18 = 3/36 + 2/36 = 5/36. Time = 36/5 = 7.2 days.',
  },
  {
    key: 'quant-mixture', category: 'quantitative', difficulty: 'medium',
    prompt: 'A 40-litre mixture contains milk and water in the ratio 3 : 1. How much water must be added to make the ratio 3 : 2?',
    options: ['8 litres', '10 litres', '12 litres', '15 litres'], answer: 1,
    explanation: 'Initially milk = 30 L and water = 10 L. To make milk : water = 3 : 2, water needed = 20 L, so add 10 L.',
  },
  {
    key: 'quant-compound-interest', category: 'quantitative', difficulty: 'medium',
    prompt: 'What is the compound interest on ₹10,000 at 10% per annum for 2 years, compounded annually?',
    options: ['₹2,000', '₹2,100', '₹2,200', '₹2,310'], answer: 1,
    explanation: 'Amount = 10000 × (1.1)² = ₹12,100. Compound interest = 12100 − 10000 = ₹2,100.',
  },
  {
    key: 'quant-probability', category: 'quantitative', difficulty: 'easy',
    prompt: 'A bag contains 5 red and 7 blue balls. One ball is drawn at random. What is the probability that it is red?',
    options: ['5/12', '7/12', '5/7', '1/2'], answer: 0,
    explanation: 'Total balls = 5 + 7 = 12. Favourable outcomes = 5 red balls. Probability = 5/12.',
  },
  {
    key: 'quant-boats', category: 'quantitative', difficulty: 'medium',
    prompt: 'A boat covers 18 km downstream in 2 hours and the same distance upstream in 3 hours. What is the speed of the stream?',
    options: ['1 km/h', '1.5 km/h', '2 km/h', '3 km/h'], answer: 1,
    explanation: 'Downstream speed = 18/2 = 9 km/h and upstream speed = 18/3 = 6 km/h. Stream speed = (9 − 6)/2 = 1.5 km/h.',
  },
  {
    key: 'quant-pipes', category: 'quantitative', difficulty: 'medium',
    prompt: 'Two pipes can fill a tank in 6 hours and 9 hours respectively. If both are opened together, how long will they take to fill the tank?',
    options: ['3.2 hours', '3.6 hours', '3.8 hours', '4 hours'], answer: 1,
    explanation: 'Combined rate = 1/6 + 1/9 = 3/18 + 2/18 = 5/18. Time = 18/5 = 3.6 hours.',
  },
  {
    key: 'quant-percentage-change', category: 'quantitative', difficulty: 'medium',
    prompt: 'A population increases by 20% in the first year and then decreases by 10% in the next year. What is the net percentage change?',
    options: ['8% increase', '10% increase', '2% decrease', 'No change'], answer: 0,
    explanation: 'If the initial population is 100, after 20% increase it becomes 120. After a 10% decrease it becomes 108, which is an 8% increase.',
  },
  // Logical reasoning
  {
    key: 'logical-series-1', category: 'logical', difficulty: 'easy',
    prompt: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
    options: ['36', '40', '42', '44'], answer: 2,
    explanation: 'The differences are 4, 6, 8, 10, so the next difference is 12. 30 + 12 = 42.',
  },
  {
    key: 'logical-series-2', category: 'logical', difficulty: 'medium',
    prompt: 'Find the next number in the series: 3, 6, 11, 18, 27, ?',
    options: ['36', '37', '38', '40'], answer: 2,
    explanation: 'The differences are 3, 5, 7, 9, so the next difference is 11. 27 + 11 = 38.',
  },
  {
    key: 'logical-odd-one-out', category: 'logical', difficulty: 'easy',
    prompt: 'Which number does not belong with the others?',
    options: ['27', '64', '100', '125'], answer: 2,
    explanation: '27 = 3³, 64 = 4³ and 125 = 5³ are perfect cubes. 100 is not a perfect cube.',
  },
  {
    key: 'logical-coding', category: 'logical', difficulty: 'medium',
    prompt: 'In a certain code, CAT is written as 3120 because C = 3, A = 1 and T = 20 are joined in order. Using the same rule, how is DOG written?',
    options: ['4157', '420', '41570', '105'], answer: 0,
    explanation: 'Using alphabet positions, D = 4, O = 15 and G = 7. Joining them in order gives 4157.',
  },
  {
    key: 'logical-blood-relation', category: 'logical', difficulty: 'easy',
    prompt: "Pointing to a photograph, Ravi said, 'She is the daughter of my grandfather's only son.' How is the girl related to Ravi?",
    options: ['Sister', 'Cousin', 'Aunt', 'Niece'], answer: 0,
    explanation: "Ravi's grandfather's only son is Ravi's father. His daughter is Ravi's sister.",
  },
  {
    key: 'logical-direction', category: 'logical', difficulty: 'easy',
    prompt: 'A person walks 5 km north, turns right and walks 3 km, then turns right and walks 5 km. How far and in which direction is the person from the starting point?',
    options: ['3 km east', '3 km west', '5 km north', '8 km east'], answer: 0,
    explanation: 'The north and south movements cancel each other, leaving a displacement of 3 km towards the east.',
  },
  {
    key: 'logical-syllogism', category: 'logical', difficulty: 'medium',
    prompt: 'All roses are flowers. Some flowers fade quickly. Which conclusion definitely follows?',
    options: ['Some roses fade quickly', 'All flowers are roses', 'Some flowers are roses', 'No rose fades quickly'], answer: 2,
    explanation: 'Since all roses are flowers, the set of roses is contained within the set of flowers. Therefore, some flowers are roses.',
  },
  {
    key: 'logical-clock', category: 'logical', difficulty: 'medium',
    prompt: 'What is the angle between the hour hand and the minute hand of a clock at 3:30?',
    options: ['60°', '75°', '90°', '105°'], answer: 1,
    explanation: 'At 3:30, the minute hand is at 180° and the hour hand is at 3.5 × 30 = 105°. The angle between them is 180° − 105° = 75°.',
  },
  {
    key: 'logical-calendar', category: 'logical', difficulty: 'medium',
    prompt: 'If today is Monday, what day of the week will it be after 61 days?',
    options: ['Thursday', 'Friday', 'Saturday', 'Sunday'], answer: 2,
    explanation: '61 ÷ 7 leaves a remainder of 5. Five days after Monday is Saturday.',
  },
  {
    key: 'logical-ranking', category: 'logical', difficulty: 'easy',
    prompt: 'In a class of 40 students, Ravi is 12th from the top. What is his rank from the bottom?',
    options: ['28th', '29th', '30th', '31st'], answer: 1,
    explanation: 'Rank from bottom = total students − rank from top + 1 = 40 − 12 + 1 = 29th.',
  },
  {
    key: 'logical-letter-series', category: 'logical', difficulty: 'medium',
    prompt: 'Find the next pair in the series: AZ, BY, CX, DW, ?',
    options: ['EV', 'EU', 'FV', 'DV'], answer: 0,
    explanation: 'The first letters move forward (A, B, C, D, E) while the second letters move backward (Z, Y, X, W, V). The next pair is EV.',
  },
  {
    key: 'logical-analogy', category: 'logical', difficulty: 'easy',
    prompt: 'Complete the analogy: 4 : 64 :: 6 : ?',
    options: ['36', '144', '216', '256'], answer: 2,
    explanation: 'The pattern is n : n³. Since 4³ = 64, the missing value is 6³ = 216.',
  },
  // Verbal ability
  {
    key: 'verbal-synonym-abundant', category: 'verbal', difficulty: 'easy',
    prompt: 'Choose the word that is closest in meaning to ABUNDANT.',
    options: ['Scarce', 'Plentiful', 'Hidden', 'Broken'], answer: 1,
    explanation: 'Abundant means existing in large quantities; plentiful is its closest synonym.',
  },
  {
    key: 'verbal-antonym-transparent', category: 'verbal', difficulty: 'easy',
    prompt: 'Choose the word that is most opposite in meaning to TRANSPARENT.',
    options: ['Clear', 'Opaque', 'Fragile', 'Smooth'], answer: 1,
    explanation: 'Transparent means allowing light through; opaque means not allowing light through. They are opposites.',
  },
  {
    key: 'verbal-fill-since', category: 'verbal', difficulty: 'easy',
    prompt: 'Choose the correct word: She has been working here ___ 2019.',
    options: ['for', 'from', 'since', 'before'], answer: 2,
    explanation: 'Use "since" with a point in time (2019) and "for" with a duration (five years).',
  },
  {
    key: 'verbal-grammar-neither', category: 'verbal', difficulty: 'medium',
    prompt: 'Choose the correct verb: Neither of the boys ___ present at the meeting.',
    options: ['were', 'was', 'have', 'are'], answer: 1,
    explanation: '"Neither" is singular, so it takes the singular verb "was".',
  },
  {
    key: 'verbal-idiom-cat', category: 'verbal', difficulty: 'easy',
    prompt: 'What does the idiom "to let the cat out of the bag" mean?',
    options: ['To create confusion', 'To reveal a secret', 'To escape danger', 'To waste time'], answer: 1,
    explanation: 'The idiom means to disclose a secret, usually accidentally.',
  },
  {
    key: 'verbal-one-word', category: 'verbal', difficulty: 'easy',
    prompt: 'One word for "a person who cannot read or write":',
    options: ['Illegible', 'Illiterate', 'Ignorant', 'Ineligible'], answer: 1,
    explanation: 'An illiterate person cannot read or write. "Illegible" describes handwriting that cannot be read.',
  },
  {
    key: 'verbal-spelling', category: 'verbal', difficulty: 'easy',
    prompt: 'Choose the correctly spelt word.',
    options: ['Accomodate', 'Acommodate', 'Accommodate', 'Accommadate'], answer: 2,
    explanation: 'The correct spelling is "accommodate", with two c\'s and two m\'s.',
  },
  {
    key: 'verbal-passive', category: 'verbal', difficulty: 'medium',
    prompt: 'Choose the correct passive form: The manager approved the plan.',
    options: ['The plan is approved by the manager.', 'The plan was approved by the manager.', 'The plan has approved by the manager.', 'The plan was approving by the manager.'], answer: 1,
    explanation: 'The sentence is in the simple past, so the passive form is "was approved".',
  },
  {
    key: 'verbal-preposition', category: 'verbal', difficulty: 'easy',
    prompt: 'Choose the correct preposition: He is good ___ mathematics.',
    options: ['in', 'at', 'on', 'with'], answer: 1,
    explanation: 'The correct expression is "good at" a subject or skill.',
  },
  {
    key: 'verbal-synonym-meticulous', category: 'verbal', difficulty: 'medium',
    prompt: 'Choose the word that is closest in meaning to METICULOUS.',
    options: ['Careless', 'Careful', 'Impatient', 'Generous'], answer: 1,
    explanation: 'Meticulous means showing great attention to detail; careful is the closest synonym.',
  },
  {
    key: 'verbal-antonym-frugal', category: 'verbal', difficulty: 'medium',
    prompt: 'Choose the word that is most opposite in meaning to FRUGAL.',
    options: ['Thrifty', 'Economical', 'Extravagant', 'Practical'], answer: 2,
    explanation: 'Frugal means careful with money; extravagant means spending excessively, making it the opposite.',
  },
  {
    key: 'verbal-fill-compelling', category: 'verbal', difficulty: 'medium',
    prompt: 'Choose the best word: Despite the ___ evidence, the jury remained unconvinced.',
    options: ['weak', 'compelling', 'irrelevant', 'confusing'], answer: 1,
    explanation: '"Despite" signals a contrast: even though the evidence was compelling, the jury was unconvinced.',
  },
];

const mockTestSeeds = [
  {
    slug: 'aptitude-mock-1',
    title: 'Aptitude Mock Test 1',
    description: 'A 20-question placement-style test covering quantitative aptitude, logical reasoning and verbal ability. Recommended time: 30 minutes.',
    duration_minutes: 30,
    questions: [
      'quant-profit-loss', 'quant-train-speed', 'quant-average', 'quant-ratio', 'quant-simple-interest', 'quant-time-work', 'quant-mixture',
      'logical-series-1', 'logical-series-2', 'logical-odd-one-out', 'logical-coding', 'logical-blood-relation', 'logical-direction', 'logical-syllogism',
      'verbal-synonym-abundant', 'verbal-antonym-transparent', 'verbal-fill-since', 'verbal-grammar-neither', 'verbal-idiom-cat', 'verbal-one-word',
    ],
  },
  {
    slug: 'aptitude-mock-2',
    title: 'Aptitude Mock Test 2',
    description: 'A second full-length aptitude paper with fresh questions on percentages, time and work, puzzles and English usage. Recommended time: 30 minutes.',
    duration_minutes: 30,
    questions: [
      'quant-compound-interest', 'quant-probability', 'quant-boats', 'quant-pipes', 'quant-percentage-change',
      'logical-clock', 'logical-calendar', 'logical-ranking', 'logical-letter-series', 'logical-analogy',
      'verbal-spelling', 'verbal-passive', 'verbal-preposition', 'verbal-synonym-meticulous', 'verbal-antonym-frugal',
      'verbal-fill-compelling', 'quant-profit-loss', 'logical-series-1', 'verbal-idiom-cat', 'quant-average',
    ],
  },
  {
    slug: 'full-placement-mock',
    title: 'Full Placement Mock',
    description: 'A 24-question mixed paper that mirrors a campus placement aptitude round. Attempt it in one sitting and review every explanation afterwards.',
    duration_minutes: 35,
    questions: [
      'quant-profit-loss', 'quant-train-speed', 'quant-average', 'quant-ratio', 'quant-simple-interest', 'quant-time-work', 'quant-mixture', 'quant-compound-interest',
      'logical-series-1', 'logical-series-2', 'logical-odd-one-out', 'logical-coding', 'logical-blood-relation', 'logical-direction', 'logical-syllogism', 'logical-clock',
      'verbal-synonym-abundant', 'verbal-antonym-transparent', 'verbal-fill-since', 'verbal-grammar-neither', 'verbal-idiom-cat', 'verbal-one-word', 'verbal-spelling', 'verbal-passive',
    ],
  },
];

async function seedPractice(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) AS count FROM practice_questions');
  if (existing[0].count > 0) return;

  const questionMap = {};
  for (const question of practiceQuestions) {
    const [result] = await conn.execute(
      `INSERT INTO practice_questions (category, difficulty, prompt, options, correct_option, explanation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        question.category, question.difficulty, question.prompt, JSON.stringify(question.options),
        question.answer, question.explanation,
      ],
    );
    questionMap[question.key] = result.insertId;
  }

  for (const test of mockTestSeeds) {
    const [result] = await conn.execute(
      'INSERT INTO mock_tests (slug, title, description, duration_minutes) VALUES (?, ?, ?, ?)',
      [test.slug, test.title, test.description, test.duration_minutes],
    );
    let order = 1;
    for (const key of test.questions) {
      await conn.execute(
        'INSERT INTO mock_test_questions (mock_test_id, question_id, sort_order) VALUES (?, ?, ?)',
        [result.insertId, questionMap[key], order++],
      );
    }
  }
}

async function insertRolesAndUsers(conn) {
  await conn.query(
    `INSERT INTO roles (name) VALUES ('student'), ('admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
  );
  const [roleRows] = await conn.query('SELECT id, name FROM roles');
  const roles = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

  const hash = (password) => bcrypt.hash(password, 10);
  const users = [
    { name: 'Placement Cell Admin', email: 'placement.cell@example.com', password: 'Admin@123', role: 'admin' },
    { name: 'Aarav Sharma', email: 'demo.student@example.com', password: 'Student@123', role: 'student' },
  ];

  for (const user of users) {
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [user.email]);
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
        [user.name, user.email, await hash(user.password), roles[user.role]],
      );
    }
  }
  const [userRows] = await conn.query('SELECT id, email FROM users');
  return Object.fromEntries(userRows.map((u) => [u.email, u.id]));
}

async function seedSkills(conn) {
  for (const [name, category, description, url] of skills) {
    await conn.execute(
      `INSERT INTO skills (name, category, description, resource_url) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE category = VALUES(category), description = VALUES(description), resource_url = VALUES(resource_url)`,
      [name, category, description, url],
    );
  }
  const [rows] = await conn.query('SELECT id, name FROM skills');
  return Object.fromEntries(rows.map((s) => [s.name, s.id]));
}

async function seedRoleSkills(conn, skillMap) {
  for (const [roleName, entries] of Object.entries(roleSkills)) {
    for (const [skillName, importance, proficiency] of entries) {
      await conn.execute(
        `INSERT INTO role_skills (role_name, skill_id, importance, required_proficiency)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE importance = VALUES(importance), required_proficiency = VALUES(required_proficiency)`,
        [roleName, skillMap[skillName], importance, proficiency],
      );
    }
  }
}

async function seedTopics(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) AS count FROM preparation_topics');
  if (existing[0].count > 0) return;

  let order = 1;
  for (const topic of topics) {
    const [result] = await conn.execute(
      `INSERT INTO preparation_topics (slug, title, category, description, content, estimated_minutes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [topic.slug, topic.title, topic.category, topic.description, topic.content, topic.estimated_minutes, order++],
    );
    for (const [title, url, provider, resourceType] of topic.resources) {
      await conn.execute(
        'INSERT INTO learning_resources (topic_id, title, url, provider, resource_type, is_free) VALUES (?, ?, ?, ?, ?, 1)',
        [result.insertId, title, url, provider, resourceType],
      );
    }
    let taskOrder = 1;
    for (const [title, description] of topic.tasks) {
      await conn.execute(
        'INSERT INTO practice_tasks (topic_id, title, description, sort_order) VALUES (?, ?, ?, ?)',
        [result.insertId, title, description, taskOrder++],
      );
    }
  }
}

async function seedOpportunities(conn, skillMap, adminId) {
  const [existing] = await conn.query('SELECT COUNT(*) AS count FROM opportunities');
  if (existing[0].count > 0) {
    const [rows] = await conn.query('SELECT id, title FROM opportunities');
    return Object.fromEntries(rows.map((o) => [o.title, o.id]));
  }

  const keyToId = {};
  for (const opp of opportunitySeeds) {
    const [result] = await conn.execute(
      `INSERT INTO opportunities
       (title, company, type, location, work_mode, salary_stipend, description, min_cgpa, openings,
        application_deadline, other_requirements, is_active, is_sample, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        opp.title, opp.company, opp.type, opp.location, opp.work_mode, opp.salary_stipend, opp.description,
        opp.min_cgpa, opp.openings, addDays(opp.deadlineDays),
        null, adminId,
      ],
    );
    keyToId[opp.key] = result.insertId;
    for (const branch of opp.branches) {
      await conn.execute('INSERT INTO opportunity_branches (opportunity_id, branch) VALUES (?, ?)', [result.insertId, branch]);
    }
    for (const batch of opp.batches) {
      await conn.execute('INSERT INTO opportunity_batches (opportunity_id, graduation_year) VALUES (?, ?)', [result.insertId, batch]);
    }
    for (const [skillName, importance, proficiency] of opp.skills) {
      await conn.execute(
        'INSERT INTO opportunity_skills (opportunity_id, skill_id, importance, min_proficiency) VALUES (?, ?, ?, ?)',
        [result.insertId, skillMap[skillName], importance, proficiency],
      );
    }
    for (const [type, value, label] of opp.requirements) {
      await conn.execute(
        'INSERT INTO opportunity_requirements (opportunity_id, type, value, label) VALUES (?, ?, ?, ?)',
        [result.insertId, type, value, label],
      );
    }
  }
  return keyToId;
}

async function seedDemoStudent(conn, userMap, skillMap, oppMap) {
  const demoId = userMap['demo.student@example.com'];
  if (!demoId) return;

  await conn.execute(
    `INSERT INTO student_profiles
     (user_id, college, branch, graduation_year, cgpa, active_backlogs, tenth_percentage, twelfth_percentage,
      target_role, phone, bio, linkedin_url, github_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [
      demoId, 'Sunrise Institute of Technology', 'CSE', 2027, 7.8, 0, 88.0, 84.0,
      'Java Developer', '+91 98765 43210',
      'Final-year Computer Science student interested in backend engineering and clean API design. Learning Spring Boot and strengthening DSA.',
      'https://www.linkedin.com/in/example-aarav', 'https://github.com/example-aarav',
    ],
  );

  const demoSkills = [
    ['Java', 4], ['SQL', 3], ['Data Structures and Algorithms', 2], ['Object-Oriented Programming', 3],
    ['Git', 3], ['HTML', 3], ['CSS', 2], ['JavaScript', 2], ['React', 2], ['Node.js', 2],
    ['REST APIs', 2], ['Communication', 3], ['MySQL', 3],
  ];
  for (const [name, proficiency] of demoSkills) {
    await conn.execute(
      `INSERT IGNORE INTO student_skills (user_id, skill_id, proficiency, source, is_confirmed)
       VALUES (?, ?, ?, 'manual', 1)`,
      [demoId, skillMap[name], proficiency],
    );
  }

  for (const role of ['Java Developer', 'Full Stack Developer', 'Backend Developer']) {
    await conn.execute('INSERT IGNORE INTO student_preferred_roles (user_id, role_name) VALUES (?, ?)', [demoId, role]);
  }

  const [projectCount] = await conn.query('SELECT COUNT(*) AS count FROM student_projects WHERE user_id = ?', [demoId]);
  if (projectCount[0].count === 0) {
    await conn.execute(
      `INSERT INTO student_projects (user_id, title, description, tech_stack, link)
       VALUES (?, ?, ?, ?, ?)`,
      [demoId, 'Campus Ride Share API', 'REST API for matching students travelling on similar routes, with authentication, booking and admin endpoints.', 'Node.js, Express.js, MySQL, JWT', 'https://github.com/example-aarav/ride-share-api'],
    );
    await conn.execute(
      `INSERT INTO student_projects (user_id, title, description, tech_stack, link)
       VALUES (?, ?, ?, ?, ?)`,
      [demoId, 'Placement Tracker Dashboard', 'A small React dashboard for tracking job applications and interview rounds with persistent status filters.', 'React, CSS, REST APIs', 'https://github.com/example-aarav/placement-tracker'],
    );
  }

  const [certCount] = await conn.query('SELECT COUNT(*) AS count FROM student_certifications WHERE user_id = ?', [demoId]);
  if (certCount[0].count === 0) {
    await conn.execute(
      `INSERT INTO student_certifications (user_id, name, issuer, issue_date, credential_url)
       VALUES (?, ?, ?, ?, ?)`,
      [demoId, 'Java Programming Fundamentals', 'Coursera', addDays(-120), 'https://www.coursera.org/'],
    );
    await conn.execute(
      `INSERT INTO student_certifications (user_id, name, issuer, issue_date, credential_url)
       VALUES (?, ?, ?, ?, ?)`,
      [demoId, 'SQL for Data Science', 'Coursera', addDays(-80), 'https://www.coursera.org/learn/sql-for-data-science'],
    );
  }

  const [resumeCount] = await conn.query('SELECT COUNT(*) AS count FROM resumes WHERE user_id = ?', [demoId]);
  if (resumeCount[0].count === 0) {
    const extracted = {
      name: 'Aarav Sharma',
      email: 'demo.student@example.com',
      skills: ['Java', 'SQL', 'Git', 'HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MySQL', 'REST APIs'],
      programming_languages: ['Java', 'JavaScript', 'SQL'],
      tools: ['Git', 'MySQL'],
      projects: [
        { title: 'Campus Ride Share API', description: 'Node.js, Express.js, MySQL, JWT' },
        { title: 'Placement Tracker Dashboard', description: 'React, CSS, REST APIs' },
      ],
      education: ['B.Tech Computer Science, Sunrise Institute of Technology, 2027'],
      certifications: ['Java Programming Fundamentals — Coursera', 'SQL for Data Science — Coursera'],
      warnings: ['This is sample extracted data seeded for the demo account. Upload your own PDF to test extraction.'],
    };
    await conn.execute(
      `INSERT INTO resumes (user_id, original_filename, mime_type, file_size, extracted_text, extracted_data, status)
       VALUES (?, ?, ?, ?, ?, ?, 'processed')`,
      [
        demoId, 'aarav-sharma-resume-sample.pdf', 'application/pdf', 24800,
        'Aarav Sharma\nB.Tech Computer Science, Sunrise Institute of Technology (2027)\nSkills: Java, SQL, Git, HTML, CSS, JavaScript, React, Node.js, MySQL, REST APIs\nProjects: Campus Ride Share API (Node.js, Express.js, MySQL, JWT); Placement Tracker Dashboard (React, CSS, REST APIs)\nCertifications: Java Programming Fundamentals (Coursera); SQL for Data Science (Coursera)\nSample seeded resume data for demonstration.',
        JSON.stringify(extracted),
      ],
    );
  }

  const demoProgress = [
    ['programming-languages', -30], ['dbms-sql', -20], ['oop', -10], ['aptitude', -3],
  ];
  for (const [slug, days] of demoProgress) {
    const [topicRow] = await conn.execute('SELECT id FROM preparation_topics WHERE slug = ?', [slug]);
    if (topicRow.length) {
      await conn.execute(
        `INSERT INTO student_progress (user_id, topic_id, is_completed, completed_at) VALUES (?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), completed_at = VALUES(completed_at)`,
        [demoId, topicRow[0].id, dateTime(days)],
      );
    }
  }

  const noteRows = [
    ['dsa', 'Sliding window notes', 'Remember: expand right, shrink left while invalid. Practise minimum window substring and longest repeating character replacement.'],
    ['dsa', 'Graph revision plan', 'Revise BFS/DFS this week, then topological sort. I still need to practise union-find.'],
    ['technical-interviews', 'Project story draft', 'Campus Ride Share API: explain JWT auth, booking collision handling and how I would add payment integration.'],
  ];
  for (const [slug, title, body] of noteRows) {
    const [topicRow] = await conn.execute('SELECT id FROM preparation_topics WHERE slug = ?', [slug]);
    if (topicRow.length) {
      const [existingNote] = await conn.execute(
        'SELECT id FROM personal_notes WHERE user_id = ? AND title = ?', [demoId, title],
      );
      if (!existingNote.length) {
        await conn.execute(
          'INSERT INTO personal_notes (user_id, topic_id, title, body) VALUES (?, ?, ?, ?)',
          [demoId, topicRow[0].id, title, body],
        );
      }
    }
  }

  const applications = [
    ['novatech', 'applied', -5, null, null, 'Applied through the campus portal. Awaiting shortlist.'],
    ['growmint', 'assessment', -3, 3, null, 'Online assessment scheduled. Revise React and SQL joins.'],
    ['codecraft', 'interview', -2, null, 6, 'Technical + writing discussion scheduled for next week.'],
    ['bytebridge', 'interested', null, null, null, 'Stretch role: CGPA requirement is 8.0. Improve CGPA/Spring Boot and revisit.'],
  ];
  for (const [key, status, appliedDays, assessmentDays, interviewDays, notes] of applications) {
    if (!oppMap[key]) continue;
    await conn.execute(
      `INSERT IGNORE INTO applications
       (user_id, opportunity_id, status, applied_date, assessment_date, interview_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        demoId, oppMap[key], status,
        appliedDays === null ? null : addDays(appliedDays),
        assessmentDays === null ? null : dateTime(assessmentDays, 14),
        interviewDays === null ? null : dateTime(interviewDays, 11),
        notes,
      ],
    );
  }

  for (const key of ['pixelworks', 'cloudmint']) {
    if (oppMap[key]) {
      await conn.execute('INSERT IGNORE INTO bookmarks (user_id, opportunity_id) VALUES (?, ?)', [demoId, oppMap[key]]);
    }
  }

  const [planCount] = await conn.query('SELECT COUNT(*) AS count FROM study_plans WHERE user_id = ?', [demoId]);
  if (planCount[0].count === 0) {
    const [planResult] = await conn.execute(
      `INSERT INTO study_plans (user_id, target_role, generated_by, summary)
       VALUES (?, ?, 'rule', ?)`,
      [demoId, 'Java Developer', 'A four-week starter plan focused on the largest gaps for Java Developer: DSA, Spring Boot, REST APIs and DBMS. Generated from the rule-based engine; edit tasks to fit your schedule.'],
    );
    const planTasks = [
      ['Revise DSA patterns: arrays, hashing and two pointers', 'Solve 8 problems and write the pattern + complexity in your notes.', 'high', 2, 'https://neetcode.io/roadmap', 'Data Structures and Algorithms'],
      ['Complete 3 medium DSA problems under time pressure', 'Set a 45-minute timer per problem. Review editorials only after attempting.', 'high', 5, 'https://leetcode.com/problemset/', 'Data Structures and Algorithms'],
      ['Learn Spring Boot fundamentals', 'Build a small REST service with one entity and one controller.', 'high', 8, 'https://spring.io/guides/gs/spring-boot', 'Spring Boot'],
      ['Design and test a REST API', 'Implement CRUD with validation and proper status codes; test with Postman.', 'high', 11, 'https://restfulapi.net/', 'REST APIs'],
      ['Revise DBMS normalisation and indexing', 'Create a 3NF schema and use EXPLAIN on two queries.', 'medium', 14, 'https://www.geeksforgeeks.org/dbms/', 'DBMS'],
      ['Practise Java OOP interview questions', 'Prepare examples of interfaces, composition and SOLID trade-offs.', 'medium', 17, 'https://refactoring.guru/design-patterns', 'Object-Oriented Programming'],
      ['Do one mock technical interview', 'Record a 45-minute session: coding + project questions.', 'high', 21, 'https://www.pramp.com/', 'Communication'],
      ['Take a timed aptitude sectional', 'Score it, classify mistakes and add formulas to your revision sheet.', 'medium', 23, 'https://www.indiabix.com/aptitude/questions-and-answers/', 'Aptitude'],
      ['Final review and apply to 3 eligible roles', 'Update your resume, tailor project bullets and track applications.', 'high', 26, null, 'Communication'],
    ];
    let sort = 1;
    for (const [title, description, priority, days, url, skillName] of planTasks) {
      const [topicRow] = await conn.execute('SELECT id FROM preparation_topics WHERE title = ?', [skillName]);
      await conn.execute(
        `INSERT INTO study_tasks (plan_id, title, description, skill_id, topic_id, resource_url, priority, target_date, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planResult.insertId, title, description, skillMap[skillName] || null,
          topicRow[0]?.id || null, url, priority, addDays(days), sort++,
        ],
      );
    }
  }
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userMap = await insertRolesAndUsers(conn);
    const skillMap = await seedSkills(conn);
    await seedRoleSkills(conn, skillMap);
    await seedTopics(conn);
    await seedPractice(conn);
    const oppMap = await seedOpportunities(conn, skillMap, userMap['placement.cell@example.com']);
    await seedDemoStudent(conn, userMap, skillMap, oppMap);
    await conn.commit();
    console.log('Seed complete.');
    console.log('Demo student: demo.student@example.com / Student@123');
    console.log('Demo admin:   placement.cell@example.com / Admin@123');
    console.log('All opportunity records are clearly labelled sample data.');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((error) => {
      console.error('Seed failed:', error);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seed };
