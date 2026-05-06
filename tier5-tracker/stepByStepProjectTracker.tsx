// Tier 5 Step-by-Step Project Tracker with Horizontal Layout
import React, { useState } from 'react';
import { Calendar, CheckCircle, Clock, Users, Target, TrendingUp, ArrowRight } from 'lucide-react';

interface Phase {
  id: number;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  tasks: Task[];
  calendlyUrl: string;
  description: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  calendlyUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

const Tier5ProjectTracker = () => {
  const [currentPhase, setCurrentPhase] = useState(2);
  
  const phases: Phase[] = [
    {
      id: 1,
      title: "Onboarding & Discovery",
      description: "Foundation setup and goal alignment",
      status: currentPhase > 1 ? 'completed' : currentPhase === 1 ? 'current' : 'upcoming',
      tasks: [
        { id: '1-1', title: 'Initial consultation call', completed: true, calendlyUrl: 'https://calendly.com/consultation', priority: 'high' },
        { id: '1-2', title: 'Goal setting & KPI definition', completed: true, calendlyUrl: 'https://calendly.com/goal-setting', priority: 'high' },
        { id: '1-3', title: 'Market analysis & competitor research', completed: true, priority: 'medium' },
        { id: '1-4', title: 'Strategy roadmap creation', completed: false, calendlyUrl: 'https://calendly.com/strategy-planning', priority: 'high' }
      ],
      calendlyUrl: 'https://calendly.com/onboarding'
    },
    {
      id: 2,
      title: "Foundation Building",
      description: "Core business infrastructure development",
      status: currentPhase > 2 ? 'completed' : currentPhase === 2 ? 'current' : 'upcoming',
      tasks: [
        { id: '2-1', title: 'Business model validation', completed: true, priority: 'high' },
        { id: '2-2', title: 'MVP development & testing', completed: false, calendlyUrl: 'https://calendly.com/mvp-review', priority: 'high' },
        { id: '2-3', title: 'Brand identity & messaging', completed: false, priority: 'medium' },
        { id: '2-4', title: 'Legal structure & compliance', completed: false, calendlyUrl: 'https://calendly.com/legal-review', priority: 'medium' }
      ],
      calendlyUrl: 'https://calendly.com/foundation'
    },
    {
      id: 3,
      title: "Market Launch",
      description: "Product launch and initial customer acquisition",
      status: currentPhase > 3 ? 'completed' : currentPhase === 3 ? 'current' : 'upcoming',
      tasks: [
        { id: '3-1', title: 'Product launch strategy', completed: false, calendlyUrl: 'https://calendly.com/launch-prep', priority: 'high' },
        { id: '3-2', title: 'Marketing campaign execution', completed: false, priority: 'high' },
        { id: '3-3', title: 'Customer acquisition funnel', completed: false, calendlyUrl: 'https://calendly.com/funnel-optimization', priority: 'high' },
        { id: '3-4', title: 'Performance tracking setup', completed: false, priority: 'medium' }
      ],
      calendlyUrl: 'https://calendly.com/launch'
    },
    {
      id: 4,
      title: "Growth & Optimization",
      description: "Scale operations and optimize performance",
      status: currentPhase > 4 ? 'completed' : currentPhase === 4 ? 'current' : 'upcoming',
      tasks: [
        { id: '4-1', title: 'Scale operations & systems', completed: false, priority: 'high' },
        { id: '4-2', title: 'Conversion rate optimization', completed: false, calendlyUrl: 'https://calendly.com/optimization', priority: 'high' },
        { id: '4-3', title: 'Market expansion strategy', completed: false, calendlyUrl: 'https://calendly.com/expansion-planning', priority: 'medium' },
        { id: '4-4', title: 'Team building & delegation', completed: false, priority: 'medium' }
      ],
      calendlyUrl: 'https://calendly.com/growth'
    },
    {
      id: 5,
      title: "Success & Sustainability",
      description: "Achieve $10K revenue and sustainable growth",
      status: currentPhase > 5 ? 'completed' : currentPhase === 5 ? 'current' : 'upcoming',
      tasks: [
        { id: '5-1', title: 'Achieve $10K monthly revenue', completed: false, priority: 'high' },
        { id: '5-2', title: 'Sustainable growth systems', completed: false, calendlyUrl: 'https://calendly.com/success-review', priority: 'high' },
        { id: '5-3', title: 'Future scaling roadmap', completed: false, calendlyUrl: 'https://calendly.com/future-planning', priority: 'medium' },
        { id: '5-4', title: 'Exit strategy planning', completed: false, priority: 'low' }
      ],
      calendlyUrl: 'https://calendly.com/success'
    }
  ];

  const currentPhaseData = phases.find(p => p.id === currentPhase);
  const completedTasks = phases.reduce((acc, phase) => acc + phase.tasks.filter(t => t.completed).length, 0);
  const totalTasks = phases.reduce((acc, phase) => acc + phase.tasks.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Tier 5 Client Journey</h1>
        <p className="text-xl text-gray-600">From Onboarding to $10K Revenue Success</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Progress: </span>
            <span className="font-semibold text-blue-600">{completedTasks}/{totalTasks} tasks</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Current Phase: </span>
            <span className="font-semibold text-green-600">{currentPhaseData?.title}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Progress Flow */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Journey Progress</h2>
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 ${
                    phase.status === 'completed' 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : phase.status === 'current'
                      ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                  onClick={() => setCurrentPhase(phase.id)}
                >
                  {phase.status === 'completed' ? (
                    <CheckCircle className="w-8 h-8" />
                  ) : (
                    <span className="font-bold text-lg">{phase.id}</span>
                  )}
                </div>
                <div className="mt-3 text-center max-w-32">
                  <div className={`font-semibold text-sm ${
                    phase.status === 'current' ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {phase.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {phase.status}
                  </div>
                </div>
              </div>
              {index < phases.length - 1 && (
                <div className="flex items-center mx-4">
                  <div className={`w-20 h-2 rounded-full transition-all duration-500 ${
                    phase.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                  <ArrowRight className={`w-6 h-6 ml-2 ${
                    phase.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Phase Detail */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Phase {currentPhaseData?.id}: {currentPhaseData?.title}
                </h2>
                <p className="text-gray-600 mt-2">{currentPhaseData?.description}</p>
              </div>
              <button 
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md"
                onClick={() => window.open(currentPhaseData?.calendlyUrl, '_blank')}
              >
                <Calendar className="w-5 h-5" />
                Schedule Meeting
              </button>
            </div>

            {/* Tasks */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Phase Tasks</h3>
              {currentPhaseData?.tasks.map((task) => (
                <div key={task.id} className={`p-5 border-2 rounded-xl transition-all hover:shadow-md ${
                  task.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        task.completed ? 'bg-green-500' : 'bg-gray-200 hover:bg-gray-300'
                      }`}>
                        {task.completed && <CheckCircle className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <span className={`text-lg ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority} priority
                          </span>
                        </div>
                      </div>
                    </div>
                    {task.calendlyUrl && (
                      <button 
                        className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                        onClick={() => window.open(task.calendlyUrl, '_blank')}
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Progress Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed Phases</span>
                <span className="font-bold text-2xl text-green-600">
                  {phases.filter(p => p.status === 'completed').length}/5
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(currentPhase / 5) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((completedTasks / totalTasks) * 100)}% of all tasks completed
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                className="w-full bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-3 shadow-md"
                onClick={() => window.open('https://calendly.com/emergency-support', '_blank')}
              >
                <Users className="w-5 h-5" />
                Emergency Support
              </button>
              <button 
                className="w-full bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-3 shadow-md"
                onClick={() => window.open('https://calendly.com/strategy-session', '_blank')}
              >
                <Target className="w-5 h-5" />
                Strategy Session
              </button>
              <button 
                className="w-full bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-3 shadow-md"
                onClick={() => window.open('https://calendly.com/progress-review', '_blank')}
              >
                <TrendingUp className="w-5 h-5" />
                Progress Review
              </button>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
            <div className="space-y-3">
              {currentPhaseData?.tasks
                .filter(task => !task.completed)
                .slice(0, 3)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{task.title}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tier5ProjectTracker;