import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Check,
  Clock,
  Calendar,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Task } from '../types';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: Partial<Task>) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle,
      subtitle: newSub || 'Poultry business follow-up task',
      priority: newPriority,
      time: '5:00 pm',
      dueDate: new Date().toISOString().slice(0, 10),
      completed: false,
      category: 'Call'
    });
    setNewTitle('');
    setNewSub('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Tasks & Operational Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily calls, DPR dispatch, site visits, and bank coordination schedule
          </p>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleCreate} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-2.5">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title (e.g., Call bank manager for Ajay Sharma loan)..."
          className="flex-1 w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        />
        <input
          type="text"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          placeholder="Short notes..."
          className="w-full sm:w-48 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as 'High' | 'Medium' | 'Low')}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-1.5 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0"
        >
          Add Task
        </button>
      </form>

      {/* Task Filters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
            filter === 'all' ? 'bg-[#0b2818] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
            filter === 'pending' ? 'bg-[#0b2818] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending ({tasks.filter(t => !t.completed).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
            filter === 'completed' ? 'bg-[#0b2818] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed ({tasks.filter(t => t.completed).length})
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100">
        {filtered.map((task) => {
          let priorityClass = 'bg-amber-100 text-amber-800';
          if (task.priority === 'High') priorityClass = 'bg-rose-100 text-rose-800';
          if (task.priority === 'Low') priorityClass = 'bg-emerald-100 text-emerald-800';

          return (
            <div key={task.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => onToggleTask(task.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    task.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-emerald-500 bg-white'
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{task.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}`}>
                  {task.priority}
                </span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {task.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
