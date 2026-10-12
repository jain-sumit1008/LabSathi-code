import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, Video, HelpCircle, MessageSquare, User, 
  Play, Share2, Send, CheckCircle, XCircle, CornerDownLeft, Trash2, 
  ChevronLeft, ChevronRight, RotateCcw, Bot, ShieldCheck, Sparkles, Hash,
  Edit3, Save, Award, Calendar, FileText, Check, Download
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import axios from 'axios';

// If running inside native Android WebView, use Wi-Fi IP; otherwise keep localhost
const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'http://YOUR_WIFI_IP:5000';

const socket = io(BACKEND_URL);

// Clean, simple static test code for all three languages
const TEMPLATES = {
  python: `# Python 3.10
print("Hello World. This is LabSathi application.")
`,
  cpp: `// C++
#include <iostream>

int main() {
    std::cout << "Hello World. This is LabSathi application." << std::endl;
    return 0;
}
`,
  java: `// Java 21
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World. This is LabSathi application.");
    }
}
`
};

// 5 Python Lab Quiz Questions (5 marks each = 25 marks total)
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is the output of the following Python snippet?",
    code: `x = [1, 2, 3]\ny = x\ny.append(4)\nprint(len(x))`,
    options: ["3", "4", "Error: list is immutable", "None"],
    correctIndex: 1,
    explanation: "Lists are mutable in Python. 'y' references the same object as 'x', so appending to 'y' modifies 'x'."
  },
  {
    id: 2,
    question: "What does the following code evaluate to?",
    code: `print(type(lambda x: x + 1))`,
    options: ["<class 'function'>", "<class 'lambda'>", "<class 'method'>", "<class 'generator'>"],
    correctIndex: 0,
    explanation: "Lambda expressions produce instances of the standard function type."
  },
  {
    id: 3,
    question: "What will be printed by this slicing operation?",
    code: `s = "SVVV Indore"\nprint(s[:: -1][:4])`,
    options: ["erod", "erodn", "VVVS", "rodn"],
    correctIndex: 0,
    explanation: "s[::-1] reverses the string to 'erodnI VVVS', and [:4] takes the first 4 characters: 'erod'."
  },
  {
    id: 4,
    question: "What is the output of this dictionary comprehension?",
    code: `d = {k: k**2 for k in (1, 2, 3) if k % 2 != 0}\nprint(d)`,
    options: ["{1: 1, 2: 4, 3: 9}", "{1: 1, 3: 9}", "{2: 4}", "[1, 9]"],
    correctIndex: 1,
    explanation: "The condition 'k % 2 != 0' filters out even numbers (2), keeping only keys 1 and 3."
  },
  {
    id: 5,
    question: "What is printed when testing boolean and arithmetic operations in Python?",
    code: `print(True + True * 3)`,
    options: ["4", "6", "True", "Type Error"],
    correctIndex: 0,
    explanation: "In Python, bool is a subclass of int where True == 1. Following PEMDAS: 1 + (1 * 3) = 4."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');

  // Tab 1: Studio state
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(TEMPLATES.python);
  const [terminalOutput, setTerminalOutput] = useState('Press "Run Code" to compile and execute...\n');
  const [terminalInputVal, setTerminalInputVal] = useState('');
  const terminalEndRef = useRef(null);

  // Tab 2: Full Lecture Content Restored (Module 1 + Module 2)
  const [course, setCourse] = useState({
    courseTitle: "Operating Systems & System Programming",
    faculty: "Dr. Sachin Sharma (SVVV CS Dept)",
    modules: [
      {
        id: "mod_1",
        title: "Module 1: Process Management & System Calls",
        lectures: [
          { id: "lec_101", title: "1.1 Introduction to OS & Kernel Archite...", duration: "14m", videoUrl: "https://www.youtube.com/embed/26QPDBe-NB8", isCompleted: true },
          { id: "lec_102", title: "1.2 Process Creation with fork() & exec(...)", duration: "22m", videoUrl: "https://www.youtube.com/embed/xVSPv-9x3gk", isCompleted: true },
          { id: "lec_103", title: "1.3 Zombie & Orphan Processes Explai...", duration: "18m", videoUrl: "https://www.youtube.com/embed/94URLRNv3VU", isCompleted: false }
        ]
      },
      {
        id: "mod_2",
        title: "Module 2: CPU Scheduling & Synchronization",
        lectures: [
          { id: "lec_201", title: "2.1 FCFS & Round Robin Scheduling Al...", duration: "25m", videoUrl: "https://www.youtube.com/embed/EWkqlL11kQ8", isCompleted: false },
          { id: "lec_202", title: "2.2 Mutex Locks and Semaphores in Java", duration: "28m", videoUrl: "https://www.youtube.com/embed/gXgK5Qn_n6E", isCompleted: false }
        ]
      }
    ]
  });

  const [activeLecture, setActiveLecture] = useState({
    id: "lec_102",
    title: "1.2 Process Creation with fork() & exec() in C++",
    duration: "22m",
    videoUrl: "https://www.youtube.com/embed/xVSPv-9x3gk",
    isCompleted: true
  });

  const [notes, setNotes] = useState('Hi this is Sumit and its my 2nd lecture.');
  
  // Interactive To-Do List with delete capability
  const [todos, setTodos] = useState([
    { id: 1, text: 'Review fork() process tree diagram', done: false },
    { id: 2, text: 'Complete Lab Practical Task 3', done: true },
    { id: 3, text: 'FCFS', done: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  // Tab 3: Quiz State (5 questions, 5 marks each = 25 marks)
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Tab 4: Clean initial messages without hardcoded presets
  const [activeChannel, setActiveChannel] = useState('python-queries');
  const [channelMessages, setChannelMessages] = useState({
    'python-queries': [
      { sender: 'LabSathi Assistant', role: 'faculty', text: 'Did you have some query i can help you', time: '10:00 AM' }
    ],
    'os-lab-batch-b': [
      { sender: 'LabSathi Assistant', role: 'faculty', text: 'Did you have some query i can help you', time: '10:00 AM' }
    ],
    'oops-cpp-doubts': [
      { sender: 'LabSathi Assistant', role: 'faculty', text: 'Did you have some query i can help you', time: '10:00 AM' }
    ],
    'faculty-help': [
      { sender: 'Dr. Sachin Sharma', role: 'faculty', text: 'Did you have some query i can help you', time: '10:00 AM' }
    ],
    'ai-assistant': [
      { sender: 'LabSathi AI', role: 'ai', text: 'Did you have some query i can help you', time: '10:00 AM' }
    ]
  });
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  // Tab 5: Dynamic Profile & Lab Record History States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Kanak Solanki',
    enrollment: '0827CS211042',
    branchSem: 'CSE • Sem 1st',
    college: 'Shri Vaishnav Vidyapeeth Vishwavidyalaya, Indore',
    email: 'kanak.solanki@svvv.edu.in',
    bio: 'Undergraduate Computer Science student focusing on OS systems programming, C++, and Python problem solving.'
  });

  const [practicalHistory, setPracticalHistory] = useState([
    {
      id: 4,
      title: 'Practical 04: Process Tree Execution using fork() & exec()',
      lang: 'C++',
      date: '10 Oct 2026',
      status: 'Verified by Faculty',
      verified: true
    },
    {
      id: 3,
      title: 'Practical 03: Multithreaded Matrix Multiplication',
      lang: 'Java',
      date: '03 Oct 2026',
      status: 'Verified by Faculty',
      verified: true
    },
    {
      id: 2,
      title: 'Practical 02: Fibonacci Generator & Dynamic Recursion',
      lang: 'Python',
      date: '26 Sep 2026',
      status: 'Submitted & Evaluated',
      verified: true
    },

  ]);

  useEffect(() => {
    socket.emit('join_lab', 'general');

    socket.on('terminal_data', (chunk) => {
      setTerminalOutput((prev) => prev + chunk);
    });

    socket.on('receive_chat_message', (msg) => {
      const targetRoom = msg.channel || 'python-queries';
      setChannelMessages(prev => ({
        ...prev,
        [targetRoom]: [...(prev[targetRoom] || []), msg]
      }));
    });

    return () => {
      socket.off('terminal_data');
      socket.off('receive_chat_message');
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, activeChannel]);

  // Tab 1 Handlers
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(TEMPLATES[newLang]);
    setTerminalOutput(`Switched to ${newLang.toUpperCase()}.\nPress "Run Code" to compile and execute.\n`);
  };

  const handleRunCode = () => {
    setTerminalOutput(`Executing ${language.toUpperCase()}...\n`);
    socket.emit('start_interactive_run', { language, code });
  };

  const handleSendTerminalInput = (e) => {
    e.preventDefault();
    if (!terminalInputVal.trim()) return;
    setTerminalOutput((prev) => prev + terminalInputVal + '\n');
    socket.emit('terminal_input', terminalInputVal);
    setTerminalInputVal('');
  };

  // SHARE TO CHAT HANDLER
  const handleShareToChat = () => {
    const targetChannel = language === 'cpp' ? 'oops-cpp-doubts' : 'python-queries';
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const sharedMsg = {
      sender: profileData.name || 'Student',
      role: 'student',
      channel: targetChannel,
      text: `Shared a ${language.toUpperCase()} snippet from Code Studio:\n\`\`\`${language}\n${code}\n\`\`\``,
      time: currentTime
    };

    setChannelMessages(prev => ({
      ...prev,
      [targetChannel]: [...(prev[targetChannel] || []), sharedMsg]
    }));

    socket.emit('send_chat_message', sharedMsg);
    setActiveChannel(targetChannel);
    setActiveTab('chat');
  };

  // Tab 2 Progress & Lecture Handlers
  const calculateProgress = () => {
    if (!course || !course.modules) return 0;
    let total = 0, completed = 0;
    course.modules.forEach(m => m.lectures.forEach(l => { 
      total++; 
      if (l.isCompleted) completed++; 
    }));
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleToggleComplete = (lectureId) => {
    const updatedModules = course.modules.map(mod => ({
      ...mod,
      lectures: mod.lectures.map(lec => 
        lec.id === lectureId ? { ...lec, isCompleted: !lec.isCompleted } : lec
      )
    }));
    setCourse({ ...course, modules: updatedModules });
    if (activeLecture?.id === lectureId) {
      setActiveLecture(prev => ({ ...prev, isCompleted: !prev.isCompleted }));
    }
  };

  // Tab 2 To-Do Handlers
  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]);
    setNewTodo('');
  };

  const handleToggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  // Tab 3 Quiz Helpers
  const handleSelectQuizOption = (optionIndex) => {
    if (quizSubmitted) return;
    setQuizAnswers({
      ...quizAnswers,
      [currentQIndex]: optionIndex
    });
  };

  const calculateQuizScore = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        score += 5;
      }
    });
    return score;
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentQIndex(0);
  };

  // Tab 4 Message Dispatcher
  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;

    const userMessage = {
      sender: profileData.name || 'Student',
      role: 'student',
      text: inputMsg,
      channel: activeChannel,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (activeChannel === 'ai-assistant') {
      setChannelMessages(prev => ({
        ...prev,
        'ai-assistant': [...(prev['ai-assistant'] || []), userMessage]
      }));

      socket.emit('ai_query', { text: inputMsg });
      setInputMsg('');
      return;
    }

    socket.emit('send_chat_message', userMessage);
    setInputMsg('');
  };

  // Dynamic Avatar Initials Helper
  const getAvatarInitials = (fullName) => {
    if (!fullName) return 'ST';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const currentQ = QUIZ_QUESTIONS[currentQIndex];
  const totalScore = calculateQuizScore();
  const answeredCount = Object.keys(quizAnswers).length;
  const activeMsgs = channelMessages[activeChannel] || [];

  return (
    <div className="flex justify-center items-center h-screen bg-neutral-950 font-sans p-2">
      <div className="w-[1024px] h-[580px] bg-[#12161f] border-4 border-neutral-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative text-white">
        
        {/* TOP STATUS BAR */}
        <div className="h-8 bg-[#0f121a] flex justify-between items-center px-6 text-xs text-neutral-400 select-none border-b border-neutral-800">
          <span className="font-semibold text-neutral-300">LabSathi • SVVV Indore</span>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400">● Connected to Lab Network</span>
            <span>📶 88%</span>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-hidden relative">

          {/* TAB 1: CODE STUDIO */}
          {activeTab === 'studio' && (
            <div className="flex h-full">
              {/* Left: Code Editor */}
              <div className="flex-1 flex flex-col border-r border-neutral-800">
                <div className="h-10 bg-[#161a23] flex items-center justify-between px-3 border-b border-neutral-800">
                  <select 
                    value={language} 
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-neutral-800 text-xs px-2 py-1 rounded text-cyan-400 font-mono outline-none cursor-pointer"
                  >
                    <option value="python">Python 3.10</option>
                    <option value="cpp">C++ (GCC 13 / g++)</option>
                    <option value="java">Java 21 (OpenJDK)</option>
                  </select>

                  <div className="flex space-x-2">
                    <button 
                      onClick={handleShareToChat}
                      className="flex items-center space-x-1 text-xs bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition"
                    >
                      <Share2 size={13} /> <span>Share to Chat</span>
                    </button>
                    <button 
                      onClick={handleRunCode} 
                      className="flex items-center space-x-1 text-xs bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1 rounded text-white transition"
                    >
                      <Play size={13} fill="white" /> <span>Run Code</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <Editor
                    height="100%"
                    language={language === 'cpp' ? 'cpp' : language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Right: Output Terminal */}
              <div className="w-80 bg-[#0d1017] flex flex-col font-mono text-xs border-l border-neutral-800">
                <div className="h-9 bg-[#10141d] px-3 flex items-center justify-between text-neutral-400 border-b border-neutral-800">
                  <span className="font-bold text-[11px]">TERMINAL OUTPUT</span>
                  <button onClick={() => setTerminalOutput('')} className="text-neutral-500 hover:text-white transition">Clear</button>
                </div>
                
                <div className="flex-1 p-3 text-emerald-400 overflow-y-auto whitespace-pre-wrap">
                  {terminalOutput}
                  <div ref={terminalEndRef} />
                </div>

                {/* Inline Console Input Line */}
                <form 
                  onSubmit={handleSendTerminalInput} 
                  className="h-10 bg-[#141822] border-t border-neutral-800 px-2 flex items-center gap-1.5"
                >
                  <span className="text-cyan-400 font-bold">{'>'}</span>
                  <input
                    type="text"
                    value={terminalInputVal}
                    onChange={(e) => setTerminalInputVal(e.target.value)}
                    placeholder="Type value (if required) and press Enter..."
                    className="flex-1 bg-transparent text-white outline-none font-mono text-xs"
                  />
                  <button type="submit" className="text-neutral-400 hover:text-cyan-400 p-1">
                    <CornerDownLeft size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE LECTURES */}
          {activeTab === 'lectures' && (
            <div className="flex h-full p-4 gap-4 bg-[#0d1017]">
              
              {/* Left Column: Modules & Course Syllabus */}
              <div className="w-[340px] bg-[#141822] rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-cyan-400">{course.courseTitle}</h3>
                      <p className="text-[11px] text-neutral-400">{course.faculty}</p>
                    </div>
                    <span className="text-xs font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                      {calculateProgress()}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mb-4">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500" 
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>

                  {/* Modules Accordion List */}
                  <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                    {course.modules.map((mod) => (
                      <div key={mod.id} className="bg-[#181d2a] p-2.5 rounded-xl border border-neutral-800/80">
                        <span className="text-xs font-semibold text-neutral-300 block mb-2">{mod.title}</span>
                        <div className="space-y-1.5">
                          {mod.lectures.map((lec) => {
                            const isCurrent = activeLecture?.id === lec.id;
                            return (
                              <div 
                                key={lec.id}
                                onClick={() => setActiveLecture(lec)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                                  isCurrent 
                                    ? 'bg-cyan-950/50 border border-cyan-600/40 text-cyan-300' 
                                    : 'bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <input 
                                    type="checkbox" 
                                    checked={lec.isCompleted} 
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleToggleComplete(lec.id);
                                    }}
                                    className="accent-emerald-500 rounded cursor-pointer"
                                  />
                                  <span className="truncate">{lec.title}</span>
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono ml-2">{lec.duration}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Column: Video Stream & Controls */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-neutral-800 relative shadow-inner">
                  {activeLecture ? (
                    <iframe
                      className="w-full h-full"
                      src={`${activeLecture.videoUrl}?autoplay=0&rel=0`}
                      title={activeLecture.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                      <Video size={40} className="mb-2" />
                      <p className="text-xs">Select a lecture to start streaming</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#141822] px-4 py-2.5 rounded-xl border border-neutral-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-neutral-400">Now Playing: </span>
                    <span className="font-semibold text-white">{activeLecture?.title || "None"}</span>
                  </div>
                  <button 
                    onClick={() => activeLecture && handleToggleComplete(activeLecture.id)}
                    className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                  >
                    {activeLecture?.isCompleted ? "Mark as Completed ✔" : "Mark Completed"}
                  </button>
                </div>
              </div>

              {/* Right Column: Lecture Notes & Interactive Deletable Tasks */}
              <div className="w-[280px] bg-[#141822] rounded-2xl p-3 border border-neutral-800 flex flex-col justify-between">
                <div className="flex flex-col flex-1 mb-3">
                  <span className="text-xs font-bold text-neutral-300 mb-1 flex items-center justify-between">
                    <span>📝 Lecture Notes</span>
                    <span className="text-[10px] text-neutral-500 font-normal">Auto-saved</span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes..."
                    className="flex-1 bg-[#10131b] p-2.5 rounded-xl text-xs text-neutral-200 outline-none border border-neutral-800 resize-none font-mono"
                  />
                </div>

                {/* To-Do Checklist with Delete Action */}
                <div className="h-[180px] flex flex-col pt-2 border-t border-neutral-800">
                  <span className="text-xs font-bold text-neutral-300 mb-1.5">Tasks / To-Do List</span>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {todos.map(todo => (
                      <div 
                        key={todo.id} 
                        className="flex items-center justify-between p-1.5 rounded bg-[#181d2a] hover:bg-neutral-800 transition group"
                      >
                        <div 
                          onClick={() => handleToggleTodo(todo.id)}
                          className="flex items-center space-x-2 cursor-pointer truncate flex-1 mr-2"
                        >
                          <input 
                            type="checkbox" 
                            checked={todo.done} 
                            readOnly 
                            className="accent-cyan-400 cursor-pointer" 
                          />
                          <span className={`text-[11px] truncate ${todo.done ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                            {todo.text}
                          </span>
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          title="Delete Task"
                          className="text-neutral-500 hover:text-red-400 p-0.5 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5 mt-2">
                    <input
                      type="text"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                      placeholder="Add task..."
                      className="flex-1 bg-[#10131b] px-2 py-1 text-xs rounded-lg border border-neutral-800 text-white outline-none"
                    />
                    <button 
                      onClick={handleAddTodo}
                      className="bg-cyan-600 hover:bg-cyan-500 px-2 py-1 text-xs font-bold rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: QUIZ & ASSESSMENT */}
          {activeTab === 'quiz' && (
            <div className="h-full p-4 flex gap-4 bg-[#0d1017]">
              
              {/* Left Panel: Question Navigator & Summary */}
              <div className="w-64 bg-[#141822] rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-cyan-400">Python Lab Assessment</h3>
                      <p className="text-[10px] text-neutral-400">Unit 02 • Core Semantics</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                      25 Marks
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 mb-3 flex justify-between">
                    <span>Progress:</span>
                    <span className="text-white font-semibold">{answeredCount} of {QUIZ_QUESTIONS.length} Answered</span>
                  </div>

                  {/* Question Index Buttons */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {QUIZ_QUESTIONS.map((q, idx) => {
                      const isAnswered = quizAnswers[idx] !== undefined;
                      const isCurrent = currentQIndex === idx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQIndex(idx)}
                          className={`h-9 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center border ${
                            isCurrent
                              ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                              : isAnswered
                              ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-400'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                          }`}
                        >
                          Q{idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#10141d] rounded-xl border border-neutral-800/80 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Per Question:</span>
                      <span className="text-white font-medium">+5 Marks</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Negative Marking:</span>
                      <span className="text-emerald-400 font-medium">None (0)</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Passing Score:</span>
                      <span className="text-white font-medium">15 / 25 (60%)</span>
                    </div>
                  </div>
                </div>

                {!quizSubmitted ? (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Submit Final Assessment
                  </button>
                ) : (
                  <button
                    onClick={resetQuiz}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Retake Assessment
                  </button>
                )}
              </div>

              {/* Right Panel: Interactive Question Screen or Scorecard */}
              <div className="flex-1 bg-[#141822] rounded-2xl p-5 border border-neutral-800 flex flex-col justify-between overflow-hidden">
                {!quizSubmitted ? (
                  <>
                    <div>
                      {/* Question Header */}
                      <div className="flex justify-between items-center mb-3 border-b border-neutral-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40 text-xs font-mono font-bold">
                            Question {currentQIndex + 1} of {QUIZ_QUESTIONS.length}
                          </span>
                          <span className="text-xs text-neutral-500">Weightage: 5 Marks</span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {quizAnswers[currentQIndex] !== undefined ? '● Saved' : '○ Not Attempted'}
                        </span>
                      </div>

                      {/* Question Text */}
                      <h2 className="text-sm font-semibold text-neutral-200 mb-3">{currentQ.question}</h2>

                      {/* Code Block */}
                      {currentQ.code && (
                        <pre className="bg-[#0b0e14] p-3 rounded-xl font-mono text-xs text-emerald-400 border border-neutral-800/80 mb-4 whitespace-pre">
                          {currentQ.code}
                        </pre>
                      )}

                      {/* Options Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {currentQ.options.map((opt, i) => {
                          const isSelected = quizAnswers[currentQIndex] === i;
                          return (
                            <button
                              key={i}
                              onClick={() => handleSelectQuizOption(i)}
                              className={`p-3 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-semibold'
                                  : 'border-neutral-800 bg-[#10141d] hover:bg-neutral-800/70 text-neutral-300'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                                isSelected ? 'bg-cyan-500 text-black' : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                      <button
                        onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQIndex === 0}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition"
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>

                      <span className="text-[11px] text-neutral-500 font-mono">
                        Question {currentQIndex + 1} / {QUIZ_QUESTIONS.length}
                      </span>

                      <button
                        onClick={() => setCurrentQIndex((prev) => Math.min(QUIZ_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentQIndex === QUIZ_QUESTIONS.length - 1}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  /* Detailed Assessment Scorecard */
                  <div className="flex h-full gap-4">
                    {/* Score Summary Box */}
                    <div className="w-56 bg-[#10141d] rounded-xl p-4 border border-neutral-800 flex flex-col justify-between text-center">
                      <div>
                        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 bg-emerald-500/10 border border-emerald-500/30">
                          <CheckCircle size={24} className="text-emerald-400" />
                        </div>
                        <h4 className="text-xs font-bold text-neutral-300">Assessment Result</h4>
                        <div className="text-3xl font-black text-cyan-400 my-2">{totalScore} <span className="text-sm font-normal text-neutral-500">/ 25</span></div>
                        <p className={`text-xs font-bold ${totalScore >= 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {totalScore >= 15 ? 'PASSED (VERIFIED)' : 'NEEDS IMPROVEMENT'}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1">Accuracy: {(totalScore / 25) * 100}%</p>
                      </div>

                      <div className="text-[10px] text-neutral-500 border-t border-neutral-800 pt-2">
                        Recorded to SVVV Python Practical Assessment Log
                      </div>
                    </div>

                    {/* Detailed Question Review List */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-neutral-300 mb-2">Itemized Question Analysis:</span>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {QUIZ_QUESTIONS.map((q, idx) => {
                          const userAns = quizAnswers[idx];
                          const isCorrect = userAns === q.correctIndex;
                          return (
                            <div key={q.id} className="p-3 bg-[#0d1017] rounded-xl border border-neutral-800/80 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-neutral-300">Q{idx + 1}: {q.question}</span>
                                <span className={`flex items-center gap-1 font-mono font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isCorrect ? <CheckCircle size={13} /> : <XCircle size={13} />}
                                  {isCorrect ? '+5' : '0'} / 5
                                </span>
                              </div>
                              <div className="text-[11px] space-y-0.5 mt-1.5">
                                <div className="text-neutral-400">
                                  Your Answer: <span className={isCorrect ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                                    {userAns !== undefined ? `${String.fromCharCode(65 + userAns)}. ${q.options[userAns]}` : 'Not Answered'}
                                  </span>
                                </div>
                                {!isCorrect && (
                                  <div className="text-neutral-400">
                                    Correct Answer: <span className="text-emerald-400 font-medium">{String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}</span>
                                  </div>
                                )}
                                <p className="text-[10px] text-neutral-500 italic mt-1">💡 {q.explanation}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: CHATBOT, FACULTY INTERACTION & PYTHON FRONT CHANNEL */}
          {activeTab === 'chat' && (
            <div className="flex h-full bg-[#0f121a]">
              
              {/* Left Column: Channels & Faculty Direct Connect */}
              <div className="w-60 bg-[#141822] border-r border-neutral-800 p-3 flex flex-col justify-between text-xs">
                <div className="space-y-4">
                  {/* Category 1: Lab Channels (Python is FIRST/SWAPPED in FRONT) */}
                  <div>
                    <span className="text-[10px] tracking-wider text-neutral-500 font-bold uppercase block mb-1.5">
                      Lab Channels
                    </span>
                    <div className="space-y-1">
                      {[
                        { id: 'python-queries', label: 'python-queries', tag: 'Active' },
                        { id: 'os-lab-batch-b', label: 'os-lab-batch-b' },
                        { id: 'oops-cpp-doubts', label: 'oops-cpp-doubts' },
                      ].map((ch) => {
                        const isActive = activeChannel === ch.id;
                        return (
                          <div
                            key={ch.id}
                            onClick={() => setActiveChannel(ch.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                              isActive
                                ? 'bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 font-semibold'
                                : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Hash size={13} className={isActive ? 'text-cyan-400' : 'text-neutral-500'} />
                              <span className="truncate">{ch.label}</span>
                            </span>
                            {ch.tag && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900/40 text-cyan-300 font-mono">
                                {ch.tag}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: Faculty Desk */}
                  <div>
                    <span className="text-[10px] tracking-wider text-neutral-500 font-bold uppercase block mb-1.5">
                      Faculty Direct Connect
                    </span>
                    <div
                      onClick={() => setActiveChannel('faculty-help')}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                        activeChannel === 'faculty-help'
                          ? 'bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 font-semibold'
                          : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-emerald-800 flex items-center justify-center text-[10px] font-bold text-white">
                          SS
                        </div>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <div className="truncate flex-1">
                        <span className="truncate block">Dr. Sachin Sharma</span>
                        <span className="text-[9px] text-emerald-400/80 block">Faculty Advisor</span>
                      </div>
                    </div>
                  </div>

                  {/* Category 3: AI Lab Copilot */}
                  <div>
                    <span className="text-[10px] tracking-wider text-neutral-500 font-bold uppercase block mb-1.5">
                      AI Assistants
                    </span>
                    <div
                      onClick={() => setActiveChannel('ai-assistant')}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                        activeChannel === 'ai-assistant'
                          ? 'bg-purple-950/60 border border-purple-600/50 text-purple-300 font-semibold shadow-inner'
                          : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                      }`}
                    >
                      <Bot size={15} className="text-purple-400" />
                      <div className="flex-1 truncate">
                        <span className="truncate block">LabSathi AI</span>
                        <span className="text-[9px] text-purple-400/80 flex items-center gap-0.5">
                          <Sparkles size={8} /> 24/7 Code Mentor
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Status Bar */}
                <div className="p-2 bg-[#0c0e14] rounded-xl border border-neutral-800/80 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-700 flex items-center justify-center text-[10px] font-bold">
                    {getAvatarInitials(profileData.name)}
                  </div>
                  <div className="truncate flex-1">
                    <span className="text-[11px] font-semibold text-white block truncate">{profileData.name}</span>
                    <span className="text-[9px] text-emerald-400 block">● Lab Online</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Chat Feed & Interactive Input */}
              <div className="flex-1 flex flex-col justify-between">
                
                {/* Header Banner */}
                <div className="h-10 bg-[#141822] px-4 flex items-center justify-between border-b border-neutral-800">
                  <div className="flex items-center gap-2 text-xs">
                    {activeChannel === 'ai-assistant' ? (
                      <>
                        <Bot size={15} className="text-purple-400" />
                        <span className="font-bold text-purple-300">LabSathi AI Assistant</span>
                        <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700/40">
                          Interactive AI Mode
                        </span>
                      </>
                    ) : activeChannel === 'faculty-help' ? (
                      <>
                        <ShieldCheck size={15} className="text-emerald-400" />
                        <span className="font-bold text-white">Faculty Helpdesk • Dr. Sachin Sharma</span>
                        <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded">
                          Official
                        </span>
                      </>
                    ) : (
                      <>
                        <Hash size={15} className="text-cyan-400" />
                        <span className="font-bold text-white">#{activeChannel}</span>
                        <span className="text-[10px] text-neutral-500">Student Peer Discussion</span>
                      </>
                    )}
                  </div>

                  <span className="text-[11px] text-neutral-400">SVVV CSE Network</span>
                </div>

                {/* Message Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                  {/* AI Quick Prompts Chips */}
                  {activeChannel === 'ai-assistant' && (
                    <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl mb-3">
                      <span className="text-[11px] font-semibold text-purple-300 block mb-1.5">
                        ✨ Quick Prompts for Lab Practical:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Explain fork() memory duplication",
                          "Why is my segmentation fault happening?",
                          "Python list vs tuple time complexity",
                          "How to write clean docstrings?"
                        ].map((promptText, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setInputMsg(promptText)}
                            className="text-[10px] bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 px-2.5 py-1 rounded-lg border border-purple-700/40 transition"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Rendering Block with Code Formatter */}
                  {activeMsgs.map((m, i) => {
                    const isFaculty = m.role === 'faculty';
                    const isAI = m.role === 'ai';

                    const parts = (m.text || '').split(/(```[\s\S]*?```)/g);

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border max-w-xl transition ${
                          isAI
                            ? 'bg-[#181328] border-purple-800/40'
                            : isFaculty
                            ? 'bg-[#101c18] border-emerald-800/50'
                            : 'bg-[#161a23] border-neutral-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${
                              isAI ? 'text-purple-300 flex items-center gap-1' : isFaculty ? 'text-emerald-300' : 'text-cyan-300'
                            }`}>
                              {isAI && <Bot size={12} />}
                              {m.sender}
                            </span>
                            {isFaculty && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded border border-emerald-500/30">
                                Faculty
                              </span>
                            )}
                            {isAI && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded border border-purple-500/30">
                                AI Bot
                              </span>
                            )}
                          </div>
                          <span className="text-neutral-500 text-[10px] font-mono">{m.time}</span>
                        </div>

                        {/* Structured Text & Code Formatter */}
                        <div className="text-neutral-200 text-xs leading-relaxed space-y-2">
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('```') && part.endsWith('```')) {
                              const lines = part.slice(3, -3).trim().split('\n');
                              const firstLine = lines[0].trim().toLowerCase();
                              const hasLangHeader = ['cpp', 'c++', 'python', 'py', 'java'].includes(firstLine);
                              const codeBody = hasLangHeader ? lines.slice(1).join('\n') : lines.join('\n');
                              return (
                                <pre
                                  key={pIdx}
                                  className="p-3 bg-[#0a0d13] rounded-lg font-mono text-emerald-400 text-[11px] overflow-x-auto whitespace-pre border border-neutral-800"
                                >
                                  {codeBody}
                                </pre>
                              );
                            }
                            return (
                              <p key={pIdx} className="whitespace-pre-line">
                                {part.replace(/###/g, '').trim()}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Toolbar */}
                <div className="h-12 border-t border-neutral-800 px-3 flex items-center space-x-2 bg-[#141822]">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={
                      activeChannel === 'ai-assistant'
                        ? "Ask LabSathi AI to debug code, explain fork(), or generate templates..."
                        : activeChannel === 'faculty-help'
                        ? "Message Dr. Sachin Sharma (Official Doubt)..."
                        : "Post doubt in #" + activeChannel + "..."
                    }
                    className="flex-1 bg-neutral-800/90 text-xs px-3 py-2 rounded-xl outline-none text-white border border-neutral-700/40 focus:border-cyan-500 transition"
                  />
                  <button 
                    onClick={handleSendMessage} 
                    className={`p-2 rounded-xl transition ${
                      activeChannel === 'ai-assistant'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    <Send size={14} />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: PROFESSIONAL EDITABLE STUDENT PROFILE & LAB RECORD */}
          {activeTab === 'profile' && (
            <div className="p-4 h-full flex flex-col justify-between bg-[#0d1017] gap-3">
              
              {/* Main Content Area */}
              <div className="flex gap-4 flex-1 overflow-hidden">
                
                {/* Left: Editable Profile Identity Card */}
                <div className="w-[330px] bg-[#141822] p-4 rounded-2xl border border-neutral-800 flex flex-col justify-between overflow-y-auto">
                  <div>
                    {/* Header Action: Edit / Save Toggle */}
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800/80">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Student Identity
                      </span>
                      <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          isEditingProfile
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700'
                        }`}
                      >
                        {isEditingProfile ? (
                          <>
                            <Save size={12} /> <span>Save Profile</span>
                          </>
                        ) : (
                          <>
                            <Edit3 size={12} /> <span>Edit Profile</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Avatar Banner */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg border border-cyan-400/30">
                        {getAvatarInitials(profileData.name)}
                      </div>
                      <div className="flex-1 truncate">
                        <span className="text-xs text-neutral-400 block">Department of <br></br>Information Security & Cloud Computing </span>
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <Check size={11} /> Lab Verified ID
                        </span>
                      </div>
                    </div>

                    {/* Field Inputs (Toggle View vs Edit) */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Full Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full bg-[#0d1017] px-2.5 py-1.5 rounded-lg border border-neutral-700 text-white text-xs outline-none focus:border-cyan-400"
                          />
                        ) : (
                          <p className="font-semibold text-neutral-100 text-sm truncate">{profileData.name}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Enrollment No.</label>
                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={profileData.enrollment}
                              onChange={(e) => setProfileData({ ...profileData, enrollment: e.target.value })}
                              className="w-full bg-[#0d1017] px-2.5 py-1.5 rounded-lg border border-neutral-700 text-white text-xs font-mono outline-none focus:border-cyan-400"
                            />
                          ) : (
                            <p className="font-mono text-cyan-300 font-semibold">{profileData.enrollment}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5"> Branch / Semester</label>
                          {isEditingProfile ? (
                            <input
                              type="text"
                              value={profileData.branchSem}
                              onChange={(e) => setProfileData({ ...profileData, branchSem: e.target.value })}
                              className="w-full bg-[#0d1017] px-2.5 py-1.5 rounded-lg border border-neutral-700 text-white text-xs outline-none focus:border-cyan-400"
                            />
                          ) : (
                            <p className="text-neutral-300 truncate">{profileData.branchSem}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Institution</label>
                        <p className="text-neutral-400 text-[11px] truncate">{profileData.college}</p>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Student Bio & Focus</label>
                        {isEditingProfile ? (
                          <textarea
                            value={profileData.bio}
                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                            rows={3}
                            className="w-full bg-[#0d1017] p-2 rounded-lg border border-neutral-700 text-white text-[11px] outline-none focus:border-cyan-400 resize-none font-sans"
                          />
                        ) : (
                          <p className="text-[11px] text-neutral-400 leading-relaxed bg-[#0d1017] p-2 rounded-lg border border-neutral-800/80">
                            {profileData.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-500 font-mono flex justify-between">
                    <span>Academic Year: 2026–27</span>
                    <span className="text-emerald-400">Status: Regular</span>
                  </div>
                </div>

                {/* Right: Lab Analytics & Practical File Log */}
                <div className="flex-1 bg-[#141822] p-4 rounded-2xl border border-neutral-800 flex flex-col justify-between overflow-hidden">
                  
                  {/* Top: Analytical Quick Metric Cards */}
                  <div>
                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                      {/* <div className="bg-[#10141d] p-2.5 rounded-xl border border-neutral-800 flex items-center gap-2.5">
                        <div className="p-2 bg-cyan-950/60 text-cyan-400 rounded-lg border border-cyan-800/40">
                          <Award size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Lab Attendance</span>
                          <span className="text-sm font-bold text-white">94%</span>
                        </div> 
                      </div> */}

                      <div className="bg-[#10141d] p-2.5 rounded-xl border border-neutral-800 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/40">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Submissions</span>
                          <span className="text-sm font-bold text-emerald-400">4 / 5 Practicals</span>
                        </div>
                      </div>

                      <div className="bg-[#10141d] p-2.5 rounded-xl border border-neutral-800 flex items-center gap-2.5">
                        <div className="p-2 bg-purple-950/60 text-purple-400 rounded-lg border border-purple-800/40">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Assessment Score</span>
                          <span className="text-sm font-bold text-cyan-400">20 / 25 Marks</span>
                        </div>
                      </div>
                    </div>

                    {/* Practical File Submission History Table */}
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-xs text-neutral-200">
                        Official Lab Practical File Record
                      </h3>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {practicalHistory.length} Registered Tasks
                      </span>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1 text-xs">
                      {practicalHistory.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-[#10141d] rounded-xl border border-neutral-800/80 hover:border-neutral-700 transition"
                        >
                          <div className="truncate flex-1 mr-3">
                            <span className="font-medium text-neutral-200 block truncate text-[11px]">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-neutral-800 font-mono text-cyan-400">
                                {item.lang}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar size={10} /> {item.date}
                              </span>
                            </div>
                          </div>

                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            <Check size={12} /> {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sign-off Banner */}
                  <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-[10px] text-neutral-400">
                    <span>Verified by: <strong>Prof. Sachin Sharma</strong> (Course Faculty)</span>
                    <span className="text-emerald-400 font-mono">SVVV Lab Seal: VERIFIED</span>
                  </div>

                </div>

              </div>

              {/* Bottom Action: Formatted Record Export
              <button 
                onClick={() => alert(`Practical record compiled for ${profileData.name} (${profileData.enrollment})!\nIncludes all verified practicals, timestamped compiler logs, and gradebook seals.`)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download Formatted Practical Record (Certified PDF)
              </button> */}

            </div>
          )}

        </div>

        {/* BOTTOM NAVIGATION DOCK (5 TABS) */}
        <div className="h-14 bg-[#0d1017] border-t border-neutral-800 flex justify-around items-center px-8">
          {[
            { id: 'studio', label: 'CODE STUDIO', icon: Code },
            { id: 'lectures', label: 'LECTURES', icon: Video },
            { id: 'quiz', label: 'QUIZ', icon: HelpCircle },
            { id: 'chat', label: 'CHAT', icon: MessageSquare },
            { id: 'profile', label: 'PROFILE', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition ${isActive ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                <Icon size={18} />
                <span className="text-[10px] tracking-wider font-semibold">{tab.label}</span>
                {isActive && <div className="w-8 h-0.5 bg-cyan-400 rounded-full" />}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}