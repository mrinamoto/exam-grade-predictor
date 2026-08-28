export const DEFAULT_GRADE_SCALE = [
  { id: 'g-a-plus', label: 'A+', min: 90 },
  { id: 'g-a', label: 'A', min: 85 },
  { id: 'g-a-minus', label: 'A-', min: 80 },
  { id: 'g-b-plus', label: 'B+', min: 75 },
  { id: 'g-b', label: 'B', min: 70 },
  { id: 'g-b-minus', label: 'B-', min: 65 },
  { id: 'g-c-plus', label: 'C+', min: 60 },
  { id: 'g-c', label: 'C', min: 55 },
  { id: 'g-d', label: 'D', min: 50 },
  { id: 'g-f', label: 'F', min: 0 }
];

export const DEFAULT_ASSESSMENTS = [
  { id: 'quiz', name: 'Quiz', score: '', maxScore: 10, weight: 10, status: 'pending' },
  { id: 'assignment', name: 'Assignment', score: '', maxScore: 20, weight: 10, status: 'pending' },
  { id: 'midterm', name: 'Midterm', score: '', maxScore: 30, weight: 30, status: 'pending' },
  { id: 'final', name: 'Final Exam', score: '', maxScore: 50, weight: 50, status: 'pending' }
];

export const EXAMPLE_COURSE = {
  courseName: 'Database Management System',
  courseCode: 'CSE312',
  passMark: 50,
  targetType: 'grade',
  targetGrade: 'A-',
  targetPercentage: 80,
  assessments: [
    { id: 'quiz', name: 'Quiz', score: 8, maxScore: 10, weight: 10, status: 'completed' },
    { id: 'assignment', name: 'Assignment', score: 18, maxScore: 20, weight: 10, status: 'completed' },
    { id: 'midterm', name: 'Midterm', score: 24, maxScore: 30, weight: 30, status: 'completed' },
    { id: 'final', name: 'Final Exam', score: '', maxScore: 50, weight: 50, status: 'pending' }
  ]
};
