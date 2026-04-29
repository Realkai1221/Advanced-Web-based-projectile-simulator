// fetches the leaderboard from the server and renders it as a table
class Leaderboard {
  constructor(el) {
    this.container = el;
  }

  async show() {
    this.container.classList.remove('hidden');

    try {
      var data = await api.get('/api/leaderboard');
      this._render(data);
    } catch (err) {
      this.container.innerHTML = '<p class="leaderboard-empty">No leaderboard data yet.</p>';
    }
  }

  _render(data) {
    var html = '<h3 class="leaderboard-title">Leaderboard</h3>';
    html += '<table class="leaderboard-table"><thead><tr>';
    html += '<th>#</th><th>Player</th><th>Wins</th><th>Shots</th><th>Avg Miss</th><th>Fastest</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var avgMiss = typeof row.avgAccuracy === 'number' ? row.avgAccuracy.toFixed(1) + 'm' : '—';
      var fastest = row.fastestTime ? (row.fastestTime / 1000).toFixed(1) + 's' : '—';
      var rowClass = (i === 0) ? ' class="rank-first"' : '';

      html += '<tr' + rowClass + '>';
      html += '<td>' + (i + 1) + '</td>';
      html += '<td>' + (row.username || 'Player') + '</td>';
      html += '<td>' + (row.wins || 0) + '</td>';
      html += '<td>' + (row.totalShots || 0) + '</td>';
      html += '<td>' + avgMiss + '</td>';
      html += '<td>' + fastest + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table>';
    this.container.innerHTML = html;
  }

  hide() {
    this.container.classList.add('hidden');
  }
}
