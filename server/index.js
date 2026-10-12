import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Initialize Gemini Client if key exists
const aiApiKey = process.env.GEMINI_API_KEY || '';
const ai = aiApiKey ? new GoogleGenAI({ apiKey: aiApiKey }) : null;

app.get('/', (req, res) => {
  res.send('🚀 SVVV Lab Backend is active and running!');
});

// Dynamic course data for Tab 2
let courseData = {
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
};

app.get('/api/lectures', (req, res) => res.json(courseData));
app.post('/api/lectures/toggle-complete', (req, res) => {
  const { lectureId } = req.body;
  courseData.modules.forEach(m => m.lectures.forEach(l => { if (l.id === lectureId) l.isCompleted = !l.isCompleted; }));
  res.json({ success: true, courseData });
});

// Fallback Knowledge Base Catalog for Tab 4 AI
function getFallbackCodeAnswer(prompt) {
  const q = prompt.toLowerCase();
  if (q.includes('odd') || q.includes('even')) {
    if (q.includes('c++') || q.includes('cpp')) {
      return `Here is the C++ program to check whether a number is odd or even:

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int num;
    cout << "Enter an integer: ";
    cin >> num;

    if (num % 2 == 0) {
        cout << num << " is even." << endl;
    } else {
        cout << num << " is odd." << endl;
    }
    return 0;
}
\`\`\`
Explanation: The modulus operator \`%\` checks remainder after division by 2. If remainder is 0, the number is even; otherwise, it is odd.`;
    }
    if (q.includes('java')) {
      return `Here is the Java program to check whether a number is odd or even:

\`\`\`java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter an integer: ");
        int num = scanner.nextInt();

        if (num % 2 == 0) {
            System.out.println(num + " is even.");
        } else {
            System.out.println(num + " is odd.");
        }
    }
}
\`\`\``;
    }
    return `Here is the Python program to check whether a number is odd or even:

\`\`\`python
num = int(input("Enter an integer: "))

if num % 2 == 0:
    print(f"{num} is even.")
else:
    print(f"{num} is odd.")
\`\`\``;
  }
  if (q.includes('factorial')) {
    return `\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    long long fact = 1;
    cout << "Enter a positive integer: ";
    cin >> n;
    for (int i = 1; i <= n; ++i) fact *= i;
    cout << "Factorial = " << fact << endl;
    return 0;
}
\`\`\``;
  }
  return `### LabSathi AI Analysis
Analyzing: "${prompt}"

Feel free to ask for Python, C++, or Java implementations, algorithms, or OS lab concepts.`;
}

async function handleAIQuery(prompt) {
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are LabSathi AI, an expert coding assistant for CS students at SVVV Indore. Return clean, well-formatted code in Python, C++, or Java with clear explanations.'
        }
      });
      return response.text;
    } catch {
      return getFallbackCodeAnswer(prompt);
    }
  }
  return getFallbackCodeAnswer(prompt);
}

// Find local compiler or fallback
function getCppCompilerCommand() {
  const possiblePaths = [
    'g++',
    'C:\\Program Files (x86)\\Embarcadero\\Dev-Cpp\\TDM-GCC-64\\bin\\g++.exe',
    'C:\\Program Files (x86)\\Dev-Cpp\\MinGW64\\bin\\g++.exe',
    'C:\\Dev-Cpp\\MinGW64\\bin\\g++.exe',
    'C:\\MinGW\\bin\\g++.exe'
  ];
  for (const p of possiblePaths.slice(1)) {
    if (fs.existsSync(p)) return `"${p}"`;
  }
  return 'g++';
}

// Open remote sandbox compiler for C++ via Wandbox API
async function executeRemoteCpp(code, stdinInput) {
  const res = await axios.post('https://wandbox.org/api/compile.json', {
    compiler: 'gcc-head',
    code: code,
    stdin: stdinInput || ''
  }, { timeout: 10000 });
  const data = res.data;
  return data.program_output || data.compiler_error || data.program_error || 'Execution finished with no output.';
}

const activeProcesses = new Map();

io.on('connection', (socket) => {
  socket.on('join_lab', (room) => socket.join(room));

  socket.on('send_chat_message', (data) => {
    io.to(data.room || 'general').emit('receive_chat_message', {
      ...data,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('ai_query', async ({ text }) => {
    const aiResponse = await handleAIQuery(text);
    socket.emit('receive_chat_message', {
      sender: 'LabSathi AI',
      role: 'ai',
      channel: 'ai-assistant',
      text: aiResponse,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // START INTERACTIVE CODE EXECUTION
  socket.on('start_interactive_run', ({ language, code }) => {
    if (activeProcesses.has(socket.id)) {
      activeProcesses.get(socket.id).kill();
      activeProcesses.delete(socket.id);
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const timestamp = Date.now();

    // 1. PYTHON
    if (language === 'python') {
      const filePath = path.join(tempDir, `script_${timestamp}.py`);
      fs.writeFileSync(filePath, code);

      const child = spawn('python', ['-u', filePath], { shell: true });
      activeProcesses.set(socket.id, child);

      child.stdout.on('data', (d) => socket.emit('terminal_data', d.toString()));
      child.stderr.on('data', (d) => socket.emit('terminal_data', d.toString()));

      child.on('close', () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        activeProcesses.delete(socket.id);
        socket.emit('terminal_data', '\n[Process completed]\n');
      });
    }

    // 2. C++ (Local compiler auto-detection with automatic online sandbox fallback)
    else if (language === 'cpp') {
      const srcPath = path.join(tempDir, `code_${timestamp}.cpp`);
      const binPath = path.join(tempDir, `code_${timestamp}.exe`);
      fs.writeFileSync(srcPath, code);

      const compilerCmd = getCppCompilerCommand();
      socket.emit('terminal_data', 'Compiling C++...\n');

      const comp = spawn(`${compilerCmd} "${srcPath}" -o "${binPath}"`, [], { shell: true });
      let compErr = '';

      comp.stderr.on('data', (d) => compErr += d.toString());

      comp.on('close', async (status) => {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);

        // If local g++ is missing or failed to compile
        if (status !== 0) {
          if (compErr.includes('not recognized') || compilerCmd === 'g++') {
            socket.emit('terminal_data', 'Local g++ compiler not found in PATH. Routing to online compiler engine...\n');
            try {
              const remoteOutput = await executeRemoteCpp(code, '');
              socket.emit('terminal_data', remoteOutput);
              socket.emit('terminal_data', '\n[Process completed]\n');
            } catch (err) {
              socket.emit('terminal_data', `Compilation Error:\n${compErr || err.message}\n[Compilation failed]\n`);
            }
            return;
          }

          socket.emit('terminal_data', compErr || '\n[Compilation failed]\n');
          return;
        }

        // Local execution
        const child = spawn(`"${binPath}"`, [], { shell: true });
        activeProcesses.set(socket.id, child);

        child.stdout.on('data', (d) => socket.emit('terminal_data', d.toString()));
        child.stderr.on('data', (d) => socket.emit('terminal_data', d.toString()));

        child.on('close', () => {
          if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
          activeProcesses.delete(socket.id);
          socket.emit('terminal_data', '\n[Process completed]\n');
        });
      });
    }

    // 3. JAVA
    else if (language === 'java') {
      const jobDir = path.join(tempDir, `job_${timestamp}`);
      fs.mkdirSync(jobDir);
      const javaFile = path.join(jobDir, 'Main.java');
      fs.writeFileSync(javaFile, code);

      socket.emit('terminal_data', 'Compiling Java...\n');
      const comp = spawn(`javac "${javaFile}"`, [], { shell: true });
      let compErr = '';

      comp.stderr.on('data', (d) => compErr += d.toString());
      comp.on('close', (status) => {
        if (status !== 0) {
          if (fs.existsSync(jobDir)) fs.rmSync(jobDir, { recursive: true, force: true });
          socket.emit('terminal_data', compErr || '\n[Java Compilation failed]\n');
          return;
        }

        const child = spawn(`java -cp "${jobDir}" Main`, [], { shell: true });
        activeProcesses.set(socket.id, child);

        child.stdout.on('data', (d) => socket.emit('terminal_data', d.toString()));
        child.stderr.on('data', (d) => socket.emit('terminal_data', d.toString()));

        child.on('close', () => {
          if (fs.existsSync(jobDir)) fs.rmSync(jobDir, { recursive: true, force: true });
          activeProcesses.delete(socket.id);
          socket.emit('terminal_data', '\n[Process completed]\n');
        });
      });
    }
  });

  socket.on('terminal_input', (inputVal) => {
    const child = activeProcesses.get(socket.id);
    if (child && child.stdin) {
      child.stdin.write(inputVal + '\n');
    }
  });

  socket.on('disconnect', () => {
    if (activeProcesses.has(socket.id)) {
      activeProcesses.get(socket.id).kill();
      activeProcesses.delete(socket.id);
    }
  });
});

server.listen(5000, () => console.log('🚀 Interactive Backend running on http://localhost:5000'));