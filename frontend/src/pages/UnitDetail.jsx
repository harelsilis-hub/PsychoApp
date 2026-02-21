import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, BookOpen, Brain } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { progressAPI } from '../api/progress';

const UNIT_TOTALS = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

const UnitDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const unitNum = parseInt(id, 10);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    progressAPI.getUnitStats()
      .then((data) => {
        const unit = data.units.find((u) => u.unit === unitNum);
        setStats(unit || { unit: unitNum, learned: 0, total: UNIT_TOTALS[unitNum] || 0, percent: 0 });
      })
      .catch(console.error);
  }, [unitNum]);

  const learned  = stats?.learned ?? 0;
  const total    = stats?.total   ?? UNIT_TOTALS[unitNum] ?? 0;
  const percent  = stats?.percent ?? 0;

  const actions = [
    {
      icon: <Zap className="w-7 h-7 text-yellow-500" />,
      bg: 'from-yellow-50 to-orange-50',
      border: 'border-yellow-200',
      title: 'Filter Words',
      subtitle: 'Swipe through words — mark what you know',
      detail: "Quickly sort this unit's words. Stop once you've found 10 unknowns — they'll go straight to your Review Session.",
      cta: 'Start Filtering',
      ctaStyle: 'from-yellow-400 to-orange-400',
      onClick: () => navigate(`/unit/${unitNum}/filter`),
    },
    {
      icon: <BookOpen className="w-7 h-7 text-purple-500" />,
      bg: 'from-purple-50 to-blue-50',
      border: 'border-purple-200',
      title: 'Review Session',
      subtitle: 'Study your 10 unknown words in depth',
      detail: 'See each word with its Hebrew translation, AI memory tip, and your personal note. Mark Known / Unknown to update your SM-2 schedule.',
      cta: 'Start Review',
      ctaStyle: 'from-purple-500 to-blue-500',
      onClick: () => navigate(`/unit/${unitNum}/review`),
    },
    {
      icon: <Brain className="w-7 h-7 text-green-500" />,
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      title: 'Practice Quiz',
      subtitle: 'Test yourself with multiple-choice questions',
      detail: "A 10-question quiz drawn from words you've already learned. Four options, one correct — great for consolidating memory.",
      cta: 'Start Quiz',
      ctaStyle: 'from-green-500 to-emerald-500',
      onClick: () => navigate(`/unit/${unitNum}/quiz`),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Units
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl
                           flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">{unitNum}</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 leading-tight">Unit {unitNum}</div>
              <div className="text-xs text-gray-500">{total} words</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-5 mb-8"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">Unit Progress</span>
            <span className="text-lg font-bold text-purple-600">{percent}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
          <div className="text-xs text-gray-500">{learned} of {total} words learned</div>
        </motion.div>

        {/* Action cards */}
        <div className="space-y-4">
          {actions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${action.bg} border ${action.border}
                         rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all
                         hover:-translate-y-0.5 group`}
              onClick={action.onClick}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base mb-0.5">{action.title}</div>
                  <div className="text-sm font-medium text-gray-600 mb-2">{action.subtitle}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{action.detail}</div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  className={`w-full bg-gradient-to-r ${action.ctaStyle} text-white
                             py-3 rounded-xl font-semibold text-sm shadow-sm
                             group-hover:shadow-md transition-all`}
                  onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                >
                  {action.cta} →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnitDetail;
