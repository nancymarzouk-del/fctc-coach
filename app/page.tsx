'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Flame, BookOpen, Brain, Calculator, Eye, Award, TrendingUp, Clock, Flag, RotateCcw } from 'lucide-react'

const FCTC_COACH = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedMode, setSelectedMode] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState([])
  const [flagged, setFlagged] = useState(new Set())
  const [showResults, setShowResults] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [progress, setProgress] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerActive, setTimerActive] = useState(false)

  const categories = {
    mechanicalReasoning: {
      name: 'Mechanical Reasoning',
      icon: '⚙️',
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
      questions: [
        { q: 'Which pulley system requires the least effort to lift a weight?', opts: ['Single fixed pulley', 'Double movable pulley', 'Single movable pulley', 'No pulley system'], correct: 1 },
        { q: 'In a gear system, if the driving gear has 20 teeth and the driven gear has 40 teeth, what is the gear ratio?', opts: ['1:1', '1:2', '2:1', '1:4'], correct: 1 },
        { q: 'A ladder leaning against a wall is most stable when the base is what distance from the wall?', opts: ['1/4 of ladder length', '1/3 of ladder length', '1/2 of ladder length', '2/3 of ladder length'], correct: 1 },
        { q: 'Which type of inclined plane requires the least force to move an object up?', opts: ['Steep angle', 'Shallow angle', 'Vertical angle', 'All angles are equal'], correct: 1 },
        { q: 'In a hydraulic system, if the input piston has an area of 10 cm² and the output piston has 100 cm², what is the mechanical advantage?', opts: ['1', '5', '10', '100'], correct: 2 },
        { q: 'A wheel and axle has a wheel radius of 20 cm and axle radius of 5 cm. What is the mechanical advantage?', opts: ['2', '4', '15', '100'], correct: 1 },
        { q: 'Which type of lever has the load between the fulcrum and effort?', opts: ['First class', 'Second class', 'Third class', 'Fourth class'], correct: 1 },
        { q: 'A screw is essentially a(n):', opts: ['Inclined plane wrapped around a cylinder', 'Simple wedge', 'Rotating lever', 'Hydraulic system'], correct: 0 },
        { q: 'In a block and tackle system with 4 supporting ropes, the mechanical advantage is:', opts: ['2', '3', '4', '8'], correct: 2 },
        { q: 'Which pulley arrangement provides the greatest mechanical advantage?', opts: ['Single fixed pulley', 'Block and tackle with 6 ropes', 'Simple movable pulley', 'Rope and knot only'], correct: 1 }
      ]
    },
    mathematics: {
      name: 'Mathematics',
      icon: '🔢',
      color: 'bg-green-100',
      textColor: 'text-green-700',
      questions: [
        { q: 'If a fire truck travels 60 miles in 1 hour, how far will it travel in 2.5 hours?', opts: ['120 miles', '150 miles', '180 miles', '200 miles'], correct: 1 },
        { q: 'A water tank holds 5,000 gallons. If it drains at 250 gallons per minute, how many minutes to empty?', opts: ['10 minutes', '15 minutes', '20 minutes', '25 minutes'], correct: 2 },
        { q: 'Convert 98.6°F to Celsius (use formula C = (F-32) × 5/9):', opts: ['35°C', '36°C', '37°C', '38°C'], correct: 2 },
        { q: 'If a ladder is 25 feet long and needs to reach 20 feet high on a wall, how far from the wall should the base be?', opts: ['10 feet', '12 feet', '15 feet', '20 feet'], correct: 2 },
        { q: 'A crew of 5 firefighters can clear a building in 30 minutes. How long would it take 3 firefighters?', opts: ['18 minutes', '30 minutes', '40 minutes', '50 minutes'], correct: 2 },
        { q: 'What is 45% of 200?', opts: ['80', '85', '90', '95'], correct: 2 },
        { q: 'If hose costs $2.50 per foot, how much for 150 feet?', opts: ['$300', '$350', '$375', '$400'], correct: 2 },
        { q: 'A tank is 3/4 full with 300 gallons. What is its total capacity?', opts: ['400 gallons', '225 gallons', '375 gallons', '450 gallons'], correct: 0 },
        { q: 'If response time increases from 4 minutes to 6 minutes, what is the percentage increase?', opts: ['25%', '33%', '50%', '60%'], correct: 1 },
        { q: 'A rectangular room is 20 feet by 15 feet. What is its area?', opts: ['35 sq ft', '70 sq ft', '150 sq ft', '300 sq ft'], correct: 2 }
      ]
    },
    readingComprehension: {
      name: 'Reading Comprehension',
      icon: '📖',
      color: 'bg-purple-100',
      textColor: 'text-purple-700',
      questions: [
        { q: 'In firefighting, what does "ventilation" primarily refer to? Passage: Proper ventilation helps remove heat, smoke, and toxic gases from a structure during firefighting operations.', opts: ['Cooling equipment', 'Removing heat and smoke', 'Water supply systems', 'Communication devices'], correct: 1 },
        { q: 'According to fire safety standards, what is the primary purpose of a fire extinguisher classification system?', opts: ['To organize equipment', 'To indicate which fires it can safely extinguish', 'To show the purchase date', 'To mark the pressure level'], correct: 1 },
        { q: 'What does "backdraft" mean in firefighting terms?', opts: ['A sudden gust of wind', 'A rapid explosion from a confined fire reaching oxygen', 'Water spraying backwards', 'Smoke moving upward'], correct: 1 },
        { q: 'The passage states that firefighters must maintain physical fitness. What is the main reason given?', opts: ['To look professional', 'To meet the minimum requirements of the job', 'To handle the physical demands of rescue operations', 'To participate in competitions'], correct: 2 },
        { q: 'Based on the passage, which is NOT a responsibility of a firefighter?', opts: ['Fire prevention education', 'Emergency response', 'Building inspections', 'Real estate sales'], correct: 3 },
        { q: 'What can be inferred from the passage about fire department protocols?', opts: ['They are optional', 'They are designed for safety and efficiency', 'They change daily', 'They are not important'], correct: 1 },
        { q: 'The passage indicates that smoke inhalation is dangerous because:', opts: ['It reduces visibility', 'It contains toxic gases that can cause injury or death', 'It makes noise', 'It increases temperature'], correct: 1 },
        { q: 'What is the main idea of the firefighter training section?', opts: ['Training is difficult', 'Proper training is essential for effective emergency response', 'All firefighters have the same training', 'Training happens only once'], correct: 1 },
        { q: 'According to the passage, what should a firefighter do first upon arriving at a scene?', opts: ['Enter the building immediately', 'Assess the situation and establish safety parameters', 'Call for backup only', 'Set up equipment'], correct: 1 },
        { q: 'The passage mentions that communication is critical. This means:', opts: ['Talking is important', 'Clear communication ensures coordinated, safe operations', 'Only supervisors need to communicate', 'Communication happens after operations'], correct: 1 }
      ]
    },
    memoryRecall: {
      name: 'Memory & Recall',
      icon: '🧠',
      color: 'bg-red-100',
      textColor: 'text-red-700',
      questions: [
        { q: 'In the scenario you watched, what color was the fire truck?', opts: ['Red', 'White', 'Yellow', 'Blue'], correct: 0 },
        { q: 'How many firefighters were in the initial scene?', opts: ['2', '3', '4', '5'], correct: 2 },
        { q: 'What equipment was used first in the scenario?', opts: ['Ladder', 'Hose', 'Extinguisher', 'Rope'], correct: 1 },
        { q: 'What time was shown on the clock in the scenario?', opts: ['2:30 PM', '3:00 PM', '3:15 PM', '3:45 PM'], correct: 2 },
        { q: 'In the video, what was the main challenge faced?', opts: ['Access to water', 'Trapped individuals', 'Weather conditions', 'Equipment failure'], correct: 1 },
        { q: 'How many windows were visible on the building?', opts: ['2', '4', '6', '8'], correct: 2 },
        { q: 'What color were the firefighters\' helmets?', opts: ['Red', 'Yellow', 'White', 'Black'], correct: 1 },
        { q: 'In sequence, what was the second action taken?', opts: ['Setting up equipment', 'Assessing the scene', 'Establishing perimeter', 'Entering building'], correct: 0 },
        { q: 'How many doors were shown in the scenario?', opts: ['1', '2', '3', '4'], correct: 1 },
        { q: 'What distinctive feature was on the building\'s roof?', opts: ['Antenna', 'Chimney', 'Solar panels', 'Water tank'], correct: 1 }
      ]
    }
  }

  const modes = {
    quickDrill: { name: 'Quick Drill', questions: 10, time: 15 },
    studySession: { name: 'Study Session', questions: 25, time: 45 },
    fullExam: { name: 'Full Exam', questions: 100, time: 180 }
  }

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft === null) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false)
          setShowResults(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive, timeLeft])

  const startPractice = (mode, category) => {
    const modeConfig = modes[mode]
    const categoryData = categories[category]
    setSelectedMode(mode)
    setSelectedCategory(category)
    setCurrentQuestion(0)
    setScore(0)
    setAnswered([])
    setFlagged(new Set())
    setShowResults(false)
    setTimeLeft(modeConfig.time * 60)
    setTimerActive(true)
    setCurrentPage('practice')
  }

  const handleAnswer = (optionIndex) => {
    const categoryData = categories[selectedCategory]
    const questions = categoryData.questions.slice(0, modes[selectedMode].questions)
    const isCorrect = questions[currentQuestion].correct === optionIndex
    
    setAnswered([...answered, { question: currentQuestion, answer: optionIndex, correct: isCorrect }])
    if (isCorrect) setScore(score + 1)
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setTimerActive(false)
      setShowResults(true)
    }
  }

  const toggleFlag = (questionIndex) => {
    const newFlagged = new Set(flagged)
    if (newFlagged.has(questionIndex)) {
      newFlagged.delete(questionIndex)
    } else {
      newFlagged.add(questionIndex)
    }
    setFlagged(newFlagged)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (currentPage === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Flame className="w-8 h-8" />
            <h1 className="text-3xl font-bold">FCTC Pass Coach</h1>
          </div>
          <p className="text-red-100 mt-2">California Firefighter Candidate Test Preparation</p>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <Award className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-gray-600 text-sm">Overall Score</p>
              <p className="text-3xl font-bold text-gray-800">78%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-gray-600 text-sm">This Week</p>
              <p className="text-3xl font-bold text-green-600">+12%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <Flame className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-gray-600 text-sm">Streak</p>
              <p className="text-3xl font-bold text-orange-600">7 days</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <Clock className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-gray-600 text-sm">Study Hours</p>
              <p className="text-3xl font-bold text-blue-600">24h</p>
            </div>
          </div>

          {/* Practice Modes */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Practice Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(modes).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => setCurrentPage('categorySelect')}
                  className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-left border-l-4 border-red-600"
                >
                  <Clock className="w-8 h-8 text-red-600 mb-2" />
                  <h3 className="font-bold text-lg text-gray-800">{mode.name}</h3>
                  <p className="text-gray-600">{mode.questions} Questions • {mode.time} min</p>
                </button>
              ))}
            </div>
          </div>

          {/* Categories Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Category Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(categories).map(([key, category]) => (
                <div key={key} className={`${category.color} p-6 rounded-lg`}>
                  <p className="text-2xl mb-2">{category.icon}</p>
                  <h3 className={`font-bold ${category.textColor}`}>{category.name}</h3>
                  <p className="text-gray-600 mt-2">75% • 15 questions</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentPage === 'categorySelect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <button onClick={() => setCurrentPage('dashboard')} className="flex items-center gap-2 hover:opacity-80">
            <RotateCcw className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold mt-4">Select Category</h1>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => startPractice(Object.keys(modes)[0], key)}
                className={`${category.color} p-8 rounded-lg text-left hover:shadow-lg transition border-l-4 border-gray-400`}
              >
                <p className="text-5xl mb-4">{category.icon}</p>
                <h3 className={`text-2xl font-bold ${category.textColor}`}>{category.name}</h3>
                <p className="text-gray-600 mt-2">10 practice questions</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentPage === 'practice' && !showResults) {
    const categoryData = categories[selectedCategory]
    const modeConfig = modes[selectedMode]
    const questions = categoryData.questions.slice(0, modeConfig.questions)
    const currentQ = questions[currentQuestion]
    const progress = ((currentQuestion + 1) / questions.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h2 className="font-bold">{categoryData.name} • {modeConfig.name}</h2>
              <p className="text-sm text-red-100">Question {currentQuestion + 1} of {questions.length}</p>
            </div>
            <div className="text-3xl font-bold text-yellow-300">{formatTime(timeLeft)}</div>
          </div>
          <div className="bg-red-700 mt-3 rounded h-2">
            <div className="bg-green-500 h-2 rounded transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Question */}
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <p className="text-xl font-bold text-gray-800 mb-6">{currentQ.q}</p>
            <div className="space-y-3">
              {currentQ.opts.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-red-600 hover:bg-red-50 transition font-medium"
                >
                  {String.fromCharCode(65 + idx)}) {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => toggleFlag(currentQuestion)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${flagged.has(currentQuestion) ? 'bg-orange-500 text-white' : 'bg-white text-gray-800 border-2 border-gray-200'}`}
            >
              <Flag className="w-4 h-4" />
              {flagged.has(currentQuestion) ? 'Flagged' : 'Flag'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const categoryData = categories[selectedCategory]
    const modeConfig = modes[selectedMode]
    const questions = categoryData.questions.slice(0, modeConfig.questions)
    const percentage = Math.round((score / questions.length) * 100)
    const isPassing = percentage >= 70

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <h1 className="text-3xl font-bold">Session Results</h1>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Score Card */}
          <div className={`${isPassing ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 rounded-lg p-8 mb-6 text-center`}>
            <p className="text-gray-600 mb-2">{categoryData.name} • {modeConfig.name}</p>
            <div className="text-6xl font-bold mb-4">
              <span className={isPassing ? 'text-green-600' : 'text-red-600'}>{percentage}%</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{score} of {questions.length} Correct</p>
            <p className={`mt-4 text-lg ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
              {isPassing ? '✓ Passing Score!' : '✗ Keep Practicing'}
            </p>
          </div>

          {/* Answer Review */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Answer Review</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((q, idx) => {
                const userAnswer = answered.find(a => a.question === idx)
                const isCorrect = userAnswer?.correct
                return (
                  <div key={idx} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                    <p className="font-bold text-gray-800">Q{idx + 1}: {q.q}</p>
                    <p className={`mt-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      Your answer: <strong>{q.opts[userAnswer?.answer]}</strong>
                    </p>
                    {!isCorrect && <p className="text-green-700 mt-1">Correct answer: <strong>{q.opts[q.correct]}</strong></p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => startPractice(selectedMode, selectedCategory)}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default FCTC_COACH
