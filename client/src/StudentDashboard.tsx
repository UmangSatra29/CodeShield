import { ArrowRight, BookOpen, Clock3, Code2, FileText, GraduationCap, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

export function StudentDashboard({ go, name, courses, assignments, refresh, notify }: any) {
  const pending = assignments.filter((a: any) => a.status !== 'COMPLETED').length;
  const completed = assignments.length - pending;
  const nextAssignment = [...assignments]
    .filter((a: any) => a.title)
    .sort((a: any, b: any) => {
      const aTime = new Date(a.endsAt || 0).getTime();
      const bTime = new Date(b.endsAt || 0).getTime();
      return aTime - bTime;
    })[0];

  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">STUDENT WORKSPACE <i /></div>
          <h1>Welcome back, {name.split(' ')[0]}.</h1>
          <p>Your learning progress, assignments, and class activity are grouped here for quick review.</p>
        </div>
        <button className="primary" onClick={() => go('My Assignments')}>
          <BookOpen size={16} /> View my work
        </button>
      </div>

      <div className="stats">
        {[
          ['My classes', courses.length, 'Active enrollments', Users, '#586de8'],
          ['Assignments', assignments.length, 'Published to your classes', BookOpen, '#20a77c'],
          ['To complete', pending, 'Remaining tasks', Clock3, '#e39c35'],
          ['Completed', completed, 'Reviewed submissions', FileText, '#8963df']
        ].map(([label, value, hint, Icon, color]: any) => (
          <div className="stat" key={label as string}>
            <div className="stat-top">
              <span>{label}</span>
              <i style={{ color, background: `${color}16` }}>
                <Icon size={18} />
              </i>
            </div>
            <b>{value}</b>
            <small>{hint}</small>
          </div>
        ))}
      </div>

      <div className="grid home-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Upcoming work</h2>
              <p>Priority tasks from your enrolled classes.</p>
            </div>
          </div>

          {assignments.length ? (
            assignments.slice(0, 4).map((a: any) => (
              <div className="class-row" key={a._id || a.title}>
                <span className="class-icon"><Code2 size={17} /></span>
                <div>
                  <b>{a.title}</b>
                  <small>{courses.find((c: any) => c._id === a.courseId)?.name || 'Class assignment'}</small>
                </div>
                <button className="text-link" onClick={() => go('My Assignments')}>
                  Open <ArrowRight size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-inline">
              <BookOpen size={19} />
              <div>
                <b>No assignments yet</b>
                <span>Assignments appear when a teacher publishes work to one of your classes.</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>My classes</h2>
              <p>Your active learning groups.</p>
            </div>
          </div>

          {courses.length ? (
            courses.slice(0, 4).map((course: any) => (
              <div className="class-row" key={course._id || course.name}>
                <span className="class-icon"><GraduationCap size={17} /></span>
                <div>
                  <b>{course.name}</b>
                  <small>{course.studentIds?.length || 0} classmates enrolled</small>
                </div>
                <button className="text-link" onClick={() => go('Dashboard')}>
                  View <ArrowRight size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-inline">
              <Users size={19} />
              <div>
                <b>No classes joined</b>
                <span>Use your teacher’s share code to join the first class.</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid home-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Progress snapshot</h2>
              <p>Quick status for your current learning track.</p>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><TrendingUp size={17} /></span>
            <div>
              <b>Completion pace</b>
              <small>{assignments.length ? Math.min(100, Math.round((completed / Math.max(assignments.length, 1)) * 100)) : 0}% of published work completed</small>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><Target size={17} /></span>
            <div>
              <b>Next priority</b>
              <small>{nextAssignment ? nextAssignment.title : 'No current assignment scheduled'}</small>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Keep momentum on your learning plan.</p>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><Sparkles size={17} /></span>
            <div>
              <b>Review active tasks</b>
              <small>Finish or revisit your current assignment before the deadline.</small>
            </div>
            <button className="text-link" onClick={() => go('My Assignments')}>Open</button>
          </div>

          <div className="class-row">
            <span className="class-icon"><Users size={17} /></span>
            <div>
              <b>Join more classes</b>
              <small>Use a class code to expand your enrolled learning groups.</small>
            </div>
            <button className="text-link" onClick={() => go('Dashboard')}>Manage</button>
          </div>
        </section>
      </div>
    </>
  );
}
