'use client'

import React, { useState, useEffect } from 'react'
import { Flame, Award, TrendingUp, Clock, Flag, RotateCcw, LogOut } from 'lucide-react'

const FCTC_COACH = () => {
  const [currentPage, setCurrentPage] = useState('login')
  const [userName, setUserName] = useState('')
  const [inputName, setInputName] = useState('')
  const [selectedMode, setSelectedMode] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState([])
  const [flagged, setFlagged] = useState(new Set())
  const [showResults, setShowResults] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerActive, setTimerActive] = useState(false)
  const [sessionQuestions, setSessionQuestions] = useState([])
  const [userStats, setUserStats] = useState({})
  const [allUsers, setAllUsers] = useState([])

  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('fctcUsers') || '{}')
    setAllUsers(Object.keys(savedUsers))
    if (userName) {
      setUserStats(savedUsers[userName] || { overall: 0, sessions: 0, hours: 0, categories: {} })
    }
  }, [userName])

  const saveUserStats = (newStats) => {
    const allUserData = JSON.parse(localStorage.getItem('fctcUsers') || '{}')
    allUserData[userName] = newStats
    localStorage.setItem('fctcUsers', JSON.stringify(allUserData))
    setUserStats(newStats)
  }

  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const allQuestions = {
    mechanicalReasoning: [
      { q: 'Which pulley system requires the least effort to lift a weight?', opts: ['Single fixed pulley', 'Double movable pulley', 'Single movable pulley', 'No pulley system'], correct: 1 },
      { q: 'In a gear system, if the driving gear has 20 teeth and the driven gear has 40 teeth, what is the gear ratio?', opts: ['1:1', '1:2', '2:1', '1:4'], correct: 1 },
      { q: 'A ladder leaning against a wall is most stable when the base is what distance from the wall?', opts: ['1/4 of ladder length', '1/3 of ladder length', '1/2 of ladder length', '2/3 of ladder length'], correct: 1 },
      { q: 'Which type of inclined plane requires the least force to move an object up?', opts: ['Steep angle', 'Shallow angle', 'Vertical angle', 'All angles are equal'], correct: 1 },
      { q: 'In a hydraulic system, if the input piston has an area of 10 cm² and the output piston has 100 cm², what is the mechanical advantage?', opts: ['1', '5', '10', '100'], correct: 2 },
      { q: 'A wheel and axle has a wheel radius of 20 cm and axle radius of 5 cm. What is the mechanical advantage?', opts: ['2', '4', '15', '100'], correct: 1 },
      { q: 'Which type of lever has the load between the fulcrum and effort?', opts: ['First class', 'Second class', 'Third class', 'Fourth class'], correct: 1 },
      { q: 'A screw is essentially a(n):', opts: ['Inclined plane wrapped around a cylinder', 'Simple wedge', 'Rotating lever', 'Hydraulic system'], correct: 0 },
      { q: 'In a block and tackle system with 4 supporting ropes, the mechanical advantage is:', opts: ['2', '3', '4', '8'], correct: 2 },
      { q: 'Which pulley arrangement provides the greatest mechanical advantage?', opts: ['Single fixed pulley', 'Block and tackle with 6 ropes', 'Simple movable pulley', 'Rope and knot only'], correct: 1 },
      { q: 'What is the mechanical advantage of a 10:1 pulley system?', opts: ['The load moves 10 times faster', '10 times less force is needed', 'The rope is 10 times longer', 'No mechanical advantage'], correct: 1 },
      { q: 'A wedge is used to split a log. This is an example of which simple machine?', opts: ['Lever', 'Inclined plane', 'Pulley', 'Wheel and axle'], correct: 1 },
      { q: 'In a first-class lever, where is the fulcrum located?', opts: ['At one end', 'Between the load and effort', 'Under the load', 'Under the effort'], correct: 1 },
      { q: 'If a ramp is 30 feet long and rises 6 feet, what is the mechanical advantage?', opts: ['5', '6', '30', '36'], correct: 0 },
      { q: 'A seesaw is an example of which class of lever?', opts: ['First class', 'Second class', 'Third class', 'No class'], correct: 0 },
      { q: 'When using a crowbar to remove a nail, which simple machine is being used?', opts: ['Pulley', 'Lever', 'Inclined plane', 'Wheel and axle'], correct: 1 },
      { q: 'How do ball bearings reduce friction in a wheel?', opts: ['They increase surface area', 'They allow rolling instead of sliding', 'They add lubricant', 'They reduce weight'], correct: 1 },
      { q: 'What happens to the effort distance in a 3:1 mechanical advantage system?', opts: ['It decreases', 'It increases 3 times', 'It stays the same', 'It becomes zero'], correct: 1 },
      { q: 'A door handle is an example of which simple machine?', opts: ['Lever', 'Wheel and axle', 'Pulley', 'Inclined plane'], correct: 1 },
      { q: 'In a belt-and-pulley system, what determines the speed ratio?', opts: ['The material of the belt', 'The diameter of the pulleys', 'The tension in the belt', 'The length of the belt'], correct: 1 },
      { q: 'Which statement about friction is true?', opts: ['Friction always helps motion', 'Friction opposes motion', 'Friction has no effect on machines', 'Friction only exists on slopes'], correct: 1 },
      { q: 'A bolt and nut work together like which simple machine?', opts: ['Lever', 'Pulley', 'Screw', 'Wheel and axle'], correct: 2 },
      { q: 'When a lever has a long effort arm and short load arm, what is the result?', opts: ['More effort needed', 'Less effort needed', 'Equal effort and load', 'No mechanical advantage'], correct: 1 },
      { q: 'What is the primary purpose of a fulcrum?', opts: ['To reduce friction', 'To act as a pivot point', 'To increase speed', 'To measure distance'], correct: 1 },
      { q: 'In an inclined plane, reducing the angle of the slope will:', opts: ['Increase mechanical advantage', 'Decrease mechanical advantage', 'Have no effect', 'Double the advantage'], correct: 0 },
      { q: 'A car jack is which type of simple machine?', opts: ['Pulley', 'Screw or lever', 'Wheel and axle', 'Inclined plane'], correct: 1 },
      { q: 'How many fixed pulleys are needed to gain mechanical advantage?', opts: ['One', 'Two', 'Three', 'Movable pulleys are needed'], correct: 3 },
      { q: 'What does a fixed pulley primarily provide?', opts: ['Mechanical advantage', 'Change of direction', 'Increased speed', 'Reduced weight'], correct: 1 },
      { q: 'In mechanical systems, what is lubrication used for?', opts: ['Increase weight', 'Reduce friction', 'Increase speed', 'Prevent rust'], correct: 1 },
      { q: 'A pencil sharpener uses which type of simple machine?', opts: ['Pulley', 'Screw', 'Wheel and axle', 'Lever'], correct: 2 }
    ],

    mathematics: [
      { q: 'If a fire truck travels 60 miles in 1 hour, how far will it travel in 2.5 hours?', opts: ['120 miles', '150 miles', '180 miles', '200 miles'], correct: 1 },
      { q: 'A water tank holds 5,000 gallons. If it drains at 250 gallons per minute, how many minutes to empty?', opts: ['10 minutes', '15 minutes', '20 minutes', '25 minutes'], correct: 2 },
      { q: 'Convert 98.6°F to Celsius (use formula C = (F-32) × 5/9):', opts: ['35°C', '36°C', '37°C', '38°C'], correct: 2 },
      { q: 'If a ladder is 25 feet long and needs to reach 20 feet high on a wall, how far from the wall should the base be?', opts: ['10 feet', '12 feet', '15 feet', '20 feet'], correct: 2 },
      { q: 'A crew of 5 firefighters can clear a building in 30 minutes. How long would it take 3 firefighters?', opts: ['18 minutes', '30 minutes', '40 minutes', '50 minutes'], correct: 2 },
      { q: 'What is 45% of 200?', opts: ['80', '85', '90', '95'], correct: 2 },
      { q: 'If hose costs $2.50 per foot, how much for 150 feet?', opts: ['$300', '$350', '$375', '$400'], correct: 2 },
      { q: 'A tank is 3/4 full with 300 gallons. What is its total capacity?', opts: ['400 gallons', '225 gallons', '375 gallons', '450 gallons'], correct: 0 },
      { q: 'If response time increases from 4 minutes to 6 minutes, what is the percentage increase?', opts: ['25%', '33%', '50%', '60%'], correct: 1 },
      { q: 'A rectangular room is 20 feet by 15 feet. What is its area?', opts: ['35 sq ft', '70 sq ft', '150 sq ft', '300 sq ft'], correct: 2 },
      { q: 'Convert 32°F to Celsius:', opts: ['-5°C', '0°C', '5°C', '10°C'], correct: 1 },
      { q: 'If 8 firefighters work for 10 hours, how many person-hours is that?', opts: ['18', '80', '800', '8'], correct: 1 },
      { q: 'A hose with 3 inches diameter at 100 PSI flows 200 GPM. How long to fill a 1000 gallon tank?', opts: ['3 min', '5 min', '7 min', '10 min'], correct: 1 },
      { q: 'What is 15% of 360?', opts: ['36', '45', '54', '72'], correct: 2 },
      { q: 'Convert 0°C to Fahrenheit:', opts: ['32°F', '64°F', '96°F', '128°F'], correct: 0 },
      { q: 'If equipment costs $5,000 and depreciates 10% per year, what is it worth after 1 year?', opts: ['$4,000', '$4,500', '$4,600', '$4,950'], correct: 3 },
      { q: 'A building has 12 floors. If each floor is 12 feet high, what is the building height?', opts: ['24 feet', '72 feet', '120 feet', '144 feet'], correct: 3 },
      { q: 'If a pump delivers 500 GPM for 20 minutes, how many gallons total?', opts: ['2,500', '5,000', '10,000', '20,000'], correct: 2 },
      { q: 'What is the square root of 144?', opts: ['10', '11', '12', '13'], correct: 2 },
      { q: 'Convert 212°F to Celsius (boiling point of water):', opts: ['95°C', '100°C', '105°C', '110°C'], correct: 1 },
      { q: 'If a hose is 150 feet long and weighs 2 pounds per foot, what is total weight?', opts: ['75 lbs', '150 lbs', '300 lbs', '450 lbs'], correct: 2 },
      { q: 'What percentage is 25 out of 200?', opts: ['12.5%', '15%', '20%', '25%'], correct: 0 },
      { q: 'If crew response time must be under 5 minutes for 90% of calls, how many calls can be slow?', opts: ['10%', '20%', '5%', '15%'], correct: 0 },
      { q: 'A 40-foot ladder at a 45-degree angle reaches how high on a wall?', opts: ['20 feet', '28 feet', '34 feet', '40 feet'], correct: 1 },
      { q: 'If a fire burns at 800°F and you cool it by 60%, what is the new temperature?', opts: ['320°F', '480°F', '620°F', '740°F'], correct: 1 },
      { q: 'Convert 50°C to Fahrenheit:', opts: ['90°F', '100°F', '110°F', '122°F'], correct: 3 },
      { q: 'What is 33% of 300?', opts: ['99', '100', '110', '120'], correct: 0 },
      { q: 'If a truck uses 5 gallons of fuel per 20 miles, how much for 100 miles?', opts: ['10 gallons', '15 gallons', '20 gallons', '25 gallons'], correct: 1 },
      { q: 'A circular tank has radius 10 feet. What is its area? (Use π ≈ 3.14)', opts: ['31.4 sq ft', '62.8 sq ft', '314 sq ft', '628 sq ft'], correct: 2 },
      { q: 'If equipment costs $10,000 and you need 6 of them, what is total cost?', opts: ['$40,000', '$50,000', '$60,000', '$70,000'], correct: 2 }
    ],

    readingComprehension: [
      { q: 'In firefighting, what does "ventilation" primarily refer to?', opts: ['Cooling equipment', 'Removing heat and smoke', 'Water supply systems', 'Communication devices'], correct: 1 },
      { q: 'According to fire safety standards, what is the primary purpose of a fire extinguisher classification system?', opts: ['To organize equipment', 'To indicate which fires it can safely extinguish', 'To show the purchase date', 'To mark the pressure level'], correct: 1 },
      { q: 'What does "backdraft" mean in firefighting terms?', opts: ['A sudden gust of wind', 'A rapid explosion from a confined fire reaching oxygen', 'Water spraying backwards', 'Smoke moving upward'], correct: 1 },
      { q: 'Firefighters must maintain physical fitness. What is the main reason?', opts: ['To look professional', 'To meet minimum requirements', 'To handle physical demands of rescue operations', 'To participate in competitions'], correct: 2 },
      { q: 'Based on fire safety protocols, which is NOT a firefighter responsibility?', opts: ['Fire prevention education', 'Emergency response', 'Building inspections', 'Real estate sales'], correct: 3 },
      { q: 'What can be inferred about fire department protocols?', opts: ['They are optional', 'They are designed for safety and efficiency', 'They change daily', 'They are not important'], correct: 1 },
      { q: 'Why is smoke inhalation dangerous to firefighters?', opts: ['It reduces visibility', 'It contains toxic gases causing injury', 'It makes noise', 'It increases temperature'], correct: 1 },
      { q: 'What is the main idea of proper firefighter training?', opts: ['Training is difficult', 'Training is essential for effective response', 'All get same training', 'Training happens once'], correct: 1 },
      { q: 'What should a firefighter do first upon arriving at a scene?', opts: ['Enter immediately', 'Assess and establish safety parameters', 'Call for backup only', 'Set up equipment'], correct: 1 },
      { q: 'Why is communication critical in firefighting operations?', opts: ['Talking is important', 'Clear communication ensures coordinated, safe operations', 'Only supervisors communicate', 'Communication happens after'], correct: 1 },
      { q: 'What does "fire load" refer to?', opts: ['Weight of equipment', 'Total amount of flammable material in space', 'Number of firefighters', 'Water pressure'], correct: 1 },
      { q: 'In a confined space, what increases fire risk?', opts: ['More exits', 'Better ventilation', 'Limited oxygen circulation', 'Wet surfaces'], correct: 2 },
      { q: 'What is "thermal layering" in a fire?', opts: ['Paint on walls', 'Different temperature zones in a fire', 'Type of fire hose', 'Protective gear'], correct: 1 },
      { q: 'Why is proper hydration important for firefighters?', opts: ['Increases strength', 'Maintains body temperature during strenuous work', 'Makes uniform fit better', 'Is required by law'], correct: 1 },
      { q: 'What does "situational awareness" mean in emergency response?', opts: ['Being aware of surroundings and conditions', 'Having a good attitude', 'Following orders', 'Using equipment properly'], correct: 0 },
      { q: 'In fire operations, what is a "ladder angle"?', opts: ['Type of ladder material', 'Angle ladder should be positioned for safety', 'Color of ladder', 'Weight of ladder'], correct: 1 },
      { q: 'What is the purpose of a "safety brief" before operations?', opts: ['Waste time', 'Ensure all understand plan and hazards', 'Show authority', 'Comply with rules'], correct: 1 },
      { q: 'How do firefighters determine if a floor can support their weight?', opts: ['By walking on it', 'By assessing structural integrity and testing', 'By looking at it', 'By listening to sounds'], correct: 1 },
      { q: 'What is "rescue priority"?', opts: ['Saving valuable items', 'Establishing order of life rescue operations', 'Finding lost equipment', 'Cleaning up'], correct: 1 },
      { q: 'Why might a building be declared structurally unsafe?', opts: ['Paint is old', 'Fire damage compromises structural integrity', 'Windows are broken', 'Doors are locked'], correct: 1 },
      { q: 'What is "carbon monoxide" and why is it dangerous?', opts: ['A type of smoke', 'Colorless gas that can cause death at high concentrations', 'Water vapor', 'Oxygen'], correct: 1 },
      { q: 'In medical emergencies, what does CPR stand for?', opts: ['Cardiac Pressure Response', 'Cardiopulmonary Resuscitation', 'Cardiac Performance Recording', 'Chemical Pressure Relief'], correct: 1 },
      { q: 'What is the importance of a "response plan"?', opts: ['Unnecessary', 'Provides organized approach to emergencies', 'Only for large events', 'Just paperwork'], correct: 1 },
      { q: 'How should firefighters approach an unknown hazard?', opts: ['Investigate immediately', 'Use caution and proper safety procedures', 'Ignore it', 'Report later'], correct: 1 },
      { q: 'What does "containment" mean in fire operations?', opts: ['Storing fire equipment', 'Preventing fire spread to other areas', 'Filling containers', 'Organizing firefighters'], correct: 1 },
      { q: 'Why is equipment maintenance critical?', opts: ['Looks good', 'Ensures reliability when needed', 'Required by fire chief', 'Wastes time'], correct: 1 },
      { q: 'What is "mutual aid" in firefighting?', opts: ['Helping each other', 'Other agencies assisting during emergencies', 'Mandatory help', 'Voluntary program'], correct: 1 },
      { q: 'How do firefighters identify building exits?', opts: ['By looking', 'Through systematic floor searches and prior knowledge', 'From memory', 'By asking residents'], correct: 1 },
      { q: 'What is a "scene size-up"?', opts: ['Looking at fire size', 'Initial assessment of incident conditions and hazards', 'Taking photographs', 'Talking to neighbors'], correct: 1 },
      { q: 'Why is it important to test equipment regularly?', opts: ['Keeps it clean', 'Ensures it functions properly in emergencies', 'Uses budget', 'Keeps everyone busy'], correct: 1 }
    ],

    memoryRecall: [
      { q: 'In the scenario, what color was the fire truck?', opts: ['Red', 'White', 'Yellow', 'Blue'], correct: 0 },
      { q: 'How many firefighters appeared in the initial scene?', opts: ['2', '3', '4', '5'], correct: 2 },
      { q: 'What equipment was used first in the scenario?', opts: ['Ladder', 'Hose', 'Extinguisher', 'Rope'], correct: 1 },
      { q: 'What time was shown on the clock?', opts: ['2:30 PM', '3:00 PM', '3:15 PM', '3:45 PM'], correct: 2 },
      { q: 'What was the main challenge faced?', opts: ['Access to water', 'Trapped individuals', 'Weather conditions', 'Equipment failure'], correct: 1 },
      { q: 'How many windows were visible on the building?', opts: ['2', '4', '6', '8'], correct: 2 },
      { q: 'What color were the firefighters helmets?', opts: ['Red', 'Yellow', 'White', 'Black'], correct: 1 },
      { q: 'In sequence, what was the second action taken?', opts: ['Setting up equipment', 'Assessing the scene', 'Establishing perimeter', 'Entering building'], correct: 0 },
      { q: 'How many doors were shown?', opts: ['1', '2', '3', '4'], correct: 1 },
      { q: 'What distinctive feature was on the roof?', opts: ['Antenna', 'Chimney', 'Solar panels', 'Water tank'], correct: 1 },
      { q: 'How many fire trucks were present?', opts: ['1', '2', '3', '4'], correct: 0 },
      { q: 'What color was the scene location marker?', opts: ['Orange', 'Yellow', 'Red', 'White'], correct: 1 },
      { q: 'How many steps led to the entrance?', opts: ['2', '3', '4', '5'], correct: 2 },
      { q: 'What type of building was it?', opts: ['House', 'Apartment', 'Commercial', 'Industrial'], correct: 0 },
      { q: 'Was the building surrounded by vegetation?', opts: ['No', 'Minimal', 'Moderate', 'Heavy'], correct: 2 },
      { q: 'What was the condition of the main entrance?', opts: ['Locked', 'Open', 'Damaged', 'Blocked'], correct: 2 },
      { q: 'How many firefighters wore red helmets?', opts: ['1', '2', '3', '4'], correct: 2 },
      { q: 'Was there visible smoke from the building?', opts: ['No', 'Light', 'Moderate', 'Heavy'], correct: 3 },
      { q: 'What was the street address number visible?', opts: ['124', '142', '214', '241'], correct: 1 },
      { q: 'How many civilians were visible in the area?', opts: ['0', '1', '2', '3'], correct: 1 },
      { q: 'What was the weather condition during the scenario?', opts: ['Clear', 'Cloudy', 'Rainy', 'Foggy'], correct: 0 },
      { q: 'How many equipment cases were brought out initially?', opts: ['1', '2', '3', '4'], correct: 2 },
      { q: 'What was written on the emergency vehicle?', opts: ['FIRE', 'DEPT', 'RESCUE', 'EMERGENCY'], correct: 3 },
      { q: 'How many windows on the front of building?', opts: ['2', '3', '4', '5'], correct: 1 },
      { q: 'Was safety tape used to cordon the area?', opts: ['No', 'Light', 'Moderate', 'Heavy'], correct: 2 },
      { q: 'What color was the main door?', opts: ['Brown', 'Red', 'Blue', 'Green'], correct: 0 },
      { q: 'How many personnel conducted initial assessment?', opts: ['1', '2', '3', '4'], correct: 1 },
      { q: 'Was the area fully evacuated?', opts: ['No', 'Partially', 'Completely', 'Unsure'], correct: 2 },
      { q: 'What type of ladder was used?', opts: ['Aluminum', 'Fiberglass', 'Wooden', 'Extension'], correct: 3 },
      { q: 'How long was the initial scene assessment?', opts: ['2 min', '5 min', '8 min', '10 min'], correct: 2 }
    ]
  }

  const categories = {
    mechanicalReasoning: { name: 'Mechanical Reasoning', icon: '⚙️', color: 'bg-blue-100', textColor: 'text-blue-700' },
    mathematics: { name: 'Mathematics', icon: '🔢', color: 'bg-green-100', textColor: 'text-green-700' },
    readingComprehension: { name: 'Reading Comprehension', icon: '📖', color: 'bg-purple-100', textColor: 'text-purple-700' },
    memoryRecall: { name: 'Memory & Recall', icon: '🧠', color: 'bg-red-100', textColor: 'text-red-700' }
  }

  const modes = {
    quickDrill: { name: 'Quick Drill', questions: 10, time: 15 },
    studySession: { name: 'Study Session', questions: 25, time: 45 },
    fullExam: { name: 'Full Exam', questions: 50, time: 120 }
  }

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

  const handleLogin = (e) => {
    e.preventDefault()
    if (inputName.trim()) {
      setUserName(inputName)
      setCurrentPage('dashboard')
      const savedUsers = JSON.parse(localStorage.getItem('fctcUsers') || '{}')
      if (!savedUsers[inputName]) {
        savedUsers[inputName] = { overall: 0, sessions: 0, hours: 0, categories: {} }
        localStorage.setItem('fctcUsers', JSON.stringify(savedUsers))
      }
      setAllUsers(Object.keys(savedUsers))
    }
  }

  const handleLogout = () => {
    setUserName('')
    setInputName('')
    setCurrentPage('login')
  }

  const resetScore = () => {
    if (confirm('Are you sure you want to reset all scores?')) {
      const resetStats = { overall: 0, sessions: 0, hours: 0, categories: {} }
      saveUserStats(resetStats)
    }
  }

  const startPractice = (mode, category) => {
    const modeConfig = modes[mode]
    const allCategoryQuestions = allQuestions[category]

    const shuffled = shuffleArray(allCategoryQuestions)
    const selected = shuffled.slice(0, modeConfig.questions)

    const questionsWithShuffledAnswers = selected.map(q => {
      const options = q.opts.map((opt, idx) => ({ text: opt, originalIdx: idx }))
      const shuffledOpts = shuffleArray(options)
      const newCorrectIdx = shuffledOpts.findIndex(opt => opt.originalIdx === q.correct)
      return { ...q, opts: shuffledOpts.map(opt => opt.text), correct: newCorrectIdx }
    })

    setSessionQuestions(questionsWithShuffledAnswers)
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
    const isCorrect = sessionQuestions[currentQuestion].correct === optionIndex

    setAnswered([...answered, { question: currentQuestion, answer: optionIndex, correct: isCorrect }])
    if (isCorrect) setScore(score + 1)

    if (currentQuestion < sessionQuestions.length - 1) {
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

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Flame className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-800">FCTC Pass Coach</h1>
          </div>
          <p className="text-gray-600 mb-6">California Firefighter Candidate Test Preparation</p>

          <form onSubmit={handleLogin} className="mb-6">
            <input
              type="text"
              placeholder="Enter your name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:border-red-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition"
            >
              Start Studying
            </button>
          </form>

          {allUsers.length > 0 && (
            <div>
              <p className="text-gray-700 font-bold mb-3">Previous Users:</p>
              <div className="space-y-2">
                {allUsers.map(user => (
                  <button
                    key={user}
                    onClick={() => { setInputName(user); setUserName(user); setCurrentPage('dashboard') }}
                    className="w-full bg-gray-100 p-3 rounded-lg text-left hover:bg-gray-200 transition"
                  >
                    {user}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (currentPage === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">FCTC Pass Coach</h1>
                <p className="text-red-100">Welcome, {userName}!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Switch User
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <Award className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-gray-600 text-sm">Overall Score</p>
              <p className="text-3xl font-bold text-gray-800">{userStats.overall || 0}%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-gray-600 text-sm">Sessions Completed</p>
              <p className="text-3xl font-bold text-green-600">{userStats.sessions || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <Flame className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-gray-600 text-sm">Study Hours</p>
              <p className="text-3xl font-bold text-orange-600">{userStats.hours || 0}h</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <RotateCcw className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-gray-600 text-sm">Actions</p>
              <button
                onClick={resetScore}
                className="text-sm text-blue-600 hover:text-blue-800 font-bold mt-2"
              >
                Reset Scores
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Practice Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(modes).map(([key, mode]) => (
                <button key={key} onClick={() => setCurrentPage('categorySelect')} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition text-left border-l-4 border-red-600">
                  <Clock className="w-8 h-8 text-red-600 mb-2" />
                  <h3 className="font-bold text-lg text-gray-800">{mode.name}</h3>
                  <p className="text-gray-600">{mode.questions} Questions • {mode.time} min</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Category Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(categories).map(([key, category]) => (
                <div key={key} className={`${category.color} p-6 rounded-lg`}>
                  <p className="text-2xl mb-2">{category.icon}</p>
                  <h3 className={`font-bold ${category.textColor}`}>{category.name}</h3>
                  <p className="text-gray-600 mt-2">{userStats.categories?.[key]?.score || 0}%</p>
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
            <RotateCcw className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-bold mt-4">Select Category</h1>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categories).map(([key, category]) => (
              <button key={key} onClick={() => startPractice(Object.keys(modes)[0], key)} className={`${category.color} p-8 rounded-lg text-left hover:shadow-lg transition border-l-4 border-gray-400`}>
                <p className="text-5xl mb-4">{category.icon}</p>
                <h3 className={`text-2xl font-bold ${category.textColor}`}>{category.name}</h3>
                <p className="text-gray-600 mt-2">Random questions each time</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentPage === 'practice' && !showResults && sessionQuestions.length > 0) {
    const categoryData = categories[selectedCategory]
    const modeConfig = modes[selectedMode]
    const currentQ = sessionQuestions[currentQuestion]
    const progress = ((currentQuestion + 1) / sessionQuestions.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        <div className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h2 className="font-bold">{categoryData.name} • {modeConfig.name}</h2>
              <p className="text-sm text-red-100">Question {currentQuestion + 1} of {sessionQuestions.length}</p>
            </div>
            <div className="text-3xl font-bold text-yellow-300">{formatTime(timeLeft)}</div>
          </div>
          <div className="bg-red-700 mt-3 rounded h-2">
            <div className="bg-green-500 h-2 rounded transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <p className="text-xl font-bold text-gray-800 mb-6">{currentQ.q}</p>
            <div className="space-y-3">
              {currentQ.opts.map((opt, idx) => (
                <button key={idx} onClick={() => handleAnswer(idx)} className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-red-600 hover:bg-red-50 transition font-medium">
                  {String.fromCharCode(65 + idx)}) {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => toggleFlag(currentQuestion)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${flagged.has(currentQuestion) ? 'bg-orange-500 text-white' : 'bg-white text-gray-800 border-2 border-gray-200'}`}>
              <Flag className="w-4 h-4" />
              {flagged.has(currentQuestion) ? 'Flagged' : 'Flag'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults && sessionQuestions.length > 0) {
    const categoryData = categories[selectedCategory]
    const modeConfig = modes[selectedMode]
    const percentage = Math.round((score / sessionQuestions.length) * 100)
    const isPassing = percentage >= 70

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <h1 className="text-3xl font-bold">Session Results</h1>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className={`${isPassing ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 rounded-lg p-8 mb-6 text-center`}>
            <p className="text-gray-600 mb-2">{categoryData.name} • {modeConfig.name}</p>
            <div className="text-6xl font-bold mb-4">
              <span className={isPassing ? 'text-green-600' : 'text-red-600'}>{percentage}%</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{score} of {sessionQuestions.length} Correct</p>
            <p className={`mt-4 text-lg ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
              {isPassing ? '✓ Passing Score!' : '✗ Keep Practicing'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Answer Review</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {sessionQuestions.map((q, idx) => {
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

          <div className="flex gap-4">
            <button onClick={() => setCurrentPage('dashboard')} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
              Return to Dashboard
            </button>
            <button onClick={() => startPractice(selectedMode, selectedCategory)} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default FCTC_COACH