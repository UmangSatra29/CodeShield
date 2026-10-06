import { ArrowRight, BookOpen, Clock3, FileText, GraduationCap, Plus, Sparkles, TrendingUp, Users } from 'lucide-react';

export function TeacherDashboard({ go, name, courses, assignments }: any) {
  const students = courses.reduce((count: number, course: any) => count + (course.studentIds?.length || 0), 0);
  const pendingReview = assignments.length; // placeholder value until submissions are modeled
  const recentCourses = courses.slice(0, 4);

  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">FACULTY WORKSPACE <i /></div>
          <h1>Welcome back, {name.split(' ')[0]}.</h1>
          <p>Track class engagement, see assignment activity, and manage the next evaluation cycle.</p>
        </div>
        <button className="primary" onClick={() => go('Classes')}>
          <Plus size={16} /> Create a class
        </button>
      </div>

      <div className="stats">
        {[
          ['Classes', courses.length, 'Created by you', Users, '#586de8'],
          ['Students', students, 'Joined across your classes', GraduationCap, '#2499c5'],
          ['Assignments', assignments.length, 'Published to classes', BookOpen, '#8963df'],
          ['Pending review', pendingReview, 'Work awaiting feedback', Clock3, '#e39c35']
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
              <h2>Your classes</h2>
              <p>Class rosters and access codes for active cohorts.</p>
            </div>
          </div>

          {courses.length ? (
            recentCourses.map((course: any) => (
              <div className="class-row wide-class" key={course._id || course.name}>
                <span className="class-icon"><GraduationCap size={18} /></span>
                <div>
                  <b>{course.name}</b>
                  <small>{course.studentIds?.length || 0} students · Join code <strong>{course.joinCode || course.code}</strong></small>
                </div>
                <button className="outline" onClick={() => go('Create Assignment')}>
                  Assign work <ArrowRight size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Users size={21} /></div>
              <h2>No classes yet</h2>
              <p>Create your first class. Students join using the unique code, and you can assign work after enrollment starts.</p>
              <button className="primary" onClick={() => go('Classes')}>
                <Plus size={15} /> Create your first class
              </button>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Assessment activity</h2>
              <p>Recent teaching signals from the current term.</p>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><TrendingUp size={17} /></span>
            <div>
              <b>Engagement level</b>
              <small>{courses.length ? `${Math.min(100, Math.round((students / Math.max(courses.length * 8, 1)) * 100))}% active learners across classes` : 'No students enrolled yet'}</small>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><FileText size={17} /></span>
            <div>
              <b>Recent outputs</b>
              <small>{assignments.length ? `${assignments.length} published tasks ready for review` : 'No assignments published yet'}</small>
            </div>
          </div>
        </section>
      </div>

      <div className="grid home-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Assignment pipeline</h2>
              <p>Your upcoming assessment calendar.</p>
            </div>
          </div>

          {assignments.length ? (
            assignments.slice(0, 4).map((a: any) => (
              <div className="class-row" key={a._id || a.title}>
                <span className="class-icon"><BookOpen size={17} /></span>
                <div>
                  <b>{a.title}</b>
                  <small>{a.difficulty || 'MEDIUM'} · {Math.round((a.timeLimitSeconds || 2700) / 60)} minutes</small>
                </div>
                <button className="text-link" onClick={() => go('Assignments')}>Review</button>
              </div>
            ))
          ) : (
            <div className="empty-inline">
              <Sparkles size={19} />
              <div>
                <b>No assignments published</b>
                <span>Create a class and publish a learning task to get started.</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Actions</h2>
              <p>Move quickly through key workflows.</p>
            </div>
          </div>

          <div className="class-row">
            <span className="class-icon"><Plus size={17} /></span>
            <div>
              <b>Create a new class</b>
              <small>Fresh cohorts can register with a generated join code.</small>
            </div>
            <button className="text-link" onClick={() => go('Classes')}>Open</button>
          </div>

          <div className="class-row">
            <span className="class-icon"><FileText size={17} /></span>
            <div>
              <b>Publish assignment</b>
              <small>Send a task to an existing class with clear criteria.</small>
            </div>
            <button className="text-link" onClick={() => go('Create Assignment')}>Open</button>
          </div>
        </section>
      </div>
    </>
  );
}
