import React, { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle, Plus, Flame, Brain, Trash2, Link as LinkIcon, Clock, X, MessageSquare } from 'lucide-react';

// Hard-hitting quotes database
const QUOTES = [
  "You have power over your mind, not outside events; realize this, and you will find strength. — Marcus Aurelius",
  "If it is not right, do not do it; if it is not true, do not say it. — Marcus Aurelius",
  "The impediment to action advances action; what stands in the way becomes the way. — Marcus Aurelius",
  "It is not the man who has too little, but the man who craves more, that is poor. — Seneca",
  "We suffer more often in imagination than in reality. — Seneca",
  "Luck is what happens when preparation meets opportunity. — Seneca",
  "No man is free who is not master of himself. — Epictetus",
  "It’s not what happens to you, but how you react to it that matters. — Epictetus",
  "First say to yourself what you would be; and then do what you have to do. — Epictetus",
  "Make the best use of what is in your power, and take the rest as it happens. — Epictetus"
];

const CONFETTI_COLORS = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];

interface ConfettiPiece {
  id: string;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

interface Resource {
  id: string;
  url: string;
  title: string; // e.g., "YouTube Video", "PDF Notes"
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: Date;
  originalDate: Date;
  resources: Resource[]; // Changed from single link to array
  reminderTime?: string;
}

export default function App() {
  // State Management
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('sr_tasks');
    if (saved) {
      return JSON.parse(saved).map((t: any) => ({
        ...t,
        date: new Date(t.date),
        originalDate: new Date(t.originalDate),
        // Backward compatibility: Convert old docLink to new resources array
        resources: t.resources || (t.docLink ? [{ id: 'old', url: t.docLink, title: 'Resource' }] : [])
      }));
    }
    return [];
  });

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('sr_streak');
    return saved ? parseInt(saved) : 0;
  });

  const [lastVisit, setLastVisit] = useState(() => {
    return localStorage.getItem('sr_last_visit') || new Date().toDateString();
  });

  // Form States
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Multiple Links State
  const [tempLinks, setTempLinks] = useState<Resource[]>([]);
  const [currentLinkInput, setCurrentLinkInput] = useState('');
  const [currentLinkTitle, setCurrentLinkTitle] = useState('');
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Daily Reality Check Quote
  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

  useEffect(() => {
    localStorage.setItem('sr_tasks', JSON.stringify(tasks));
    localStorage.setItem('sr_streak', streak.toString());
    localStorage.setItem('sr_last_visit', lastVisit);
  }, [tasks, streak, lastVisit]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastVisit) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastVisit === yesterday.toDateString()) {
        // Streak continues
      } else {
        setStreak(0);
      }
      setLastVisit(today);
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  const triggerConfetti = () => {
    const pieces = Array.from({ length: 30 }).map(() => ({
      id: crypto.randomUUID(),
      left: Math.random() * 100,
      delay: Math.random() * 200,
      duration: 1400 + Math.random() * 800,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6
    }));

    setConfettiPieces(pieces);
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    confettiTimeoutRef.current = setTimeout(() => {
      setConfettiPieces([]);
    }, 1800);
  };

  // Add a link to the temporary list
  const handleAddLink = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentLinkInput.trim()) return;
    
    setTempLinks([
      ...tempLinks, 
      { 
        id: crypto.randomUUID(), 
        url: currentLinkInput, 
        title: currentLinkTitle || 'Resource' 
      }
    ]);
    setCurrentLinkInput('');
    setCurrentLinkTitle('');
  };

  const removeTempLink = (id: string) => {
    setTempLinks(tempLinks.filter(l => l.id !== id));
  };

  const addRevisions = (taskText: string, resources: Resource[], time: string) => {
    const intervals = [0, 1, 2, 5, 10, 30];
    const newTasks: Task[] = intervals.map(days => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return {
        id: crypto.randomUUID(),
        text: taskText,
        completed: false,
        date: date,
        originalDate: new Date(),
        resources: resources, 
        reminderTime: time
      };
    });
    setTasks([...tasks, ...newTasks]);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    addRevisions(newTask, tempLinks, newTime);
    
    setNewTask('');
    setTempLinks([]);
    setNewTime('');
  };

  const toggleTask = (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    const willComplete = targetTask && !targetTask.completed;

    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);

    if (willComplete) {
      triggerConfetti();
    }

    const todayStr = new Date().toDateString();
    const todaysTasks = updatedTasks.filter(t => t.date.toDateString() === todayStr);
    
    if (todaysTasks.length > 0 && todaysTasks.every(t => t.completed)) {
      setStreak(s => s + 1);
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const tasksForSelectedDate = tasks.filter(t => 
    t.date.toDateString() === selectedDate.toDateString()
  );

  const completedCount = tasksForSelectedDate.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translate3d(0, -20%, 0); opacity: 1; }
          100% { transform: translate3d(0, 120vh, 0); opacity: 0; }
        }
      `}</style>
      {confettiPieces.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confettiPieces.map(piece => (
            <span
              key={piece.id}
              style={{
                position: 'absolute',
                width: `${piece.size}px`,
                height: `${piece.size * 3}px`,
                borderRadius: '4px',
                backgroundColor: piece.color,
                left: `${piece.left}%`,
                top: '-10%',
                animation: `confettiFall ${piece.duration}ms ease-out forwards`,
                animationDelay: `${piece.delay}ms`
              }}
            />
          ))}
        </div>
      )}
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">RetentionMaster</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://forms.gle/KZaHhBhJNCirAWWn9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 transition"
            >
              <MessageSquare className="w-4 h-4 text-gray-500" />
              Feedback
            </a>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
              <span className="font-bold text-gray-700">{streak} Day Streak</span>
            </div>
          </div>
        </header>

        {/* Reality Check Quote */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-8">
          <p className="text-xl md:text-2xl font-serif italic opacity-90 mb-4">"{todayQuote}"</p>
          <p className="text-xs font-bold tracking-wider opacity-75">DAILY REALITY CHECK</p>
        </div>

        {/* Add Task Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Add New Learning Topic</h2>
          <form className="flex flex-col gap-3">
            
            {/* Topic Input */}
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="E.g., Photosynthesis mechanism..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-32">
                 <Clock className="w-4 h-4 text-gray-400" />
                 <input 
                   type="time" 
                   value={newTime}
                   onChange={(e) => setNewTime(e.target.value)}
                   className="bg-transparent outline-none w-full text-sm"
                 />
               </div>
            </div>
            
            {/* Multiple Link Adder */}
            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
               <input 
                 type="text" 
                 value={currentLinkTitle}
                 onChange={(e) => setCurrentLinkTitle(e.target.value)}
                 placeholder="Label (e.g. PDF)"
                 className="w-1/3 bg-transparent outline-none text-sm px-2 border-r border-gray-300"
               />
               <input 
                 type="url" 
                 value={currentLinkInput}
                 onChange={(e) => setCurrentLinkInput(e.target.value)}
                 placeholder="Paste Link here..."
                 className="flex-1 bg-transparent outline-none text-sm px-2"
               />
               <button onClick={handleAddLink} className="bg-gray-200 hover:bg-gray-300 p-1 rounded text-gray-600">
                 <Plus className="w-4 h-4" />
               </button>
            </div>

            {/* Temporary Link List Display */}
            {tempLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tempLinks.map(link => (
                  <span key={link.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                    {link.title}
                    <button onClick={(e) => { e.preventDefault(); removeTempLink(link.id); }}>
                      <X className="w-3 h-3 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button 
              onClick={handleAddTask}
              className="bg-[#0F9D58] hover:bg-[#0B7F46] text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 mt-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Schedule Now 🚀
            </button>
          </form>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Calendar View (Simplified for space) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                 <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }} className="p-1 hover:bg-gray-100 rounded">←</button>
                 <button onClick={() => setSelectedDate(new Date())} className="text-xs bg-gray-100 px-2 rounded">Today</button>
                 <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }} className="p-1 hover:bg-gray-100 rounded">→</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
               {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-gray-400 text-xs">{d}</div>)}
               {Array.from({length: 35}).map((_, i) => {
                 const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                 const startDay = d.getDay();
                 const dayNum = i - startDay + 1;
                 const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNum);
                 if (dayNum > 0 && dayNum <= 31) { 
                   const isSelected = currentDate.toDateString() === selectedDate.toDateString();
                   const hasTasks = tasks.some(t => t.date.toDateString() === currentDate.toDateString());
                   return (
                     <div key={i} onClick={() => setSelectedDate(currentDate)} className={`aspect-square flex items-center justify-center rounded-full cursor-pointer text-xs ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-600'} ${hasTasks && !isSelected ? 'bg-indigo-50 text-indigo-600 font-medium' : ''}`}>{dayNum}</div>
                   );
                 }
                 return <div key={i}></div>;
               })}
            </div>
          </div>

          {/* Task List */}
          <div>
             <div className="flex justify-between items-end mb-4">
               <div>
                 <h2 className="font-bold text-xl text-gray-800">
                   {selectedDate.toDateString() === new Date().toDateString() ? "Today's Plan" : selectedDate.toLocaleDateString()}
                 </h2>
                 <p className="text-sm text-gray-500">{tasksForSelectedDate.length} Topics</p>
               </div>
             </div>

             <div className="space-y-3">
               {tasksForSelectedDate.length === 0 && <p className="text-center text-gray-400 py-4">No revisions due.</p>}
               
               {tasksForSelectedDate.map(t => (
                 <div key={t.id} className={`group p-4 rounded-xl border transition-all ${t.completed ? 'bg-gray-50' : 'bg-white border-gray-200 shadow-sm'}`}>
                   <div className="flex items-start gap-3">
                     <button onClick={() => toggleTask(t.id)} className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                       <CheckCircle className="w-4 h-4" />
                     </button>
                     
                     <div className="flex-1">
                       <p className={`font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.text}</p>
                       
                       {/* Multiple Links Display */}
                       <div className="flex flex-wrap gap-2 mt-2">
                         {t.resources && t.resources.map((res, idx) => (
                           <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 border border-blue-100">
                             <LinkIcon className="w-3 h-3" /> {res.title}
                           </a>
                         ))}
                         {t.reminderTime && (
                           <span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">
                             <Clock className="w-3 h-3" /> {t.reminderTime}
                           </span>
                         )}
                       </div>
                     </div>

                     <button onClick={() => deleteTask(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}