import { Target, Clock, Cpu, ArrowLeft, Users, Flame, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: Target,
    title: 'מתמקדים בקושי',
    desc: 'מילים שטעיתם בהן יקבלו עדיפות ויופיעו בתדירות גבוהה יותר.',
    accent: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: Clock,
    title: 'חזרה בזמן הנכון',
    desc: 'המערכת יודעת בדיוק מתי לחזור על כל מילה — רגע לפני שתשכחו.',
    accent: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    icon: Cpu,
    title: 'מותאם אישית',
    desc: "כל תשובה שלכם משנה את התוכנית — האימון מתאים את עצמו אליכם.",
    accent: 'bg-purple-50 text-purple-600 border-purple-100',
  },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900" dir="rtl">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Mila" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg tracking-tight">Mila</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            כניסה
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-24 pb-28 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/80 via-white to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-violet-100/60 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-bold px-4 py-2 rounded-full mb-8 border border-violet-200/60">
            <Flame className="w-3.5 h-3.5" />
            המערכת לומדת אותך ויודעת מתי לחזור על כל מילה
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight mb-6">
            תפסיקו לשנן סתם,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-600 to-indigo-500">
              תתחילו ללמוד חכם
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-xl mx-auto mb-10">
            הדרך היעילה ביותר ללמוד מילים חדשות, לתרגל חכם ולא לשכוח לעולם.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-black text-lg px-9 py-4 rounded-2xl transition-all shadow-xl shadow-violet-200 hover:shadow-violet-300"
          >
            התחל ללמוד עכשיו
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-12 text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 5,445 מילים</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span>20 יחידות לימוד (עברית + אנגלית)</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span>חינם לגמרי</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-5 bg-gray-50/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">איך זה עובד</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">המוח מאחורי המערכת</h2>
            <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm leading-relaxed">
              לא פלאשכארד רגיל — מנוע למידה שמתאים את עצמו לקצב שלכם.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-6 ${accent}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard CTA ── */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-3xl px-8 py-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative">
              <div className="w-16 h-16 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">הצטרפו ותתחרו</h2>

              <p className="text-white/65 text-base leading-relaxed max-w-md mx-auto mb-8">
                צברו נקודות, עלו ברמות והתחרו בלוח המובילים.
                <br />
                האם תגיעו למקום הראשון?
              </p>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-1 mb-8 max-w-xs mx-auto">
                {[
                  { rank: '🥇', name: 'נועה כ.',  xp: '12,450 XP' },
                  { rank: '🥈', name: 'יואב מ.',  xp: '11,230 XP' },
                  { rank: '🥉', name: 'מיה ש.',   xp: '9,870 XP'  },
                ].map(({ rank, name, xp }) => (
                  <div key={name} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors">
                    <span className="text-white/50 text-xs font-semibold" dir="ltr">{xp}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-bold">{name}</span>
                      <span className="text-base">{rank}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-black text-base px-8 py-4 rounded-2xl hover:bg-violet-50 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                הצטרף עכשיו
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Mila" className="w-5 h-5 object-contain" />
            <span className="font-black text-sm text-gray-700">Mila</span>
            <span className="text-gray-300 text-sm">· אוצר מילים פסיכומטרי</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <button onClick={() => navigate('/login')} className="hover:text-gray-600 transition-colors">כניסה</button>
            <span>·</span>
            <a href="/terms" className="hover:text-gray-600 transition-colors underline">תנאי שימוש</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
