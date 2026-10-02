import { StudyNote } from '../types';

export const INITIAL_STUDY_NOTES: StudyNote[] = [
  {
    id: 'note-1',
    title: 'Cellular Respiration & ATP Synthesis',
    subject: 'Biology / Biochemistry',
    content: `# Cellular Respiration & ATP Synthesis

## Overview
Cellular respiration is the multi-step metabolic pathway through which aerobic cells harvest biochemical energy from nutrients (primarily glucose) and produce adenosine triphosphate (ATP). 
Overall Reaction: C6H12O6 + 6O2 -> 6CO2 + 6H2O + ~30-32 ATP.

## 1. Glycolysis
- **Location:** Cytoplasm (cytosol). Does NOT require oxygen (anaerobic).
- **Inputs:** 1 Glucose (6-carbon), 2 NAD+, 2 ATP.
- **Outputs (Net):** 2 Pyruvate (3-carbon), 2 NADH, 2 net ATP (via substrate-level phosphorylation).
- **Key Regulatory Enzyme:** Phosphofructokinase-1 (PFK-1), allosterically inhibited by high ATP and citrate, stimulated by AMP.

## 2. Pyruvate Oxidation (Link Reaction)
- **Location:** Mitochondrial matrix.
- Each 3-carbon pyruvate is converted to 2-carbon Acetyl-CoA by the Pyruvate Dehydrogenase complex.
- Yields: 1 CO2 and 1 NADH per pyruvate (2 CO2 and 2 NADH per glucose).

## 3. The Citric Acid Cycle (Krebs Cycle)
- **Location:** Mitochondrial matrix.
- Acetyl-CoA (2C) combines with Oxaloacetate (4C) to form Citrate (6C).
- Two decarboxylation steps release CO2.
- **Yield per glucose (2 turns):** 4 CO2, 6 NADH, 2 FADH2, 2 GTP/ATP.

## 4. Oxidative Phosphorylation & Electron Transport Chain (ETC)
- **Location:** Inner mitochondrial membrane (cristae).
- High-energy electrons from NADH (entering at Complex I) and FADH2 (entering at Complex II) pass along complexes I, III, IV to molecular oxygen (final electron acceptor -> forms H2O).
- Complexes I, III, and IV pump protons (H+) from the matrix into the intermembrane space, creating an electrochemical gradient (proton-motive force).
- **Chemiosmosis:** ATP Synthase uses the proton gradient returning to the matrix to drive phosphorylation of ADP to ATP (approx 2.5 ATP per NADH, 1.5 ATP per FADH2).

## High-Yield Exam Traps
- Cyanide & Carbon Monoxide inhibit Cytochrome c Oxidase (Complex IV), halting the proton gradient and aerobic ATP production.
- Oligomycin directly inhibits ATP synthase.
- DNP (2,4-dinitrophenol) uncouples the proton gradient, generating heat instead of ATP.`,
    summary: 'A complete breakdown of aerobic glucose metabolism: Glycolysis, Pyruvate Oxidation, Krebs Cycle, and Oxidative Phosphorylation yielding 30-32 ATP.',
    keyTerms: ['Glycolysis', 'Krebs Cycle', 'ATP Synthase', 'Oxidative Phosphorylation', 'PFK-1', 'Chemiosmosis'],
    tags: ['Biology', 'Metabolism', 'Exam Prep'],
    createdAt: new Date().toISOString(),
    wordCount: 312
  },
  {
    id: 'note-2',
    title: 'Algorithms: Sorting & Big-O Complexity',
    subject: 'Computer Science',
    content: `# Algorithms: Sorting & Big-O Complexity

## 1. Big-O Asymptotic Notation Primer
- **O(1) Constant:** Hash map lookups (average), array index access.
- **O(log n) Logarithmic:** Binary search on sorted arrays, balanced BST operations.
- **O(n) Linear:** Single loop traversal, linear search.
- **O(n log n) Linearithmic:** Merge Sort, Quick Sort (average), Heap Sort.
- **O(n^2) Quadratic:** Bubble Sort, Selection Sort, Insertion Sort (worst).
- **O(2^n) Exponential:** Brute force recursive Fibonacci, power sets.

## 2. Fundamental Sorting Comparison
### Merge Sort
- **Divide and Conquer:** Recursively splits array into halves, sorts each, merges in O(n).
- **Time Complexity:** Best: O(n log n), Avg: O(n log n), Worst: O(n log n).
- **Space Complexity:** O(n) auxiliary memory.
- **Stability:** Stable (preserves order of duplicate keys).

### Quick Sort
- **Partitioning:** Selects pivot (Lomuto or Hoare scheme), partitions elements into smaller and larger.
- **Time Complexity:** Best: O(n log n), Avg: O(n log n), Worst: O(n^2) when pivot is poorly chosen (e.g. sorted array with first/last element pivot).
- **Space:** O(log n) stack space for recursion. In-place.
- **Optimization:** Randomized pivot or 3-way partitioning for duplicate keys.

### Insertion Sort
- **Best for:** Small arrays (n < 16) or nearly sorted datasets.
- **Time:** Best O(n), Worst O(n^2). Stable and in-place O(1) space.

## 3. Stability & In-Place Rules
- An algorithm is **in-place** if it requires O(1) or O(log n) auxiliary space.
- An algorithm is **stable** if two objects with equal keys appear in the same order in sorted output as they appeared in the input.`,
    summary: 'Core comparison of asymptotic complexities (Big-O) and standard sorting algorithms (Merge Sort, Quick Sort, Insertion Sort) with stability and space guarantees.',
    keyTerms: ['Big-O', 'Merge Sort', 'Quick Sort', 'Divide and Conquer', 'Stability', 'In-Place'],
    tags: ['Computer Science', 'Data Structures', 'Algorithms'],
    createdAt: new Date().toISOString(),
    wordCount: 260
  },
  {
    id: 'note-3',
    title: 'Cognitive Biases & Memory Retention',
    subject: 'Psychology & Learning Science',
    content: `# Cognitive Biases & Memory Retention

## 1. The Ebbinghaus Forgetting Curve
- Hermann Ebbinghaus discovered that memory retention drops exponentially over time if no conscious effort is made to retain it.
- Within 24 hours, learners typically lose 50-70% of newly acquired information unless reviewed.
- **The Remedy:** Spaced Repetition (expanding intervals of review: 1 day, 3 days, 1 week, 3 weeks, 2 months).

## 2. Active Recall vs. Passive Review
- **Passive Review:** Re-reading notes, highlighting text. Creates the *Illusion of Competence* (fluency heuristic), where familiarity is mistaken for mastery.
- **Active Recall (The Testing Effect):** Deliberately retrieving knowledge from memory (flashcards, practice quizzes, Feynman technique). Strengthens neural synapses significantly more than re-reading.

## 3. Cognitive Biases in Studying
- **Dunning-Kruger Effect:** Novices overestimate their subject mastery because they lack the meta-cognitive ability to recognize what they don't know.
- **Confirmation Bias:** Students only test themselves on topics they already know well to feel confident, avoiding weak areas.
- **Procrastination & Temporal Discounting:** Brain assigns greater immediate value to short-term gratification than future exam success.

## 4. Dual Coding & Chunking
- **Dual Coding Theory (Paivio):** Combining verbal descriptions with visual representations (diagrams, flowcharts) creates dual cognitive pathways for retrieval.
- **Chunking (Miller's Law):** Working memory can hold roughly 4-7 chunks of information. Grouping related details into logical schemas frees up cognitive load.`,
    summary: 'Key principles from cognitive psychology on how memory works: The Forgetting Curve, Active Recall, cognitive biases hindering study efficiency, and Dual Coding.',
    keyTerms: ['Active Recall', 'Spaced Repetition', 'Forgetting Curve', 'Dual Coding', 'Illusion of Competence', 'Chunking'],
    tags: ['Psychology', 'Study Techniques', 'Cognitive Science'],
    createdAt: new Date().toISOString(),
    wordCount: 255
  }
];
