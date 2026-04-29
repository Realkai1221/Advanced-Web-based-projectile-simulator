// the sql for this was the hardest part of the whole project especially the bit that only counts attempts before the first success
class AnalyticsDashboard {
  constructor(el) {
    this.container = el;
    this.chart = null;
  }

  async load(classId) {
    this.classId = classId;
    try {
      var data = await api.get(`/api/analytics/${classId}`);
      this._render(data);
    } catch (err) {
      this.container.innerHTML = `<p class="form-message error">${err.message}</p>`;
    }
  }

  // builds the whole analytics page from the data the server sends back stat cards at the top, chart in the middle, student table at the bottom
  _render(data) {
    var s = data.summary;

    this.container.innerHTML = `
      <div class="analytics-content">
        <!-- Stat Cards -->
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-value">${s.totalStudents}</div>
            <div class="stat-label">Students</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${s.avgMissDistance ? s.avgMissDistance.toFixed(1) : '0'}m</div>
            <div class="stat-label">Avg Miss</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${s.completionRate}%</div>
            <div class="stat-label">Completion</div>
          </div>
          <div class="stat-card ${s.flaggedCount > 0 ? 'flagged' : ''}">
            <div class="stat-value">${s.flaggedCount}</div>
            <div class="stat-label">Flagged</div>
          </div>
        </div>

        <!-- Chart -->
        <div class="chart-section">
          <h3>Average Miss Distance per Assignment</h3>
          <div class="chart-wrap"><canvas id="analyticsChart"></canvas></div>
        </div>

        <!-- Student Table -->
        <div class="table-section">
          <h3>Student Performance</h3>
          <table class="portal-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Attempts</th>
                <th>Successes</th>
                <th>Avg Miss</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this._renderStudentRows(data.perStudent, data.flagged)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Build chart
    this._buildChart(data.perAssignment);
  }

  _renderStudentRows(students, flagged) {
    if (!students || students.length === 0) {
      return '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No students enrolled</td></tr>';
    }

    var flaggedIds = new Set((flagged || []).map(f => f.user_id));

    return students.map(s => {
      var isFlagged = flaggedIds.has(s.user_id);
      var avg = s.avgMissDistance ? Number(s.avgMissDistance).toFixed(1) + 'm' : '—';
      var completed = s.completedAssignments || 0;

      let status;
      if (completed > 0 && !isFlagged) {
        status = `<span class="complete-badge">Completed (${completed})</span>`;
      } else if (isFlagged) {
        status = '<span class="flag-badge">Needs Help</span>';
      } else if (s.attemptCount > 0) {
        status = '<span class="pending-badge">In Progress</span>';
      } else {
        status = '<span class="pending-badge">No Attempts</span>';
      }

      return `<tr class="${isFlagged ? 'flagged-row' : ''}" onclick="analyticsDashboard._viewStudent(${s.user_id})">
        <td>${s.username}</td>
        <td>${s.attemptCount || 0}</td>
        <td>${completed}</td>
        <td>${avg}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');
  }

  _buildChart(perAssignment) {
    if (!perAssignment || perAssignment.length === 0) return;

    var ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: perAssignment.map(a => a.name),
        datasets: [{
          label: 'Avg Miss Distance (m)',
          data: perAssignment.map(a => a.avgMissDistance || 0),
          backgroundColor: 'rgba(233, 69, 96, 0.6)',
          borderColor: '#e94560',
          borderWidth: 1
        }, {
          label: 'Attempt Count',
          data: perAssignment.map(a => a.attemptCount || 0),
          backgroundColor: 'rgba(52, 152, 219, 0.4)',
          borderColor: '#3498db',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8888aa' } }
        },
        scales: {
          x: { ticks: { color: '#8888aa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // opens the slide-out panel with this students individual attempts and classId is passed so it only shows attempts for the current class
  async _viewStudent(userId) {
    try {
      var data = await api.get(`/api/analytics/student/${userId}?classId=${this.classId}`);
      this._showStudent(data);
    } catch (err) {
      console.error('Failed to load student detail:', err);
    }
  }

  _showStudent(data) {
    var panel = document.getElementById('studentDetailPanel');
    if (!panel) return;

    var s = data.stats;
    var rate = s.totalAttempts > 0 ? Math.round(s.successes / s.totalAttempts * 100) : 0;

    panel.innerHTML = `
      <div class="detail-header">
        <h3>${data.student.username}</h3>
        <button class="btn-aim" onclick="document.getElementById('studentDetailPanel').classList.add('hidden')">Close</button>
      </div>
      <div class="detail-stats">
        <span>Attempts: <strong>${s.totalAttempts}</strong></span>
        <span>Success rate: <strong>${rate}%</strong></span>
        <span>Best miss: <strong>${s.bestMissDistance ? Number(s.bestMissDistance).toFixed(1) + 'm' : '—'}</strong></span>
      </div>
      <table class="portal-table">
        <thead><tr><th>Assignment</th><th>Angle</th><th>Velocity</th><th>Miss</th><th>Result</th><th>Date</th></tr></thead>
        <tbody>
          ${data.attempts.map(a => `<tr>
            <td>${a.assignmentName}</td>
            <td>${a.launch_angle}°</td>
            <td>${a.initial_velocity} m/s</td>
            <td>${a.miss_distance ? Number(a.miss_distance).toFixed(1) + 'm' : '—'}</td>
            <td>${a.is_success ? '<span class="ok-badge">Hit</span>' : '<span class="flag-badge">Miss</span>'}</td>
            <td>${a.attempted_at || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
    panel.classList.remove('hidden');
  }
}
