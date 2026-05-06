// Step-by-Step Project Tracker with Horizontal Layout
import React, { useState } from 'react';
import { Calendar, CheckCircle, Clock, Users, Target, TrendingUp } from 'lucide-react';

interface Phase {
  id: number;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  tasks: Task[];
  calendlyUrl: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  calendlyUrl?: string;
}

const StepByStepProjectTracker = () => {
  const [currentPhase, setCurrentPhase] = useState(2);
  
  const phases: Phase[] = [
    {
      id: 1,
      title: "Onboarding",
      status: currentPhase > 1 ? 'completed' : currentPhase === 1 ? 'current' : 'upcoming',
      tasks: [
        { id: '1-1', title: 'Initial consultation', completed: true, calendlyUrl: 'https://calendly.com/consultation' },
        { id: '1-2', title: 'Goal setting session', completed: true, calendlyUrl: 'https://calendly.com/goal-setting' },
        { id: '1-3', title: 'Strategy planning', completed: true }
      ],
      calendlyUrl: 'https://calendly.com/onboarding'
    },
    {
      id: 2,
      title: "Foundation",
      status: currentPhase > 2 ? 'completed' : currentPhase === 2 ? 'current' : 'upcoming',
      tasks: [
        { id: '2-1', title: 'Market research', completed: true },
        { id: '2-2', title: 'Business model validation', completed: false, calendlyUrl: 'https://calendly.com/validation' },
        { id: '2-3', title: 'MVP development', completed: false }
      ],
      calendlyUrl: 'https://calendly.com/foundation'
    },
    {
      id: 3,
      title: "Launch",
      status: currentPhase > 3 ? 'completed' : currentPhase === 3 ? 'current' : 'upcoming',
      tasks: [
        { id: '3-1', title: 'Product launch', completed: false, calendlyUrl: 'https://calendly.com/launch-prep' },
        { id: '3-2', title: 'Marketing campaign', completed: false },
        { id: '3-3', title: 'Customer acquisition', completed: false }
      ],
      calendlyUrl: 'https://calendly.com/launch'
    },
    {
      id: 4,
      title: "Growth",
      status: currentPhase > 4 ? 'completed' : currentPhase === 4 ? 'current' : 'upcoming',
      tasks: [
        { id: '4-1', title: 'Scale operations', completed: false },
        { id: '4-2', title: 'Optimize conversions', completed: false, calendlyUrl: 'https://calendly.com/optimization' },
        { id: '4-3', title: 'Expand market reach', completed: false }
      ],
      calendlyUrl: 'https://calendly.com/growth'
    },
    {
      id: 5,
      title: "Success",
      status: currentPhase > 5 ? 'completed' : currentPhase === 5 ? 'current' : 'upcoming',
      tasks: [
        { id: '5-1', title: 'Achieve $10K revenue', completed: false },
        { id: '5-2', title: 'Sustainable growth', completed: false, calendlyUrl: 'https://calendly.com/success-review' },
        { id: '5-3', title: 'Future planning', completed: false }
      ],
      calendlyUrl: 'https://calendly.com/success'
    }
  ];

  const currentPhaseData = phases.find(p => p.id === currentPhase);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Journey Tracker</h1>
        <p className="text-gray-600">Track progress from onboarding to $10K revenue</p>
      </div>

      {/* Horizontal Progress Flow */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  phase.status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : phase.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                onClick={() => setCurrentPhase(phase.id)}
              >
                {phase.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <span className="font-semibold">{phase.id}</span>
                )}
              </div>
              <div className="ml-3 text-left">
                <div className={`font-medium ${phase.status === 'current' ? 'text-blue-600' : 'text-gray-700'}`}>
                  {phase.title}
                </div>
                <div className="text-sm text-gray-500 capitalize">{phase.status}</div>
              </div>
              {index < phases.length - 1 && (
                <div className={`w-16 h-1 mx-4 ${
                  phase.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Phase Detail */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Phase {currentPhaseData?.id}: {currentPhaseData?.title}
              </h2>
              <button 
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                onClick={() => window.open(currentPhaseData?.calendlyUrl, '_blank')}
              >
                <Calendar className="w-4 h-4" />
                Schedule Meeting
              </button>
            </div>

            {/* Tasks */}
            <div className="space-y-4">
              {currentPhaseData?.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      task.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className={task.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                      {task.title}
                    </span>
                  </div>
                  {task.calendlyUrl && (
                    <button 
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={() => window.open(task.calendlyUrl, '_blank')}
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Progress Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed Phases</span>
                <span className="font-semibold">{phases.filter(p => p.status === 'completed').length}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Phase</span>
                <span className="font-semibold">{currentPhaseData?.title}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(currentPhase / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 flex items-center gap-2"
                onClick={() => window.open('https://calendly.com/emergency-support', '_blank')}
              >
                <Users className="w-4 h-4" />
                Emergency Support
              </button>
              <button 
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                onClick={() => window.open('https://calendly.com/strategy-session', '_blank')}
              >
                <Target className="w-4 h-4" />
                Strategy Session
              </button>
              <button 
                className="w-full bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 flex items-center gap-2"
                onClick={() => window.open('https://calendly.com/progress-review', '_blank')}
              >
                <TrendingUp className="w-4 h-4" />
                Progress Review
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-2">
              {currentPhaseData?.tasks
                .filter(task => !task.completed)
                .slice(0, 3)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{task.title}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepByStepProjectTracker;