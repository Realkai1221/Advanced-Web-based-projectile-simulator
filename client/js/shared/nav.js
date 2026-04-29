const nav = (() => {

  function init(activePage) {
    if (!api.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }

    var role = api.getRole();
    var session = JSON.parse(sessionStorage.getItem('session') || '{}');
    var username = session.username || 'User';

    var links = '';
    links += '<a href="lab.html" class="nav-link ' + (activePage === 'lab' ? 'active' : '') + '">Lab Mode</a>';
    links += '<a href="game.html" class="nav-link ' + (activePage === 'game' ? 'active' : '') + '">Mini-Game</a>';

    if (role === 'teacher') {
      links += '<a href="portal.html" class="nav-link ' + (activePage === 'portal' ? 'active' : '') + '">Teacher Portal</a>';
    }

    var html = '<nav class="site-nav">';
    html += '<a href="index.html" class="nav-brand">Projectile Sim</a>';
    html += '<div class="nav-links">' + links + '</div>';
    html += '<span class="nav-spacer"></span>';
    html += '<span class="nav-user">' + username + '</span>';
    html += '<button class="nav-logout" onclick="nav.logout()">Logout</button>';
    html += '</nav>';

    document.body.insertAdjacentHTML('afterbegin', html);
  }

  async function logout() {
    try { await api.post('/api/auth/logout', {}); } catch (e) {}
    api.clearSession();
    window.location.href = 'index.html';
  }

  return { init, logout };
})();
