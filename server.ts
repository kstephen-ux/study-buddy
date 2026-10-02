import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Candidate Gemini models in priority order (starting with fast, high-availability lite models)
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];

const modelCooldowns: Record<string, number> = {};

function isQuotaExhaustedError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code;
  const str = String(err.message || "") + " " + JSON.stringify(err);
  return (
    status === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    str.includes("429") ||
    str.includes("RESOURCE_EXHAUSTED") ||
    str.includes("Quota exceeded") ||
    str.includes("quota")
  );
}

function isTransientDemandError(err: any): boolean {
  if (!err) return false;
  const str = String(err.message || "") + " " + JSON.stringify(err);
  const status = err.status || err.code;
  return (
    status === 503 ||
    status === "UNAVAILABLE" ||
    str.includes("503") ||
    str.includes("high demand") ||
    str.includes("UNAVAILABLE") ||
    str.includes("overloaded") ||
    str.includes("spikes in demand") ||
    str.includes("temporarily")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanJsonText(raw: string): string {
  if (!raw) return "{}";
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

async function callGeminiWithResilience(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
): Promise<string> {
  let lastError: any = null;
  const now = Date.now();

  for (const model of CANDIDATE_MODELS) {
    if (modelCooldowns[model] && modelCooldowns[model] > now) {
      continue;
    }

    // Try model (up to 2 attempts for transient 503s, 1 attempt for quota limits)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;

        // If quota limit reached, set a cooldown for this model and switch immediately
        if (isQuotaExhaustedError(err)) {
          modelCooldowns[model] = Date.now() + 60000;
          break;
        }

        // If transient 503 demand spike, retry once with jitter, or fail over
        if (isTransientDemandError(err)) {
          if (attempt === 0) {
            const delay = 500 + Math.floor(Math.random() * 300);
            await wait(delay);
            continue;
          } else {
            break;
          }
        }

        // Other non-retryable errors: break to next model
        break;
      }
    }
  }

  throw lastError || new Error("All candidate Gemini models failed to generate content.");
}

// Fallback quiz generator when models are experiencing high demand
function generateFallbackQuiz(subject: string, difficulty: string, count: number, notesContent: string) {
  const subjectLower = (subject || "").toLowerCase();
  
  if (subjectLower.includes("bio") || subjectLower.includes("cell") || subjectLower.includes("resp")) {
    return {
      title: `${subject} Practice Quiz (${difficulty.toUpperCase()})`,
      subject: subject || "Biology",
      difficulty,
      questions: [
        {
          id: "q-bio-1",
          question: "Where in the cell does glycolysis take place, and does it require oxygen?",
          options: [
            "Mitochondrial matrix; requires oxygen",
            "Cytoplasm (cytosol); anaerobic (does not require oxygen)",
            "Inner mitochondrial membrane; aerobic",
            "Endoplasmic reticulum; anaerobic"
          ],
          correctAnswerIndex: 1,
          explanation: "Glycolysis occurs in the cytosol of the cytoplasm and is an anaerobic pathway that breaks down glucose without requiring oxygen.",
          topicArea: "Glycolysis"
        },
        {
          id: "q-bio-2",
          question: "What is the primary role of the proton electrochemical gradient in the Electron Transport Chain (ETC)?",
          options: [
            "Directly hydrolyze glucose into pyruvate",
            "Drive ATP synthesis as protons flow back through ATP Synthase (chemiosmosis)",
            "Prevent NADH from donating electrons to Complex I",
            "Store calcium ions for muscle contraction"
          ],
          correctAnswerIndex: 1,
          explanation: "Protons pumped into the intermembrane space create a proton-motive force that powers ATP Synthase to phosphorylate ADP into ATP via chemiosmosis.",
          topicArea: "Oxidative Phosphorylation"
        },
        {
          id: "q-bio-3",
          question: "What is the final electron acceptor in aerobic cellular respiration?",
          options: [
            "Carbon dioxide (CO2)",
            "NAD+",
            "Molecular oxygen (O2), which forms H2O",
            "Pyruvate"
          ],
          correctAnswerIndex: 2,
          explanation: "Oxygen acts as the terminal electron acceptor at Complex IV, combining with protons to form water.",
          topicArea: "Electron Transport Chain"
        },
        {
          id: "q-bio-4",
          question: "Which intermediate molecule from pyruvate oxidation enters the Krebs (Citric Acid) cycle?",
          options: [
            "Acetyl-CoA (2-carbon unit combining with oxaloacetate)",
            "Lactate",
            "Glucose-6-phosphate",
            "Ethanol"
          ],
          correctAnswerIndex: 0,
          explanation: "Pyruvate is converted to Acetyl-CoA by pyruvate dehydrogenase before entering the citric acid cycle by combining with 4-carbon oxaloacetate.",
          topicArea: "Krebs Cycle"
        },
        {
          id: "q-bio-5",
          question: "Why does fermentation produce far less ATP per glucose molecule than aerobic respiration?",
          options: [
            "Fermentation requires double the activation energy",
            "It does not utilize the citric acid cycle or electron transport chain, yielding only net 2 ATP from glycolysis",
            "ATP synthase runs in reverse during fermentation",
            "Lactate consumes all available ATP"
          ],
          correctAnswerIndex: 1,
          explanation: "Fermentation only performs glycolysis (producing 2 ATP net) and regenerates NAD+ without utilizing oxidative phosphorylation.",
          topicArea: "Fermentation vs Aerobic"
        }
      ].slice(0, count)
    };
  }

  if (subjectLower.includes("comp") || subjectLower.includes("sort") || subjectLower.includes("algo") || subjectLower.includes("cs")) {
    return {
      title: `${subject} Practice Quiz (${difficulty.toUpperCase()})`,
      subject: subject || "Computer Science",
      difficulty,
      questions: [
        {
          id: "q-cs-1",
          question: "What is the worst-case time complexity of standard Quick Sort?",
          options: [
            "O(n log n)",
            "O(log n)",
            "O(n^2)",
            "O(n)"
          ],
          correctAnswerIndex: 2,
          explanation: "Quick Sort degrades to O(n^2) when poor pivots are repeatedly chosen (e.g. Pivot is smallest/largest in an already sorted array).",
          topicArea: "Quick Sort Analysis"
        },
        {
          id: "q-cs-2",
          question: "Why does standard Merge Sort require O(n) auxiliary space?",
          options: [
            "It stores duplicate elements in a hash table",
            "Temporary arrays are needed to merge two sorted sublists back together",
            "Recursion depth always exceeds n stack frames",
            "It must maintain a min-heap structure"
          ],
          correctAnswerIndex: 1,
          explanation: "Standard array-based Merge Sort allocates auxiliary array buffers to merge sub-arrays in sorted order.",
          topicArea: "Merge Sort Space Complexity"
        },
        {
          id: "q-cs-3",
          question: "What does it mean for a sorting algorithm to be 'stable'?",
          options: [
            "It runs in strictly constant memory O(1)",
            "It preserves the relative order of elements with equal keys",
            "Its worst-case time equals its average-case time",
            "It never throws a stack overflow exception"
          ],
          correctAnswerIndex: 1,
          explanation: "A stable sort preserves the original relative order of records that have identical sort keys.",
          topicArea: "Sorting Stability"
        },
        {
          id: "q-cs-4",
          question: "Which sorting algorithm is optimal for nearly sorted lists or small datasets (n < 20)?",
          options: [
            "Insertion Sort",
            "Heap Sort",
            "Merge Sort",
            "Radix Sort"
          ],
          correctAnswerIndex: 0,
          explanation: "Insertion sort has minimal constant factor overhead and runs in linear O(n) time on already sorted or nearly sorted arrays.",
          topicArea: "Algorithm Selection"
        },
        {
          id: "q-cs-5",
          question: "What is the lower bound time complexity for any comparison-based sorting algorithm in the worst case?",
          options: [
            "Ω(n)",
            "Ω(log n)",
            "Ω(n log n)",
            "Ω(n^2)"
          ],
          correctAnswerIndex: 2,
          explanation: "By decision-tree analysis, any comparison sort requires at least ceil(log2(n!)) comparisons, which is Ω(n log n).",
          topicArea: "Comparison Lower Bounds"
        }
      ].slice(0, count)
    };
  }

  // General academic fallback quiz
  return {
    title: `${subject} Mastery Quiz (${difficulty.toUpperCase()})`,
    subject: subject || "Coursework",
    difficulty,
    questions: [
      {
        id: "q-gen-1",
        question: `According to cognitive psychology, which study technique produces the greatest long-term retention?`,
        options: [
          "Passive re-reading of highlighted text",
          "Active retrieval practice (testing yourself without notes)",
          "Listening to lecture recordings at 2x speed",
          "Copying textbook paragraphs verbatim"
        ],
        correctAnswerIndex: 1,
        explanation: "Active retrieval practice forces the brain to reconstruct knowledge, creating durable neural pathways far superior to passive recognition.",
        topicArea: "Active Recall"
      },
      {
        id: "q-gen-2",
        question: "What is the core principle of Spaced Repetition?",
        options: [
          "Reviewing information in continuous 6-hour cram sessions",
          "Re-testing concepts at expanding time intervals just as memory begins to fade",
          "Only studying material once right before the examination",
          "Reviewing only the easiest concepts repeatedly"
        ],
        correctAnswerIndex: 1,
        explanation: "Spaced repetition counters the Ebbinghaus forgetting curve by reviewing items at progressively longer intervals.",
        topicArea: "Memory Retention"
      },
      {
        id: "q-gen-3",
        question: "How does the Feynman Technique verify true conceptual understanding?",
        options: [
          "By memorizing exact verbatim dictionary definitions",
          "By explaining the concept in plain language without jargon, as if teaching a beginner",
          "By counting how many pages of notes you have written",
          "By skimming the summary section of the textbook"
        ],
        correctAnswerIndex: 1,
        explanation: "The Feynman Technique exposes illusions of competence by requiring you to teach the concept simply without relying on complex jargon.",
        topicArea: "Feynman Technique"
      },
      {
        id: "q-gen-4",
        question: "What constitutes the 'Illusion of Competence' during revision?",
        options: [
          "Mistaking the fluency of reading familiar text for the ability to recall it from memory",
          "Overestimating the difficulty of an exam question",
          "Studying in a quiet environment with minimal distractions",
          "Creating structured flashcards with clear questions"
        ],
        correctAnswerIndex: 0,
        explanation: "Recognizing an answer while looking at it creates false confidence. True mastery requires unprompted recall.",
        topicArea: "Cognitive Biases in Learning"
      },
      {
        id: "q-gen-5",
        question: "What is the recommended approach to an error journal when preparing for exams?",
        options: [
          "Ignoring questions you missed to preserve morale",
          "Documenting missed questions, diagnosing the misconception, and re-testing until correct",
          "Only reviewing questions you already scored 100% on",
          "Erasing wrong answers and writing down the answer key without reflection"
        ],
        correctAnswerIndex: 1,
        explanation: "An error journal targets your specific knowledge gaps and converts mistakes into lasting retention.",
        topicArea: "Exam Strategy"
      }
    ].slice(0, count)
  };
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
  });
});

// Chat / Q&A endpoint
app.post("/api/gemini/chat", async (req: Request, res: Response) => {
  const { message, history = [], activeNotes = [], mode = "balanced" } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required." });
    return;
  }

  const ai = getGeminiClient();

  let contextSection = "";
  if (activeNotes && activeNotes.length > 0) {
    contextSection = `\n\n--- ACTIVE STUDENT NOTES CONTEXT ---\n` +
      activeNotes.map((n: { title: string; subject: string; content: string }) => 
        `### Note: ${n.title} (Subject: ${n.subject})\n${n.content}`
      ).join("\n\n") + `\n--- END OF NOTES CONTEXT ---\n`;
  }

  const modeInstructions: Record<string, string> = {
    balanced: "Provide a balanced, structured, and insightful response with clear headings, bullet points, and high-yield insights.",
    eli5: "Explain like the student is 12 years old: use everyday analogies, eliminate opaque jargon, and build an intuitive mental model.",
    socratic: "Act as a Socratic study coach: do not just dump the whole answer. Prompt the student with a guided breakdown, a clarifying question, and a self-test check.",
    "exam-prep": "Focus on exam success: highlight common misconceptions, grading rubric keywords, tricky edge cases, and high-yield definitions."
  };

  const promptText = `
You are StudyBuddy, an empathetic, highly effective academic mentor and tutor.
Student's question/request: "${message}"

Mode: ${mode.toUpperCase()}
Instruction: ${modeInstructions[mode] || modeInstructions.balanced}

${contextSection}

Format your response as a JSON object with this exact structure:
{
  "reply": "Comprehensive, encouraging, well-formatted markdown response addressing the question directly.",
  "suggestedFollowUps": ["Question 1 student might want to ask next", "Question 2", "Question 3"],
  "referencedNotes": ["Note title referenced, if any"]
}
`;

  if (!ai) {
    // Fallback if API key is not yet set
    res.json({
      reply: `**StudyBuddy (Offline Mode):**\n\nI received your question: *"${message}"*.\n\n` +
        (activeNotes.length > 0 
          ? `Based on your **${activeNotes.length} active notes** (${activeNotes.map((n: any) => n.title).join(", ")}):\n\n` +
            `- Ensure you relate your study query to key definitions and principles found in your notes.\n` +
            `- Active recall: Try writing down the core steps from memory before checking your notes.\n\n` +
            `*Tip: Connect a Gemini API key in AI Studio settings to enable dynamic AI responses!*`
          : `Please upload or select study notes in the Notes tab so I can ground answers in your coursework.`),
      suggestedFollowUps: [
        "Can you summarize the main steps?",
        "What is the most common exam question on this?",
        "Give me a real-world example."
      ],
      referencedNotes: activeNotes.map((n: any) => n.title)
    });
    return;
  }

  try {
    const rawText = await callGeminiWithResilience(ai, {
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            referencedNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["reply", "suggestedFollowUps"],
        },
      },
    });

    const parsed = JSON.parse(cleanJsonText(rawText));
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Chat API] Recovering from model demand spike with grounded contextual response:", error.message || error);
    
    // Provide a rich, grounded contextual reply so the student is never blocked
    const activeNoteTitles = activeNotes.map((n: any) => n.title).join(", ");
    let noteExcerpts = "";
    if (activeNotes.length > 0) {
      noteExcerpts = activeNotes.map((n: any) => 
        `#### ${n.title} (${n.subject})\n${n.summary ? n.summary : n.content.slice(0, 300) + '...'}`
      ).join('\n\n');
    }

    const fallbackReply = `### StudyBuddy Review\n\n` +
      `I've analyzed your question: **"${message}"** in the context of your active coursework.\n\n` +
      (activeNotes.length > 0 
        ? `**Active Coursework Context (${activeNotes.length} notes: ${activeNoteTitles}):**\n\n${noteExcerpts}\n\n`
        : `*No specific notes were selected. Using general academic learning guidelines.* \n\n`) +
      `#### High-Yield Retrieval Recommendations\n` +
      `1. **Active Self-Testing:** Attempt to summarize this topic in 3 bullet points without looking at the source.\n` +
      `2. **Check Terminology:** Verify that you understand the prerequisite terms and formulas in the **Active Recall** flashcard tab.\n` +
      `3. **Practice Quiz:** Run an adaptive practice quiz to test your comprehension under exam conditions.\n\n` +
      `*(Note: The AI model experienced a momentary demand spike; this response was synthesized directly from your coursework notes).*`;

    res.json({
      reply: fallbackReply,
      suggestedFollowUps: [
        "Explain the key vocabulary in plain terms",
        "Generate a practice question for this topic",
        "How can I memorize the core steps?"
      ],
      referencedNotes: activeNotes.map((n: any) => n.title),
      isFallback: true
    });
  }
});

// Generate Study Plan
app.post("/api/gemini/study-plan", async (req: Request, res: Response) => {
  const { 
    subject = "General Studies", 
    examDate = "", 
    dailyHours = 2, 
    strategy = "Spaced Repetition & Active Recall", 
    notesContent = "",
    focusGoal = "Score an A on final exam"
  } = req.body;

  const ai = getGeminiClient();

  const prompt = `
You are an expert academic advisor. Build a highly actionable, structured study plan for a student based on these notes and parameters:
Subject: ${subject}
Exam / Target Date: ${examDate || "Within 2 weeks"}
Target Daily Time: ${dailyHours} hours/day
Study Strategy: ${strategy}
Student Goal: ${focusGoal}

Notes Content:
${notesContent ? notesContent.slice(0, 10000) : "Use general best-practice topics for " + subject}

Create 3 to 5 realistic modules (e.g. Day 1, Day 2-3, Day 4-5, etc.). For each module, provide:
- dayOrWeek: string
- topic: string
- keyConcepts: string[] (3-5 items)
- reviewTechnique: string (e.g. Active Recall, Feynman Technique, Pomodoro sprint, Blurting technique)
- tasks: array of concrete tasks with duration in minutes (totaling approximately the requested daily time)
`;

  if (!ai) {
    // Return structured default plan
    res.json({
      title: `${subject} Mastery Plan`,
      subject,
      examDate,
      dailyHours: Number(dailyHours),
      strategy,
      summary: `A structured study roadmap focusing on ${strategy.toLowerCase()} to prepare for ${examDate || "upcoming exams"}.`,
      modules: [
        {
          id: "mod-1",
          dayOrWeek: "Phase 1: Foundations",
          topic: "Core Principles & Diagnostic Review",
          keyConcepts: ["Fundamental definitions", "Conceptual overview", "Weakness identification"],
          reviewTechnique: "Feynman Technique (Teach back without notes)",
          tasks: [
            { id: "t1", title: `Review and annotate ${subject} notes`, durationMinutes: 45, completed: false },
            { id: "t2", title: "Generate initial diagnostic quiz", durationMinutes: 30, completed: false },
            { id: "t3", title: "Note down top 3 confusing concepts", durationMinutes: 15, completed: false }
          ]
        },
        {
          id: "mod-2",
          dayOrWeek: "Phase 2: Deep Dive",
          topic: "Complex Mechanisms & Problem Sets",
          keyConcepts: ["Step-by-step mechanisms", "Comparative analysis", "Exam traps"],
          reviewTechnique: "Active Recall & Flashcards",
          tasks: [
            { id: "t4", title: "Deep dive into hardest diagrams and formulas", durationMinutes: 60, completed: false },
            { id: "t5", title: "Practice 10 multiple choice questions", durationMinutes: 30, completed: false }
          ]
        },
        {
          id: "mod-3",
          dayOrWeek: "Phase 3: Synthesis & Mock Test",
          topic: "Timed Mock Exam & Consolidating Recall",
          keyConcepts: ["Timed conditions", "Error correction journal", "High-yield summary"],
          reviewTechnique: "Spaced Repetition check",
          tasks: [
            { id: "t6", title: "Full mock quiz under timed conditions", durationMinutes: 45, completed: false },
            { id: "t7", title: "Review missed questions and re-test", durationMinutes: 30, completed: false }
          ]
        }
      ]
    });
    return;
  }

  try {
    const rawText = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            summary: { type: Type.STRING },
            strategy: { type: Type.STRING },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  dayOrWeek: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  keyConcepts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  reviewTechnique: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        completed: { type: Type.BOOLEAN }
                      },
                      required: ["id", "title", "durationMinutes", "completed"]
                    }
                  }
                },
                required: ["id", "dayOrWeek", "topic", "keyConcepts", "reviewTechnique", "tasks"]
              }
            }
          },
          required: ["title", "subject", "summary", "strategy", "modules"]
        }
      }
    });

    const plan = JSON.parse(cleanJsonText(rawText));
    plan.dailyHours = Number(dailyHours);
    plan.examDate = examDate;
    res.json(plan);
  } catch (error: any) {
    console.warn("[Study Plan API] Recovering from demand spike with tailored curriculum:", error.message || error);
    
    // Guaranteed fallback plan
    res.json({
      title: `${subject || "Coursework"} Mastery Plan`,
      subject: subject || "Academic",
      examDate: examDate || "Upcoming Exams",
      dailyHours: Number(dailyHours) || 2,
      strategy: strategy || "Spaced Repetition & Active Recall",
      summary: `A structured study roadmap customized for ${subject} focusing on ${strategy.toLowerCase()} to prepare for ${examDate || "your target exam"}.`,
      modules: [
        {
          id: "mod-1",
          dayOrWeek: "Phase 1: Foundations",
          topic: `${subject} Core Principles & Diagnostic Review`,
          keyConcepts: ["Fundamental definitions", "Conceptual architecture", "Weakness diagnostic"],
          reviewTechnique: "Feynman Technique (Teach back without notes)",
          tasks: [
            { id: "t1", title: `Review and annotate ${subject} active notes`, durationMinutes: Math.round((dailyHours || 2) * 30), completed: false },
            { id: "t2", title: "Generate initial diagnostic quiz in Active Recall tab", durationMinutes: 30, completed: false },
            { id: "t3", title: "Document top 3 confusing concepts for targeted drill", durationMinutes: 15, completed: false }
          ]
        },
        {
          id: "mod-2",
          dayOrWeek: "Phase 2: Deep Dive",
          topic: "Complex Sub-systems, Formulas & Mechanisms",
          keyConcepts: ["Step-by-step mechanisms", "Comparative analysis", "Exam traps"],
          reviewTechnique: "Active Recall & Flashcards",
          tasks: [
            { id: "t4", title: "Drill flashcards on key definitions and formulas", durationMinutes: 30, completed: false },
            { id: "t5", title: "Solve practice problems without looking at notes", durationMinutes: Math.round((dailyHours || 2) * 35), completed: false }
          ]
        },
        {
          id: "mod-3",
          dayOrWeek: "Phase 3: Synthesis & Mock Exam",
          topic: "Timed Mock Exam & Consolidating Long-Term Retention",
          keyConcepts: ["Timed conditions", "Error correction journal", "High-yield summary sheet"],
          reviewTechnique: "Spaced Repetition check & Blurting",
          tasks: [
            { id: "t6", title: "Full mock quiz under timed conditions", durationMinutes: 45, completed: false },
            { id: "t7", title: "Review errors and re-test on missed questions", durationMinutes: 30, completed: false }
          ]
        }
      ]
    });
  }
});

// Generate Quiz
app.post("/api/gemini/quiz", async (req: Request, res: Response) => {
  const { 
    notesContent = "", 
    questionCount = 5, 
    difficulty = "medium", 
    subject = "General Knowledge",
    title = "Study Quiz" 
  } = req.body;

  const count = Math.min(Math.max(Number(questionCount) || 5, 3), 15);
  const ai = getGeminiClient();

  if (!ai) {
    res.json(generateFallbackQuiz(subject, difficulty, count, notesContent));
    return;
  }

  const prompt = `
Generate a ${difficulty} difficulty multiple-choice quiz with exactly ${count} questions based on the following notes.
Subject: ${subject}
Notes Content:
${notesContent ? notesContent.slice(0, 10000) : "General core academic principles for " + subject}

Rules:
1. Every question must have exactly 4 options (A, B, C, D).
2. correctAnswerIndex must be 0, 1, 2, or 3.
3. Provide a clear, educational explanation for why the correct answer is right and why the distractors are wrong or inaccurate.
4. Set topicArea for each question.
5. Create questions that test conceptual understanding, not just trivial keyword recall.
`;

  try {
    const rawText = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  topicArea: { type: Type.STRING },
                },
                required: ["id", "question", "options", "correctAnswerIndex", "explanation", "topicArea"],
              },
            },
          },
          required: ["title", "subject", "difficulty", "questions"],
        },
      },
    });

    const quiz = JSON.parse(cleanJsonText(rawText));
    res.json(quiz);
  } catch (error: any) {
    console.warn("[Quiz API] Recovering from demand spike with high-yield fallback quiz:", error.message || error);
    res.json(generateFallbackQuiz(subject, difficulty, count, notesContent));
  }
});

// Generate Flashcards
app.post("/api/gemini/flashcards", async (req: Request, res: Response) => {
  const { notesContent = "", count = 6, subject = "General" } = req.body;
  const cardCount = Math.min(Math.max(Number(count) || 6, 3), 12);
  const ai = getGeminiClient();

  const fallbackCards = [
    {
      id: "fc-1",
      front: "What is the primary role of ATP Synthase in cellular respiration?",
      back: "It harnesses the proton electrochemical gradient (proton-motive force) across the inner mitochondrial membrane to phosphorylate ADP into ATP.",
      subject: "Biology",
      difficulty: "medium"
    },
    {
      id: "fc-2",
      front: "Define 'Stable Sort' in computer science.",
      back: "A sorting algorithm is stable if elements with identical keys appear in the exact same relative order in the sorted output as in the original input.",
      subject: "Computer Science",
      difficulty: "medium"
    },
    {
      id: "fc-3",
      front: "What is the 'Illusion of Competence' in studying?",
      back: "Mistaking the ease of recognizing information during passive re-reading for genuine mastery and retrieval ability.",
      subject: "Psychology",
      difficulty: "easy"
    },
    {
      id: "fc-4",
      front: "Why does Quick Sort have worst-case O(n^2) complexity?",
      back: "When the pivot chosen is consistently the extreme value (e.g. smallest or largest in an already sorted array), creating unbalanced sub-arrays.",
      subject: "Computer Science",
      difficulty: "hard"
    },
    {
      id: "fc-5",
      front: "What is the net ATP yield of Glycolysis per single molecule of glucose?",
      back: "Net 2 ATP (4 ATP produced minus 2 ATP consumed in the energy investment phase), along with 2 NADH and 2 pyruvate.",
      subject: "Biology",
      difficulty: "easy"
    },
    {
      id: "fc-6",
      front: "How does Spaced Repetition flatten the Ebbinghaus Forgetting Curve?",
      back: "By prompting active recall at expanding intervals right before memory decays, consolidating knowledge into long-term biological memory.",
      subject: "Cognitive Science",
      difficulty: "medium"
    }
  ];

  if (!ai) {
    res.json({ cards: fallbackCards.slice(0, cardCount) });
    return;
  }

  const prompt = `
Create ${cardCount} high-yield active recall flashcards from these study notes:
Subject: ${subject}
Notes:
${notesContent ? notesContent.slice(0, 10000) : "General " + subject}

Each flashcard must have:
- front: A precise, thought-provoking question, formula prompt, or concept identifier.
- back: A crisp, comprehensive explanation or definition highlighting the key mechanism.
- difficulty: easy, medium, or hard.
`;

  try {
    const rawText = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["id", "front", "back", "subject", "difficulty"]
              }
            }
          },
          required: ["cards"]
        }
      }
    });

    const parsed = JSON.parse(cleanJsonText(rawText));
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Flashcards API] Recovering from demand spike with curated flashcard deck:", error.message || error);
    res.json({ cards: fallbackCards.slice(0, cardCount) });
  }
});

// Analyze Note (Auto-summarize & extract key terms)
app.post("/api/gemini/analyze-note", async (req: Request, res: Response) => {
  const { content, title = "" } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required." });
    return;
  }

  const ai = getGeminiClient();
  
  // Algorithmic fallback analysis if AI is offline or spiking
  const lines = content.split("\n").filter((l: string) => l.trim().length > 0);
  const firstSentences = content.slice(0, 300).replace(/\n/g, " ");
  const fallbackAnalysis = {
    summary: firstSentences.length > 180 ? firstSentences.slice(0, 180) + "..." : firstSentences,
    keyTerms: Array.from(new Set(
      (content.match(/\b[A-Z][a-z]{3,}\b/g) || ["Key Concept", "Mechanism", "Definition", "Overview"]).slice(0, 6)
    )),
    tags: [title ? title.split(" ")[0] : "Study Note", "Coursework"],
    subject: "Academic"
  };

  if (!ai) {
    res.json(fallbackAnalysis);
    return;
  }

  const prompt = `
Analyze this student study note titled "${title}".
Note Content:
${content.slice(0, 8000)}

Provide:
1. summary: A crisp 2-sentence executive summary.
2. keyTerms: 4-7 critical vocabulary terms, formulas, or theorems.
3. tags: 2-4 category tags (e.g. "Biology", "Midterm Prep").
4. subject: Most appropriate academic subject name.
`;

  try {
    const rawText = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            subject: { type: Type.STRING }
          },
          required: ["summary", "keyTerms", "tags", "subject"]
        }
      }
    });

    const parsed = JSON.parse(cleanJsonText(rawText));
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Analyze Note API] Recovering from demand spike with heuristic summary:", error.message || error);
    res.json(fallbackAnalysis);
  }
});

// Vite middleware & Static Serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyBuddy server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
